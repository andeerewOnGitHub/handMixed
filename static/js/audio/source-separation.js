// static/js/audio/source-separation.js - Audio Source Separation System

console.log('🎚️ Audio Source Separation System Loading...');

/**
 * AudioSourceSeparator - Web Audio API based frequency separation
 * 
 * This is a basic implementation using frequency filtering.
 * For production use, you'd want to integrate with:
 * - Spleeter (Python-based, requires server)
 * - OpenUnmix (PyTorch-based)
 * - ONNX.js models for client-side ML separation
 */
class AudioSourceSeparator {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.separatedChannels = {};
        this.isProcessing = false;
        
        // Frequency ranges for basic separation
        this.frequencyRanges = {
            bass: { low: 20, high: 250 },      // Bass/Kick: 20-250 Hz
            drums: { low: 200, high: 5000 },   // Drums: 200-5000 Hz (overlaps with bass)
            synth: { low: 800, high: 20000 }   // Synth/Melody: 800-20000 Hz
        };
        
        console.log('🎛️ Audio Source Separator initialized');
    }

    /**
     * Separate audio into 3 channels using frequency filtering
     * @param {AudioBuffer} audioBuffer - The source audio buffer
     * @returns {Object} - Object containing separated audio buffers
     */
    async separateAudio(audioBuffer) {
        try {
            console.log('🔄 Starting audio separation...');
            this.isProcessing = true;
            
            // Create separate buffers for each channel
            const separatedBuffers = {
                bass: this.createFilteredBuffer(audioBuffer, 'bass'),
                drums: this.createFilteredBuffer(audioBuffer, 'drums'),
                synth: this.createFilteredBuffer(audioBuffer, 'synth')
            };
            
            // For now, we'll use frequency-based separation
            // In a real implementation, you'd use ML models here
            const processedBuffers = await this.processFrequencyBands(audioBuffer, separatedBuffers);
            
            console.log('✅ Audio separation completed');
            this.isProcessing = false;
            
            return processedBuffers;
            
        } catch (error) {
            console.error('❌ Audio separation failed:', error);
            this.isProcessing = false;
            
            // Return original audio for all channels if separation fails
            return this.createFallbackChannels(audioBuffer);
        }
    }

    /**
     * Create filtered buffer for a specific frequency range
     */
    createFilteredBuffer(sourceBuffer, channelType) {
        const filteredBuffer = this.audioContext.createBuffer(
            sourceBuffer.numberOfChannels,
            sourceBuffer.length,
            sourceBuffer.sampleRate
        );
        
        // Copy original audio data
        for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel++) {
            const sourceData = sourceBuffer.getChannelData(channel);
            const filteredData = filteredBuffer.getChannelData(channel);
            filteredData.set(sourceData);
        }
        
        return filteredBuffer;
    }

    /**
     * Process frequency bands using Web Audio API filters
     */
    async processFrequencyBands(sourceBuffer, separatedBuffers) {
        try {
            const processedBuffers = {};
            
            // Process each channel type
            for (const [channelType, buffer] of Object.entries(separatedBuffers)) {
                processedBuffers[channelType] = await this.applyFrequencyFilter(
                    buffer, 
                    this.frequencyRanges[channelType],
                    channelType
                );
            }
            
            return processedBuffers;
            
        } catch (error) {
            console.error('❌ Frequency band processing failed:', error);
            return separatedBuffers; // Return unprocessed buffers
        }
    }

    /**
     * Apply frequency filtering to isolate specific frequency ranges
     */
    async applyFrequencyFilter(audioBuffer, frequencyRange, channelType) {
        try {
            // Create offline audio context for processing
            const offlineContext = new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                audioBuffer.length,
                audioBuffer.sampleRate
            );
            
            // Create source
            const source = offlineContext.createBufferSource();
            source.buffer = audioBuffer;
            
            // Create filter chain based on channel type
            const filterChain = this.createFilterChain(offlineContext, frequencyRange, channelType);
            
            // Connect source through filter chain to destination
            source.connect(filterChain.input);
            filterChain.output.connect(offlineContext.destination);
            
            // Start processing
            source.start(0);
            
            // Render the filtered audio
            const filteredBuffer = await offlineContext.startRendering();
            
            console.log(`✅ ${channelType} channel filtered (${frequencyRange.low}-${frequencyRange.high}Hz)`);
            return filteredBuffer;
            
        } catch (error) {
            console.error(`❌ Filter processing failed for ${channelType}:`, error);
            return audioBuffer; // Return original if filtering fails
        }
    }

    /**
     * Create appropriate filter chain for each channel type
     */
    createFilterChain(context, frequencyRange, channelType) {
        let input, output;
        
        switch (channelType) {
            case 'bass':
                // Low-pass filter for bass/kick
                const lowPass = context.createBiquadFilter();
                lowPass.type = 'lowpass';
                lowPass.frequency.value = frequencyRange.high;
                lowPass.Q.value = 0.7;
                
                // High-pass to remove subsonic frequencies
                const highPass = context.createBiquadFilter();
                highPass.type = 'highpass';
                highPass.frequency.value = frequencyRange.low;
                highPass.Q.value = 0.7;
                
                // Gain to emphasize bass
                const bassGain = context.createGain();
                bassGain.gain.value = 1.5;
                
                // Connect filters
                highPass.connect(lowPass);
                lowPass.connect(bassGain);
                
                input = highPass;
                output = bassGain;
                break;
                
            case 'drums':
                // Band-pass filter for drums
                const drumHighPass = context.createBiquadFilter();
                drumHighPass.type = 'highpass';
                drumHighPass.frequency.value = frequencyRange.low;
                drumHighPass.Q.value = 0.7;
                
                const drumLowPass = context.createBiquadFilter();
                drumLowPass.type = 'lowpass';
                drumLowPass.frequency.value = frequencyRange.high;
                drumLowPass.Q.value = 0.7;
                
                // Compress for punch
                const compressor = context.createDynamicsCompressor();
                compressor.threshold.value = -24;
                compressor.knee.value = 30;
                compressor.ratio.value = 12;
                compressor.attack.value = 0.003;
                compressor.release.value = 0.25;
                
                // Connect
                drumHighPass.connect(drumLowPass);
                drumLowPass.connect(compressor);
                
                input = drumHighPass;
                output = compressor;
                break;
                
            case 'synth':
                // High-pass for synth/melody
                const synthHighPass = context.createBiquadFilter();
                synthHighPass.type = 'highpass';
                synthHighPass.frequency.value = frequencyRange.low;
                synthHighPass.Q.value = 0.7;
                
                // Gentle high-frequency roll-off
                const synthLowPass = context.createBiquadFilter();
                synthLowPass.type = 'lowpass';
                synthLowPass.frequency.value = frequencyRange.high;
                synthLowPass.Q.value = 0.5;
                
                // Connect
                synthHighPass.connect(synthLowPass);
                
                input = synthHighPass;
                output = synthLowPass;
                break;
                
            default:
                // Pass-through
                const passThrough = context.createGain();
                passThrough.gain.value = 1.0;
                input = passThrough;
                output = passThrough;
        }
        
        return { input, output };
    }

    /**
     * Create fallback channels (just copy original audio)
     */
    createFallbackChannels(audioBuffer) {
        console.log('⚠️ Using fallback channels (no separation)');
        
        return {
            bass: audioBuffer,
            drums: audioBuffer,
            synth: audioBuffer
        };
    }

    /**
     * Advanced ML-based separation (placeholder for future implementation)
     */
    async separateWithML(audioBuffer) {
        console.log('🤖 ML-based separation not yet implemented');
        
        // TODO: Implement with ONNX.js or TensorFlow.js
        // 1. Load pre-trained separation model
        // 2. Preprocess audio (convert to spectrogram)
        // 3. Run inference
        // 4. Post-process results back to audio
        
        // For now, return frequency-based separation
        return this.separateAudio(audioBuffer);
    }

    /**
     * Get separation progress (for UI feedback)
     */
    getProgress() {
        return {
            isProcessing: this.isProcessing,
            method: 'frequency-based', // or 'ml-based' in future
            channels: ['bass', 'drums', 'synth']
        };
    }
}

