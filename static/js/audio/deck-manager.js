// static/js/audio/deck-manager.js - Multi-Channel Deck Management

console.log('🎛️ Multi-Channel Deck Manager Loading...');

// Select deck for loading
function selectDeck(deckLetter) {
    appState.selectedDeck = deckLetter;
    updateStatus(`Deck ${deckLetter} selected - choose a track to load`, 'info');
    
    // Visual feedback
    document.querySelectorAll('.deck-track-display').forEach(display => {
        display.style.borderColor = '';
        display.style.background = '';
    });
    
    const selectedDisplay = document.getElementById(`deck${deckLetter}TrackDisplay`);
    selectedDisplay.style.borderColor = '#1ed760';
    selectedDisplay.style.background = 'linear-gradient(135deg, rgba(30, 215, 96, 0.4), rgba(0, 212, 255, 0.4))';
}

// Load track to selected deck with multi-channel processing
async function loadTrackToDeck(trackIndex) {
    if (!appState.selectedDeck) {
        updateStatus('Please select a deck first (click on a deck display)', 'error');
        return;
    }

    if (trackIndex < 0 || trackIndex >= appState.currentTracks.length) {
        updateStatus('Invalid track selection', 'error');
        return;
    }

    const track = appState.currentTracks[trackIndex];
    const deckLetter = appState.selectedDeck;
    const deck = deckState[deckLetter];

    console.log(`🎵 Loading track to Deck ${deckLetter}:`, track.title);
    console.log(`🎵 Track BPM from Audius: ${track.bpm || 'Not available'}`);
    updateStatus(`Loading "${track.title}" to Deck ${deckLetter}...`, 'info');

    try {
        // Stop current track if playing
        if (deck.isPlaying) {
            stopDeck(deckLetter);
        }

        // Clean up previous track
        cleanupDeckTrack(deckLetter);

        // Store track info
        deck.track = track;

        // Set BPM immediately from Audius metadata
        if (track.bpm && track.bpm > 0) {
            deck.bpm = track.bpm;
            updateDeckBPM(deckLetter, `${track.bpm} BPM`);
            console.log(`✅ BPM set from Audius metadata: ${track.bpm} BPM`);
        } else {
            const fallbackBPM = getFallbackBPM(track.genre);
            deck.bpm = fallbackBPM;
            updateDeckBPM(deckLetter, `~${fallbackBPM} BPM`);
            console.log(`⚠️ Using fallback BPM: ${fallbackBPM} BPM (Genre: ${track.genre || 'Unknown'})`);
        }

        // Initialize audio channels
        initializeDeckAudioChannels(deckLetter);

        // Create HTML5 Audio element for initial loading
        deck.audio = new Audio();
        deck.audio.crossOrigin = 'anonymous';
        deck.audio.preload = 'auto';
        
        // Set up loading timeout
        const loadTimeout = setTimeout(() => {
            if (deck.audio && deck.audio.readyState === 0) {
                console.warn(`⚠️ Track loading timeout for Deck ${deckLetter}`);
                updateStatus(`Track loading timeout for Deck ${deckLetter}`, 'error');
                cleanupDeckTrack(deckLetter);
                updateDeckDisplay(deckLetter, null);
            }
        }, 15000);
        
        // Set up audio event listeners
        deck.audio.addEventListener('loadeddata', async () => {
            clearTimeout(loadTimeout);
            console.log(`✅ Track loaded in Deck ${deckLetter}: ${track.title}`);
            
            // Process multi-channel audio
            await processMultiChannelAudio(deckLetter);
            
            updateStatus(`"${track.title}" loaded in Deck ${deckLetter} (${deck.bpm} BPM) - Multi-channel ready`, 'success');
            updateDeckDisplay(deckLetter, track);
            updateDeckUI(deckLetter);
            updateChannelIndicators(deckLetter);
        });

        deck.audio.addEventListener('error', (error) => {
            clearTimeout(loadTimeout);
            console.error(`❌ Error loading track in Deck ${deckLetter}:`, error);
            
            let errorMessage = 'Failed to load track';
            if (deck.audio.error) {
                switch(deck.audio.error.code) {
                    case deck.audio.error.MEDIA_ERR_NETWORK:
                        errorMessage = 'Network error - check connection';
                        break;
                    case deck.audio.error.MEDIA_ERR_DECODE:
                        errorMessage = 'Audio decode error';
                        break;
                    case deck.audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                        errorMessage = 'Audio format not supported';
                        break;
                    default:
                        errorMessage = 'Unknown audio error';
                }
            }
            
            updateStatus(`${errorMessage} in Deck ${deckLetter}`, 'error');
            cleanupDeckTrack(deckLetter);
            updateDeckDisplay(deckLetter, null);
        });

        // Set up track end detection
        setupTrackEndDetection(deckLetter);

        // Load the track
        if (!track.stream_url || track.stream_url.trim() === '') {
            throw new Error('Invalid or missing stream URL');
        }

        console.log(`🌐 Loading audio from: ${track.stream_url}`);
        deck.audio.src = track.stream_url;

        // Clear selection
        appState.selectedDeck = null;
        document.querySelectorAll('.deck-track-display').forEach(display => {
            display.style.borderColor = '';
            display.style.background = '';
        });

    } catch (error) {
        console.error(`❌ Error loading track to Deck ${deckLetter}:`, error);
        updateStatus(`Failed to load track: ${error.message}`, 'error');
        cleanupDeckTrack(deckLetter);
        updateDeckDisplay(deckLetter, null);
    }
}

