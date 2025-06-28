// static/js/audio/deck-manager.js - Deck Audio Management

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

// Load track to selected deck
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

        // Create HTML5 Audio element for playback
        deck.audio = new Audio();
        deck.audio.crossOrigin = 'anonymous';
        deck.audio.preload = 'auto';
        
        // Set up audio event listeners
        deck.audio.addEventListener('loadeddata', () => {
            console.log(`✅ Track loaded in Deck ${deckLetter}: ${track.title}`);
            updateStatus(`"${track.title}" loaded in Deck ${deckLetter}`, 'success');
            updateDeckDisplay(deckLetter, track);
            updateDeckUI(deckLetter);
        });

        deck.audio.addEventListener('error', (error) => {
            console.error(`❌ Error loading track in Deck ${deckLetter}:`, error);
            updateStatus(`Failed to load track in Deck ${deckLetter}`, 'error');
        });

        // Set up track end detection
        setupTrackEndDetection(deckLetter);

        // Load the track
        deck.audio.src = track.stream_url;

        // Load waveform
        if (deck.wavesurfer && track.stream_url) {
            deck.wavesurfer.load(track.stream_url);
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
    }
}

// Set up track end detection
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

// Handle when a track ends
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

// Clean up deck track
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
    
    console.log(`🧹 Cleaned up Deck ${deckLetter}`);
}

// Play deck
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
            deck.wavesurfer.play();
        }

        updateDeckStatus(deckLetter, 'Playing');
        updateDeckUI(deckLetter);
        
        console.log(`▶️ Playing Deck ${deckLetter}: ${deck.track.title}`);
        updateStatus(`Playing: ${deck.track.title}`, 'success');

    } catch (error) {
        console.error(`❌ Error playing Deck ${deckLetter}:`, error);
        updateStatus(`Failed to play Deck ${deckLetter}`, 'error');
    }
}

// Pause deck
function pauseDeck(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (!deck.isPlaying || !deck.audio) return;

    deck.audio.pause();
    deck.isPlaying = false;
    deck.isPaused = true;

    // Pause waveform
    if (deck.wavesurfer) {
        deck.wavesurfer.pause();
    }

    updateDeckStatus(deckLetter, 'Paused');
    updateDeckUI(deckLetter);
    
    console.log(`⏸️ Paused Deck ${deckLetter}`);
}

// Stop deck
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
        deck.wavesurfer.stop();
    }

    updateDeckStatus(deckLetter, 'Stopped');
    updateDeckUI(deckLetter);
    
    console.log(`⏹️ Stopped Deck ${deckLetter}`);
}

// Skip track on deck
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