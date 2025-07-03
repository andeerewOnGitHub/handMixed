// static/js/audio/wavesurfer-setup.js - Multi-Channel Waveform Visualization

console.log('🌊 Multi-Channel Wavesurfer Setup Loading...');

// Initialize multi-channel Wavesurfer instances for both decks
function initializeWavesurfers() {
    try {
        // Deck A - Multi-Channel Wavesurfers
        deckState.A.wavesurfers = {
            bass: WaveSurfer.create({
                container: '#deckAWaveformBass',
                waveColor: '#ff6b6b',      // Red for bass
                progressColor: '#1ed760',
                cursorColor: '#fff',
                barWidth: 2,
                barRadius: 1,
                height: 40,
                normalize: true,
                backend: 'WebAudio',
                responsive: true,
                interact: false
            }),
            drums: WaveSurfer.create({
                container: '#deckAWaveformDrums',
                waveColor: '#f39c12',      // Orange for drums
                progressColor: '#1ed760',
                cursorColor: '#fff',
                barWidth: 2,
                barRadius: 1,
                height: 40,
                normalize: true,
                backend: 'WebAudio',
                responsive: true,
                interact: false
            }),
            synth: WaveSurfer.create({
                container: '#deckAWaveformSynth',
                waveColor: '#00d4ff',      // Blue for synth
                progressColor: '#1ed760',
                cursorColor: '#fff',
                barWidth: 2,
                barRadius: 1,
                height: 40,
                normalize: true,
                backend: 'WebAudio',
                responsive: true,
                interact: false
            })
        };

        // Deck B - Multi-Channel Wavesurfers
        deckState.B.wavesurfers = {
            bass: WaveSurfer.create({
                container: '#deckBWaveformBass',
                waveColor: '#ff6b6b',      // Red for bass
                progressColor: '#1ed760',
                cursorColor: '#fff',
                barWidth: 2,
                barRadius: 1,
                height: 40,
                normalize: true,
                backend: 'WebAudio',
                responsive: true,
                interact: false
            }),
            drums: WaveSurfer.create({
                container: '#deckBWaveformDrums',
                waveColor: '#f39c12',      // Orange for drums
                progressColor: '#1ed760',
                cursorColor: '#fff',
                barWidth: 2,
                barRadius: 1,
                height: 40,
                normalize: true,
                backend: 'WebAudio',
                responsive: true,
                interact: false
            }),
            synth: WaveSurfer.create({
                container: '#deckBWaveformSynth',
                waveColor: '#00d4ff',      // Blue for synth
                progressColor: '#1ed760',
                cursorColor: '#fff',
                barWidth: 2,
                barRadius: 1,
                height: 40,
                normalize: true,
                backend: 'WebAudio',
                responsive: true,
                interact: false
            })
        };

        // Set up event listeners for synchronized playback
        setupWaveformSynchronization();

        console.log('🌊 Multi-channel Wavesurfer instances initialized');
        
    } catch (error) {
        console.error('❌ Wavesurfer initialization failed:', error);
        
        // Fallback to single waveform if multi-channel fails
        initializeFallbackWavesurfers();
    }
}

// Set up waveform synchronization across channels
function setupWaveformSynchronization() {
    ['A', 'B'].forEach(deckLetter => {
        const deck = deckState[deckLetter];
        
        if (!deck.wavesurfers) return;
        
        // Synchronize playback across all channels
        const channels = Object.keys(deck.wavesurfers);
        
        channels.forEach(channel => {
            const wavesurfer = deck.wavesurfers[channel];
            
            // When one channel plays, play all others
            wavesurfer.on('play', () => {
                channels.forEach(otherChannel => {
                    if (otherChannel !== channel) {
                        const otherWavesurfer = deck.wavesurfers[otherChannel];
                        if (otherWavesurfer && !otherWavesurfer.isPlaying()) {
                            otherWavesurfer.play();
                        }
                    }
                });
            });
            
            // When one channel pauses, pause all others
            wavesurfer.on('pause', () => {
                channels.forEach(otherChannel => {
                    if (otherChannel !== channel) {
                        const otherWavesurfer = deck.wavesurfers[otherChannel];
                        if (otherWavesurfer && otherWavesurfer.isPlaying()) {
                            otherWavesurfer.pause();
                        }
                    }
                });
            });
            
            // Synchronize seeking
            wavesurfer.on('seek', (progress) => {
                channels.forEach(otherChannel => {
                    if (otherChannel !== channel) {
                        const otherWavesurfer = deck.wavesurfers[otherChannel];
                        if (otherWavesurfer) {
                            otherWavesurfer.seekTo(progress);
                        }
                    }
                });
            });
        });
    });
}

