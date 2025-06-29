// static/js/utils/bpm-detector.js - BPM Detection Algorithm

class BPMDetector {
    constructor() {
        this.sampleRate = 44100;
        this.windowSize = 1024;
        this.hopSize = 512;
        this.minBPM = 60;
        this.maxBPM = 200;
    }

    /**
     * Detect BPM from an audio buffer
     * @param {AudioBuffer} audioBuffer - The audio buffer to analyze
     * @returns {Promise<number>} - The detected BPM
     */
    async detectBPM(audioBuffer) {
        try {
            console.log('🎵 Starting BPM detection...');
            
            // Get the first channel (mono analysis)
            const audioData = audioBuffer.getChannelData(0);
            const sampleRate = audioBuffer.sampleRate;
            
            // Downsample for faster processing (optional)
            const downsampledData = this.downsample(audioData, sampleRate, 22050);
            const newSampleRate = 22050;
            
            // Apply high-pass filter to emphasize beats
            const filteredData = this.highPassFilter(downsampledData, newSampleRate);
            
            // Calculate onset detection function
            const onsetStrength = this.calculateOnsetStrength(filteredData, newSampleRate);
            
            // Find peaks in onset strength
            const peaks = this.findPeaks(onsetStrength);
            
            // Calculate BPM from peak intervals
            const bpm = this.calculateBPMFromPeaks(peaks, newSampleRate);
            
            console.log(`✅ BPM detected: ${bpm}`);
            return Math.round(bpm);
            
        } catch (error) {
            console.error('❌ BPM detection failed:', error);
            return 120; // Default BPM
        }
    }

    /**
     * Downsample audio data for faster processing
     */
    downsample(audioData, originalSampleRate, targetSampleRate) {
        if (originalSampleRate === targetSampleRate) {
            return audioData;
        }
        
        const ratio = originalSampleRate / targetSampleRate;
        const newLength = Math.floor(audioData.length / ratio);
        const result = new Float32Array(newLength);
        
        for (let i = 0; i < newLength; i++) {
            const sourceIndex = Math.floor(i * ratio);
            result[i] = audioData[sourceIndex];
        }
        
        return result;
    }

    /**
     * Apply simple high-pass filter to emphasize beat frequencies
     */
    highPassFilter(audioData, sampleRate) {
        const filtered = new Float32Array(audioData.length);
        const RC = 1.0 / (2 * Math.PI * 100); // 100Hz cutoff
        const dt = 1.0 / sampleRate;
        const alpha = dt / (RC + dt);
        
        filtered[0] = audioData[0];
        
        for (let i = 1; i < audioData.length; i++) {
            filtered[i] = alpha * (filtered[i-1] + audioData[i] - audioData[i-1]);
        }
        
        return filtered;
    }