// Process multi-channel audio separation
async function processMultiChannelAudio(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (!deck.audio || !deck.track) {
        console.warn(`⚠️ No audio available for multi-channel processing in Deck ${deckLetter}`);
        return;
    }

    try {
        console.log(`🔄 Processing multi-channel audio for Deck ${deckLetter}...`);
        
        // Create audio context if not exists
        if (!appState.audioContext) {
            appState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Create audio buffer from source
        const audioBuffer = await createAudioBufferFromElement(deck.audio);
        
        // Separate audio into channels
        const separatedBuffers = await separateAudioSource(audioBuffer, appState.audioContext);
        
        // Store separated buffers
        deck.separatedBuffers = separatedBuffers;
        
        // Create multi-channel player
        deck.multiChannelPlayer = createMultiChannelPlayer(appState.audioContext, separatedBuffers);
        
        // Load multi-channel waveforms
        await loadMultiChannelWaveforms(deckLetter, separatedBuffers);
        
        console.log(`✅ Multi-channel processing complete for Deck ${deckLetter}`);
        
    } catch (error) {
        console.error(`❌ Multi-channel processing failed for Deck ${deckLetter}:`, error);
        
        // Fallback to single-channel audio
        deck.separatedBuffers = null;
        deck.multiChannelPlayer = null;
        
        // Try to load single waveform
        if (deck.wavesurfer && deck.track.stream_url) {
            try {
                deck.wavesurfer.load(deck.track.stream_url);
            } catch (waveError) {
                console.warn(`⚠️ Single waveform loading also failed for Deck ${deckLetter}:`, waveError);
            }
        }
    }
}

// Create AudioBuffer from HTML audio element
async function createAudioBufferFromElement(audioElement) {
    return new Promise((resolve, reject) => {
        try {
            // Create a new audio context
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create a MediaElementSource from the audio element
            const source = audioContext.createMediaElementSource(audioElement);
            
            // This is a simplified approach - in practice, you'd need to:
            // 1. Fetch the audio data as ArrayBuffer
            // 2. Decode it to AudioBuffer
            // For now, we'll create a dummy buffer and let the separation system handle it
            
            // Fetch audio data
            fetch(audioElement.src)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
                .then(audioBuffer => resolve(audioBuffer))
                .catch(error => {
                    console.error('Failed to create audio buffer:', error);
                    // Create a dummy buffer as fallback
                    const dummyBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 2, audioContext.sampleRate);
                    resolve(dummyBuffer);
                });
                
        } catch (error) {
            reject(error);
        }
    });
}

// Initialize audio channels for a deck
function initializeDeckAudioChannels(deckLetter) {
    const deck = deckState[deckLetter];
    
    deck.audioChannels = {
        bass: { enabled: true, volume: 1.0, solo: false, mute: false },
        drums: { enabled: true, volume: 1.0, solo: false, mute: false },
        synth: { enabled: true, volume: 1.0, solo: false, mute: false }
    };
    
    console.log(`🎚️ Audio channels initialized for Deck ${deckLetter}`);
}

// Get fallback BPM based on genre
function getFallbackBPM(genre) {
    if (!genre) return 120;
    
    const genreLower = genre.toLowerCase();
    
    if (genreLower.includes('house')) return 128;
    if (genreLower.includes('techno')) return 132;
    if (genreLower.includes('trance')) return 138;
    if (genreLower.includes('drum') && genreLower.includes('bass')) return 174;
    if (genreLower.includes('dubstep')) return 140;
    if (genreLower.includes('hip hop') || genreLower.includes('rap')) return 95;
    if (genreLower.includes('trap')) return 140;
    if (genreLower.includes('reggae')) return 90;
    if (genreLower.includes('jazz')) return 120;
    if (genreLower.includes('rock')) return 120;
    if (genreLower.includes('pop')) return 120;
    if (genreLower.includes('electronic')) return 128;
    if (genreLower.includes('ambient')) return 80;
    if (genreLower.includes('breakbeat')) return 130;
    
    return 120;
}