// Load separated audio into multi-channel waveforms
async function loadMultiChannelWaveforms(deckLetter, separatedBuffers) {
    try {
        const deck = deckState[deckLetter];
        
        if (!deck.wavesurfers || !separatedBuffers) {
            console.warn(`⚠️ Multi-channel wavesurfers not available for Deck ${deckLetter}`);
            return;
        }
        
        console.log(`🌊 Loading multi-channel waveforms for Deck ${deckLetter}`);
        
        // Load each channel
        const loadPromises = Object.keys(separatedBuffers).map(async (channel) => {
            const wavesurfer = deck.wavesurfers[channel];
            const buffer = separatedBuffers[channel];
            
            if (!wavesurfer || !buffer) {
                console.warn(`⚠️ Missing wavesurfer or buffer for ${channel}`);
                return;
            }
            
            try {
                // Convert AudioBuffer to blob for wavesurfer
                const audioBlob = await audioBufferToBlob(buffer);
                const url = URL.createObjectURL(audioBlob);
                
                await wavesurfer.load(url);
                
                console.log(`✅ Loaded ${channel} waveform for Deck ${deckLetter}`);
                
                // Clean up URL after loading
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                
            } catch (channelError) {
                console.error(`❌ Failed to load ${channel} waveform:`, channelError);
            }
        });
        
        // Wait for all channels to load
        await Promise.all(loadPromises);
        
        console.log(`✅ All waveforms loaded for Deck ${deckLetter}`);
        
    } catch (error) {
        console.error(`❌ Multi-channel waveform loading failed for Deck ${deckLetter}:`, error);
    }
}

// Convert AudioBuffer to Blob for wavesurfer
async function audioBufferToBlob(audioBuffer) {
    return new Promise((resolve, reject) => {
        try {
            // Create offline context to render audio buffer
            const offlineContext = new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                audioBuffer.length,
                audioBuffer.sampleRate
            );
            
            const source = offlineContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineContext.destination);
            source.start(0);
            
            offlineContext.startRendering().then(renderedBuffer => {
                // Convert to WAV blob
                const wavBlob = audioBufferToWav(renderedBuffer);
                resolve(wavBlob);
            }).catch(reject);
            
        } catch (error) {
            reject(error);
        }
    });
}

// Convert AudioBuffer to WAV Blob
function audioBufferToWav(buffer) {
    const length = buffer.length;
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * channels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * channels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * channels * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < channels; channel++) {
            const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Play multi-channel waveforms
function playMultiChannelWaveforms(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (!deck.wavesurfers) return;
    
    Object.values(deck.wavesurfers).forEach(wavesurfer => {
        if (wavesurfer && !wavesurfer.isPlaying()) {
            wavesurfer.play();
        }
    });
    
    console.log(`▶️ Multi-channel waveforms playing for Deck ${deckLetter}`);
}

// Pause multi-channel waveforms
function pauseMultiChannelWaveforms(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (!deck.wavesurfers) return;
    
    Object.values(deck.wavesurfers).forEach(wavesurfer => {
        if (wavesurfer && wavesurfer.isPlaying()) {
            wavesurfer.pause();
        }
    });
    
    console.log(`⏸️ Multi-channel waveforms paused for Deck ${deckLetter}`);
}

// Stop multi-channel waveforms
function stopMultiChannelWaveforms(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (!deck.wavesurfers) return;
    
    Object.values(deck.wavesurfers).forEach(wavesurfer => {
        if (wavesurfer) {
            wavesurfer.stop();
        }
    });
    
    console.log(`⏹️ Multi-channel waveforms stopped for Deck ${deckLetter}`);
}

// Update channel waveform visibility based on channel state
function updateChannelWaveformVisibility(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (!deck.wavesurfers || !deck.audioChannels) return;
    
    Object.keys(deck.wavesurfers).forEach(channel => {
        const wavesurfer = deck.wavesurfers[channel];
        const channelState = deck.audioChannels[channel];
        
        if (wavesurfer && channelState) {
            const container = wavesurfer.container;
            const opacity = channelState.enabled ? 1 : 0.3;
            
            if (container) {
                container.style.opacity = opacity;
                container.style.filter = channelState.enabled ? 'none' : 'grayscale(100%)';
            }
        }
    });
}

// Fallback to single waveform if multi-channel fails
function initializeFallbackWavesurfers() {
    console.log('🌊 Initializing fallback single waveforms...');
    
    try {
        // Create single waveform for each deck (backwards compatibility)
        deckState.A.wavesurfer = WaveSurfer.create({
            container: '#deckAWaveformBass', // Use bass container as fallback
            waveColor: '#00d4ff',
            progressColor: '#1ed760',
            cursorColor: '#fff',
            barWidth: 2,
            barRadius: 1,
            height: 40,
            normalize: true,
            backend: 'WebAudio',
            responsive: true
        });

        deckState.B.wavesurfer = WaveSurfer.create({
            container: '#deckBWaveformBass', // Use bass container as fallback
            waveColor: '#f39c12',
            progressColor: '#1ed760',
            cursorColor: '#fff',
            barWidth: 2,
            barRadius: 1,
            height: 40,
            normalize: true,
            backend: 'WebAudio',
            responsive: true
        });

        // Hide other waveform containers
        document.querySelectorAll('#deckAWaveformDrums, #deckAWaveformSynth, #deckBWaveformDrums, #deckBWaveformSynth').forEach(container => {
            if (container) {
                container.style.display = 'none';
            }
        });

        console.log('✅ Fallback wavesurfers initialized');
        
    } catch (error) {
        console.error('❌ Fallback wavesurfer initialization failed:', error);
    }
}

// Export functions for use in other modules
window.loadMultiChannelWaveforms = loadMultiChannelWaveforms;
window.playMultiChannelWaveforms = playMultiChannelWaveforms;
window.pauseMultiChannelWaveforms = pauseMultiChannelWaveforms;
window.stopMultiChannelWaveforms = stopMultiChannelWaveforms;
window.updateChannelWaveformVisibility = updateChannelWaveformVisibility;

console.log('✅ Multi-Channel Wavesurfer Setup Complete');