/**
 * Multi-Channel Audio Player
 * Manages playback of separated audio channels
 */
class MultiChannelPlayer {
    constructor(audioContext, separatedBuffers) {
        this.audioContext = audioContext;
        this.separatedBuffers = separatedBuffers;
        this.sources = {};
        this.gains = {};
        this.isPlaying = false;
        this.startTime = 0;
        this.pauseTime = 0;
        
        this.initializeChannels();
    }

    initializeChannels() {
        const channels = ['bass', 'drums', 'synth'];
        
        channels.forEach(channel => {
            // Create gain node for each channel
            this.gains[channel] = this.audioContext.createGain();
            this.gains[channel].gain.value = 1.0;
            
            // Connect to master output (or further processing)
            this.gains[channel].connect(this.audioContext.destination);
        });
        
        console.log('🎚️ Multi-channel player initialized');
    }

    async play(startTime = 0) {
        if (this.isPlaying) {
            this.stop();
        }
        
        try {
            this.startTime = this.audioContext.currentTime - startTime;
            this.isPlaying = true;
            
            // Create and start sources for each channel
            Object.keys(this.separatedBuffers).forEach(channel => {
                const source = this.audioContext.createBufferSource();
                source.buffer = this.separatedBuffers[channel];
                source.connect(this.gains[channel]);
                source.start(0, startTime);
                
                this.sources[channel] = source;
            });
            
            console.log('▶️ Multi-channel playback started');
            
        } catch (error) {
            console.error('❌ Multi-channel playback failed:', error);
            this.isPlaying = false;
        }
    }