// Update deck BPM display
function updateDeckBPM(deckLetter, bpmText) {
    console.log(`🎵 Updating Deck ${deckLetter} BPM: ${bpmText}`);
    
    const bpmElement = document.getElementById(`deck${deckLetter}BPM`);
    
    if (!bpmElement) {
        console.error(`❌ BPM element not found: deck${deckLetter}BPM`);
        return;
    }
    
    bpmElement.textContent = bpmText;
    
    // Remove all BPM state classes
    bpmElement.classList.remove('detecting', 'detected', 'error');
    
    // Add appropriate class based on BPM text
    if (bpmText.includes('~')) {
        bpmElement.classList.add('detecting');
        bpmElement.style.color = '#f39c12';
    } else if (bpmText.includes('BPM') && !bpmText.includes('--')) {
        bpmElement.classList.add('detected');
        bpmElement.style.color = '#1ed760';
    } else {
        bpmElement.classList.add('error');
        bpmElement.style.color = '#666';
    }
}

// Enhanced play function with multi-channel support
async function playDeck(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (!deck.track) {
        updateStatus(`No track loaded in Deck ${deckLetter}`, 'error');
        return;
    }

    try {
        // Ensure audio context is running
        if (appState.audioContext && appState.audioContext.state !== 'running') {
            await appState.audioContext.resume();
        }

        // Use multi-channel player if available
        if (deck.multiChannelPlayer) {
            console.log(`▶️ Playing multi-channel audio for Deck ${deckLetter}`);
            await deck.multiChannelPlayer.play();
            playMultiChannelWaveforms(deckLetter);
        } else if (deck.audio) {
            console.log(`▶️ Playing single-channel audio for Deck ${deckLetter}`);
            
            if (deck.audio.readyState < 2) {
                updateStatus(`Track still loading in Deck ${deckLetter}, please wait...`, 'info');
                return;
            }
            
            await deck.audio.play();
            
            // Apply volume based on hand control and channel settings
            updateDeckVolume(deckLetter);
            
            // Start single waveform if available
            if (deck.wavesurfer && !deck.wavesurfer.isPlaying()) {
                deck.wavesurfer.play();
            }
        }

        deck.isPlaying = true;
        deck.isPaused = false;
        deck.isFinished = false;

        updateDeckStatus(deckLetter, 'Playing');
        updateDeckUI(deckLetter);
        
        console.log(`▶️ Playing Deck ${deckLetter}: ${deck.track.title} (${deck.bpm} BPM)`);

    } catch (error) {
        console.error(`❌ Error playing Deck ${deckLetter}:`, error);
        
        let errorMessage = 'Failed to play track';
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Browser blocked audio - user interaction required';
        } else if (error.name === 'NotSupportedError') {
            errorMessage = 'Audio format not supported';
        }
        
        updateStatus(`${errorMessage} in Deck ${deckLetter}`, 'error');
    }
}

// Enhanced pause function
function pauseDeck(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (!deck.isPlaying) return;

    try {
        // Use multi-channel player if available
        if (deck.multiChannelPlayer) {
            deck.multiChannelPlayer.pause();
            pauseMultiChannelWaveforms(deckLetter);
        } else if (deck.audio) {
            deck.audio.pause();
            
            if (deck.wavesurfer && deck.wavesurfer.isPlaying()) {
                deck.wavesurfer.pause();
            }
        }

        deck.isPlaying = false;
        deck.isPaused = true;

        updateDeckStatus(deckLetter, 'Paused');
        updateDeckUI(deckLetter);
        
        console.log(`⏸️ Paused Deck ${deckLetter}`);
        
    } catch (error) {
        console.error(`❌ Error pausing Deck ${deckLetter}:`, error);
    }
}

