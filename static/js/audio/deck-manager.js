// static/js/audio/deck-manager.js - Simplified with Audius BPM Data

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
    selectedDisplay.style.borderColor = deckLetter === 'A' ? '#00d4ff' : '#f39c12';
    selectedDisplay.style.background = deckLetter === 'A' ? 
        'linear-gradient(135deg, rgba(0, 212, 255, 0.4), rgba(30, 215, 96, 0.4))' :
        'linear-gradient(135deg, rgba(243, 156, 18, 0.4), rgba(30, 215, 96, 0.4))';
}

// Load track to selected deck with BPM from Audius
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
            // Fallback BPM based on genre or default
            const fallbackBPM = getFallbackBPM(track.genre);
            deck.bpm = fallbackBPM;
            updateDeckBPM(deckLetter, `~${fallbackBPM} BPM`);
            console.log(`⚠️ Using fallback BPM: ${fallbackBPM} BPM (Genre: ${track.genre || 'Unknown'})`);
        }

        // Create HTML5 Audio element for playback
        deck.audio = new Audio();
        deck.audio.crossOrigin = 'anonymous';
        deck.audio.preload = 'auto';
        
        // Set up loading timeout
        const loadTimeout = setTimeout(() => {
            if (deck.audio && deck.audio.readyState === 0) {
                console.warn(`⚠️ Track loading timeout for Deck ${deckLetter}`);
                updateStatus(`Track loading timeout for Deck ${deckLetter} - trying alternate stream`, 'error');
                
                // Try to fallback or cleanup
                cleanupDeckTrack(deckLetter);
                updateDeckDisplay(deckLetter, null);
            }
        }, 15000); // 15 second timeout
        
        // Set up audio event listeners
        deck.audio.addEventListener('loadeddata', () => {
            clearTimeout(loadTimeout);
            console.log(`✅ Track loaded in Deck ${deckLetter}: ${track.title}`);
            updateStatus(`"${track.title}" loaded in Deck ${deckLetter} (${deck.bpm} BPM)`, 'success');
            updateDeckDisplay(deckLetter, track);
            updateDeckUI(deckLetter);
        });

        deck.audio.addEventListener('canplaythrough', () => {
            clearTimeout(loadTimeout);
            console.log(`✅ Track ready to play in Deck ${deckLetter}: ${track.title}`);
        });

        deck.audio.addEventListener('error', (error) => {
            clearTimeout(loadTimeout);
            console.error(`❌ Error loading track in Deck ${deckLetter}:`, error);
            console.error('Audio error details:', deck.audio.error);
            
            let errorMessage = 'Failed to load track';
            if (deck.audio.error) {
                switch(deck.audio.error.code) {
                    case deck.audio.error.MEDIA_ERR_ABORTED:
                        errorMessage = 'Audio loading aborted';
                        break;
                    case deck.audio.error.MEDIA_ERR_NETWORK:
                        errorMessage = 'Network error loading audio - check connection';
                        break;
                    case deck.audio.error.MEDIA_ERR_DECODE:
                        errorMessage = 'Audio decode error - unsupported format';
                        break;
                    case deck.audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                        errorMessage = 'Audio source not supported - try another track';
                        break;
                    default:
                        errorMessage = 'Unknown audio error';
                }
            }
            
            updateStatus(`${errorMessage} in Deck ${deckLetter}`, 'error');
            
            // Reset deck display
            cleanupDeckTrack(deckLetter);
            updateDeckDisplay(deckLetter, null);
        });

        // Set up track end detection
        setupTrackEndDetection(deckLetter);

        // Validate stream URL before loading
        if (!track.stream_url || track.stream_url.trim() === '') {
            throw new Error('Invalid or missing stream URL');
        }

        console.log(`🌐 Loading audio from: ${track.stream_url}`);
        
        // Load the track
        deck.audio.src = track.stream_url;

        // Load waveform with error handling
        if (deck.wavesurfer && track.stream_url) {
            try {
                deck.wavesurfer.load(track.stream_url);
            } catch (waveError) {
                console.warn(`⚠️ Waveform loading failed for Deck ${deckLetter}:`, waveError);
                // Continue without waveform - audio should still work
            }
        }

        // Clear selection
        appState.selectedDeck = null;
        document.querySelectorAll('.deck-track-display').forEach(display => {
            display.style.borderColor = '';
            display.style.background = '';
        });

    } catch (error) {
        console.error(`❌ Error loading track to Deck ${deckLetter}:`, error);
        updateStatus(`Failed to load track: ${error.message}`, 'error');
        
        // Cleanup on error
        cleanupDeckTrack(deckLetter);
        updateDeckDisplay(deckLetter, null);
    }
}

// Get fallback BPM based on genre
function getFallbackBPM(genre) {
    if (!genre) return 120;
    
    const genreLower = genre.toLowerCase();
    
    // Genre-based BPM mapping
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
    
    return 120; // Default BPM
}