    pause() {
        if (!this.isPlaying) return;
        
        this.pauseTime = this.audioContext.currentTime - this.startTime;
        this.stop();
        
        console.log('⏸️ Multi-channel playback paused');
    }

    resume() {
        if (this.isPlaying) return;
        
        this.play(this.pauseTime);
        
        console.log('▶️ Multi-channel playback resumed');
    }

    stop() {
        if (!this.isPlaying) return;
        
        Object.values(this.sources).forEach(source => {
            try {
                source.stop();
                source.disconnect();
            } catch (error) {
                // Source might already be stopped
            }
        });
        
        this.sources = {};
        this.isPlaying = false;
        this.pauseTime = 0;
        
        console.log('⏹️ Multi-channel playback stopped');
    }

    setChannelVolume(channel, volume) {
        if (this.gains[channel]) {
            this.gains[channel].gain.value = Math.max(0, Math.min(1, volume));
            console.log(`🔊 ${channel} volume: ${Math.round(volume * 100)}%`);
        }
    }

    setChannelEnabled(channel, enabled) {
        if (this.gains[channel]) {
            this.gains[channel].gain.value = enabled ? 1.0 : 0.0;
            console.log(`🎚️ ${channel} ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    getCurrentTime() {
        if (!this.isPlaying) return this.pauseTime;
        return this.audioContext.currentTime - this.startTime;
    }

    getDuration() {
        if (!this.separatedBuffers.bass) return 0;
        return this.separatedBuffers.bass.duration;
    }
}

// Export classes for use in other modules
window.AudioSourceSeparator = AudioSourceSeparator;
window.MultiChannelPlayer = MultiChannelPlayer;

// Utility functions
window.createMultiChannelPlayer = function(audioContext, separatedBuffers) {
    return new MultiChannelPlayer(audioContext, separatedBuffers);
};

window.separateAudioSource = async function(audioBuffer, audioContext) {
    const separator = new AudioSourceSeparator(audioContext);
    return await separator.separateAudio(audioBuffer);
};

console.log('✅ Audio Source Separation System Ready');
console.log('📝 Note: Currently using frequency-based separation');
console.log('🚀 Future: ML-based separation with ONNX.js/TensorFlow.js');