    /**
     * Calculate onset detection function using spectral flux
     */
    calculateOnsetStrength(audioData, sampleRate) {
        const windowSize = 1024;
        const hopSize = 512;
        const numFrames = Math.floor((audioData.length - windowSize) / hopSize) + 1;
        const onsetStrength = new Float32Array(numFrames);
        
        // Hanning window
        const window = new Float32Array(windowSize);
        for (let i = 0; i < windowSize; i++) {
            window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (windowSize - 1)));
        }
        
        let prevMagnitudes = new Float32Array(windowSize / 2);
        
        for (let frame = 0; frame < numFrames; frame++) {
            const start = frame * hopSize;
            const frameData = new Float32Array(windowSize);
            
            // Extract frame and apply window
            for (let i = 0; i < windowSize; i++) {
                const index = start + i;
                frameData[i] = index < audioData.length ? audioData[index] * window[i] : 0;
            }
            
            // Calculate FFT magnitudes (simplified)
            const magnitudes = this.calculateMagnitudes(frameData);
            
            // Calculate spectral flux (positive changes in magnitude)
            let flux = 0;
            for (let i = 0; i < magnitudes.length; i++) {
                const diff = magnitudes[i] - prevMagnitudes[i];
                if (diff > 0) {
                    flux += diff;
                }
            }
            
            onsetStrength[frame] = flux;
            prevMagnitudes = magnitudes;
        }
        
        return onsetStrength;
    }

    /**
     * Simplified magnitude calculation (using time-domain energy as approximation)
     */
    calculateMagnitudes(frameData) {
        const binCount = frameData.length / 2;
        const magnitudes = new Float32Array(binCount);
        
        // Use energy in frequency bands as approximation
        const bandsPerBin = frameData.length / binCount;
        
        for (let i = 0; i < binCount; i++) {
            let energy = 0;
            const start = Math.floor(i * bandsPerBin);
            const end = Math.floor((i + 1) * bandsPerBin);
            
            for (let j = start; j < end && j < frameData.length; j++) {
                energy += frameData[j] * frameData[j];
            }
            
            magnitudes[i] = Math.sqrt(energy / (end - start));
        }
        
        return magnitudes;
    }

    /**
     * Find peaks in the onset strength function
     */
    findPeaks(onsetStrength) {
        const peaks = [];
        const threshold = this.calculateAdaptiveThreshold(onsetStrength);
        const minDistance = 5; // Minimum distance between peaks
        
        for (let i = minDistance; i < onsetStrength.length - minDistance; i++) {
            if (onsetStrength[i] > threshold) {
                let isPeak = true;
                
                // Check if it's a local maximum
                for (let j = i - minDistance; j <= i + minDistance; j++) {
                    if (j !== i && onsetStrength[j] >= onsetStrength[i]) {
                        isPeak = false;
                        break;
                    }
                }
                
                if (isPeak) {
                    peaks.push(i);
                }
            }
        }
        
        return peaks;
    }

    /**
     * Calculate adaptive threshold for peak detection
     */
    calculateAdaptiveThreshold(onsetStrength) {
        // Calculate mean and standard deviation
        let sum = 0;
        for (let i = 0; i < onsetStrength.length; i++) {
            sum += onsetStrength[i];
        }
        const mean = sum / onsetStrength.length;
        
        let variance = 0;
        for (let i = 0; i < onsetStrength.length; i++) {
            variance += Math.pow(onsetStrength[i] - mean, 2);
        }
        const stdDev = Math.sqrt(variance / onsetStrength.length);
        
        // Threshold is mean + 1.5 * standard deviation
        return mean + 1.5 * stdDev;
    }

    /**
     * Calculate BPM from detected peaks
     */
    calculateBPMFromPeaks(peaks, sampleRate) {
        if (peaks.length < 2) {
            return 120; // Default BPM
        }
        
        const hopSize = 512;
        const intervals = [];
        
        // Calculate intervals between consecutive peaks
        for (let i = 1; i < peaks.length; i++) {
            const interval = (peaks[i] - peaks[i-1]) * hopSize / sampleRate;
            if (interval > 0.1 && interval < 2.0) { // Filter reasonable intervals
                intervals.push(interval);
            }
        }
        
        if (intervals.length === 0) {
            return 120;
        }
        
        // Calculate BPM candidates
        const bpmCandidates = intervals.map(interval => 60 / interval);
        
        // Find the most common BPM in the valid range
        const validBPMs = bpmCandidates.filter(bpm => bpm >= this.minBPM && bpm <= this.maxBPM);
        
        if (validBPMs.length === 0) {
            return 120;
        }
        
        // Also check for half/double tempo
        const allCandidates = [];
        validBPMs.forEach(bpm => {
            allCandidates.push(bpm);
            if (bpm * 2 <= this.maxBPM) allCandidates.push(bpm * 2);
            if (bpm / 2 >= this.minBPM) allCandidates.push(bpm / 2);
        });
        
        // Find mode (most frequent BPM)
        return this.findMode(allCandidates);
    }

    /**
     * Find the mode (most frequent value) in an array
     */
    findMode(arr) {
        // Group BPMs into bins (tolerance of ±2 BPM)
        const bins = {};
        
        arr.forEach(bpm => {
            const bin = Math.round(bpm / 2) * 2; // Round to nearest 2
            if (!bins[bin]) {
                bins[bin] = [];
            }
            bins[bin].push(bpm);
        });
        
        // Find the bin with the most values
        let maxCount = 0;
        let modeBPM = 120;
        
        for (const [bin, values] of Object.entries(bins)) {
            if (values.length > maxCount) {
                maxCount = values.length;
                // Calculate average of values in this bin
                const sum = values.reduce((a, b) => a + b, 0);
                modeBPM = sum / values.length;
            }
        }
        
        return modeBPM;
    }

    /**
     * Quick BPM estimation for real-time feedback
     */
    async quickBPMEstimate(audioBuffer) {
        try {
            // Use only first 30 seconds for quick estimation
            const maxSamples = audioBuffer.sampleRate * 30;
            const audioData = audioBuffer.getChannelData(0);
            const limitedData = audioData.slice(0, Math.min(maxSamples, audioData.length));
            
            // Create a temporary buffer
            const tempBuffer = audioBuffer.constructor ? 
                new (audioBuffer.constructor)(1, limitedData.length, audioBuffer.sampleRate) :
                new AudioBuffer({
                    numberOfChannels: 1,
                    length: limitedData.length,
                    sampleRate: audioBuffer.sampleRate
                });
            
            tempBuffer.getChannelData(0).set(limitedData);
            
            return await this.detectBPM(tempBuffer);
        } catch (error) {
            console.error('❌ Quick BPM estimation failed:', error);
            return 120;
        }
    }
}

// Export for use in other modules
window.BPMDetector = BPMDetector;