// Update deck BPM display
function updateDeckBPM(deckLetter, bpmText) {
    console.log(`🎵 Updating Deck ${deckLetter} BPM: ${bpmText}`);
    
    const bpmElement = document.getElementById(`deck${deckLetter}BPM`);
    
    if (!bpmElement) {
        console.error(`❌ BPM element not found: deck${deckLetter}BPM`);
        return;
    }
    
    // Update text content
    bpmElement.textContent = bpmText;
    
    // Remove all BPM state classes
    bpmElement.classList.remove('detecting', 'detected', 'error');
    
    // Add appropriate class based on BPM text
    if (bpmText.includes('~')) {
        // Estimated BPM (fallback)
        bpmElement.classList.add('detecting');
        bpmElement.style.color = '#f39c12';
    } else if (bpmText.includes('BPM') && !bpmText.includes('--')) {
        // Actual BPM from Audius
        bpmElement.classList.add('detected');
        bpmElement.style.color = '#1ed760';
    } else {
        // No BPM
        bpmElement.classList.add('error');
        bpmElement.style.color = '#666';
    }
}

// Rest of the functions remain the same...
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
        
        // Add listener for when track ends
        deck.audio.addEventListener('ended', deck.trackEndListener);
        
        console.log(`👂 Track end detection set up for Deck ${deckLetter}`);
    }
}

function handleTrackEnd(deckLetter) {
    const deck = deckState[deckLetter];
    
    // Mark track as finished
    deck.isFinished = true;
    deck.isPlaying = false;
    deck.isPaused = false;
    
    // Update UI
    updateDeckStatus(deckLetter, 'Finished');
    updateDeckUI(deckLetter);
    
    // Update status
    updateStatus(`Track finished on Deck ${deckLetter}`, 'info');
}

function cleanupDeckTrack(deckLetter) {
    const deck = deckState[deckLetter];
    
    // Stop any playing audio
    if (deck.isPlaying || deck.isPaused) {
        stopDeck(deckLetter);
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
    
    // Reset deck state
    deck.isFinished = false;
    deck.handControlled = false;
    deck.bpm = null;
    
    // Reset BPM display
    updateDeckBPM(deckLetter, '-- BPM');
    
    console.log(`🧹 Cleaned up Deck ${deckLetter}`);
}

async function playDeck(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (!deck.audio || !deck.track) {
        updateStatus(`No track loaded in Deck ${deckLetter}`, 'error');
        return;
    }

    try {
        // Ensure audio context is running
        if (Tone.context.state !== 'running') {
            await Tone.start();
        }

        // Check if audio is ready to play
        if (deck.audio.readyState < 2) {
            updateStatus(`Track still loading in Deck ${deckLetter}, please wait...`, 'info');
            return;
        }

        await deck.audio.play();
        deck.isPlaying = true;
        deck.isPaused = false;
        deck.isFinished = false;

        // Apply hand volume if hand controlled
        if (deck.handControlled) {
            deck.audio.volume = deck.volume * deck.handVolume;
        } else {
            deck.audio.volume = deck.volume;
        }

        // Start waveform playback
        if (deck.wavesurfer) {
            try {
                deck.wavesurfer.play();
            } catch (waveError) {
                console.warn(`⚠️ Waveform play failed for Deck ${deckLetter}:`, waveError);
                // Continue without waveform - audio should still work
            }
        }

        updateDeckStatus(deckLetter, 'Playing');
        updateDeckUI(deckLetter);
        
        console.log(`▶️ Playing Deck ${deckLetter}: ${deck.track.title} (${deck.bmp} BPM)`);
        updateStatus(`Playing: ${deck.track.title} (${deck.bpm} BPM)`, 'success');

    } catch (error) {
        console.error(`❌ Error playing Deck ${deckLetter}:`, error);
        
        // Provide specific error messages for common play issues
        let errorMessage = 'Failed to play track';
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Browser blocked audio - user interaction required';
        } else if (error.name === 'NotSupportedError') {
            errorMessage = 'Audio format not supported';
        } else if (error.name === 'AbortError') {
            errorMessage = 'Audio playback aborted';
        }
        
        updateStatus(`${errorMessage} in Deck ${deckLetter}`, 'error');
    }
}

function pauseDeck(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (!deck.isPlaying || !deck.audio) return;

    deck.audio.pause();
    deck.isPlaying = false;
    deck.isPaused = true;

    // Pause waveform
    if (deck.wavesurfer) {
        try {
            deck.wavesurfer.pause();
        } catch (waveError) {
            console.warn(`⚠️ Waveform pause failed for Deck ${deckLetter}:`, waveError);
        }
    }

    updateDeckStatus(deckLetter, 'Paused');
    updateDeckUI(deckLetter);
    
    console.log(`⏸️ Paused Deck ${deckLetter}`);
}

function stopDeck(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (deck.audio) {
        deck.audio.pause();
        deck.audio.currentTime = 0;
    }
    
    deck.isPlaying = false;
    deck.isPaused = false;

    // Stop waveform
    if (deck.wavesurfer) {
        try {
            deck.wavesurfer.stop();
        } catch (waveError) {
            console.warn(`⚠️ Waveform stop failed for Deck ${deckLetter}:`, waveError);
        }
    }

    updateDeckStatus(deckLetter, 'Stopped');
    updateDeckUI(deckLetter);
    
    console.log(`⏹️ Stopped Deck ${deckLetter}`);
}

function skipTrackOnDeck(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (!deck.track) {
        updateStatus(`No track to skip on Deck ${deckLetter}`, 'error');
        return;
    }
    
    console.log(`⏭️ Skipping track on Deck ${deckLetter}: ${deck.track.title}`);
    
    // Stop current track
    stopDeck(deckLetter);
    
    // Mark as finished
    deck.isFinished = true;
    
    updateStatus(`Skipped track on Deck ${deckLetter}`, 'success');
}