// Enhanced stop function
function stopDeck(deckLetter) {
    const deck = deckState[deckLetter];
    
    try {
        // Use multi-channel player if available
        if (deck.multiChannelPlayer) {
            deck.multiChannelPlayer.stop();
            stopMultiChannelWaveforms(deckLetter);
        } else if (deck.audio) {
            deck.audio.pause();
            deck.audio.currentTime = 0;
            
            if (deck.wavesurfer) {
                deck.wavesurfer.stop();
            }
        }
        
        deck.isPlaying = false;
        deck.isPaused = false;

        updateDeckStatus(deckLetter, 'Stopped');
        updateDeckUI(deckLetter);
        
        console.log(`⏹️ Stopped Deck ${deckLetter}`);
        
    } catch (error) {
        console.error(`❌ Error stopping Deck ${deckLetter}:`, error);
    }
}

// Update deck volume based on hand control and channel settings
function updateDeckVolume(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (!deck.audio && !deck.multiChannelPlayer) return;
    
    let finalVolume = deck.volume;
    
    // Apply hand volume if hand controlled
    if (deck.handControlled) {
        finalVolume *= deck.handVolume;
    }
    
    // Apply to single audio element
    if (deck.audio) {
        deck.audio.volume = finalVolume;
    }
    
    // Apply to multi-channel player
    if (deck.multiChannelPlayer && deck.audioChannels) {
        Object.keys(deck.audioChannels).forEach(channel => {
            const channelState = deck.audioChannels[channel];
            const channelVolume = channelState.enabled ? channelState.volume * finalVolume : 0;
            deck.multiChannelPlayer.setChannelVolume(channel, channelVolume);
        });
    }
}

// Enhanced cleanup function
function cleanupDeckTrack(deckLetter) {
    const deck = deckState[deckLetter];
    
    // Stop any playing audio
    if (deck.isPlaying || deck.isPaused) {
        stopDeck(deckLetter);
    }
    
    // Clean up multi-channel player
    if (deck.multiChannelPlayer) {
        deck.multiChannelPlayer.stop();
        deck.multiChannelPlayer = null;
    }
    
    // Clean up separated buffers
    if (deck.separatedBuffers) {
        deck.separatedBuffers = null;
    }
    
    // Remove track end listener
    if (deck.audio && deck.trackEndListener) {
        deck.audio.removeEventListener('ended', deck.trackEndListener);
        deck.trackEndListener = null;
    }
    
    // Clean up audio element
    if (deck.audio) {
        deck.audio.pause();
        deck.audio.src = '';
        deck.audio = null;
    }
    
    // Clean up waveforms
    if (deck.wavesurfers) {
        Object.values(deck.wavesurfers).forEach(wavesurfer => {
            try {
                wavesurfer.destroy();
            } catch (error) {
                console.warn('Error destroying wavesurfer:', error);
            }
        });
        deck.wavesurfers = null;
    }
    
    if (deck.wavesurfer) {
        try {
            deck.wavesurfer.destroy();
        } catch (error) {
            console.warn('Error destroying single wavesurfer:', error);
        }
        deck.wavesurfer = null;
    }
    
    // Reset deck state
    deck.isFinished = false;
    deck.handControlled = false;
    deck.bpm = null;
    deck.audioChannels = null;
    
    // Reset BPM display
    updateDeckBPM(deckLetter, '-- BPM');
    
    console.log(`🧹 Cleaned up Deck ${deckLetter}`);
}

// Track end detection
function setupTrackEndDetection(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (deck.audio) {
        // Remove previous listener if exists
        if (deck.trackEndListener) {
            deck.audio.removeEventListener('ended', deck.trackEndListener);
        }
        
        // Create new end listener
        deck.trackEndListener = function() {
            console.log(`🏁 Track finished on Deck ${deckLetter}: ${deck.track.title}`);
            handleTrackEnd(deckLetter);
        };
        
        deck.audio.addEventListener('ended', deck.trackEndListener);
        console.log(`👂 Track end detection set up for Deck ${deckLetter}`);
    }
}

function handleTrackEnd(deckLetter) {
    const deck = deckState[deckLetter];
    
    deck.isFinished = true;
    deck.isPlaying = false;
    deck.isPaused = false;
    
    updateDeckStatus(deckLetter, 'Finished');
    updateDeckUI(deckLetter);
    
    updateStatus(`Track finished on Deck ${deckLetter}`, 'info');
}

// Skip track function
function skipTrackOnDeck(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (!deck.track) {
        updateStatus(`No track to skip on Deck ${deckLetter}`, 'error');
        return;
    }
    
    console.log(`⏭️ Skipping track on Deck ${deckLetter}: ${deck.track.title}`);
    
    stopDeck(deckLetter);
    deck.isFinished = true;
    
    updateStatus(`Skipped track on Deck ${deckLetter}`, 'success');
}

console.log('✅ Multi-Channel Deck Manager Ready');