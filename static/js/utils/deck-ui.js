// static/js/utils/deck-ui.js - Updated with BPM Display Functions

// Update deck display
function updateDeckDisplay(deckLetter, track) {
    const nameElement = document.getElementById(`deck${deckLetter}TrackName`);
    const artistElement = document.getElementById(`deck${deckLetter}TrackArtist`);
    const artworkElement = document.getElementById(`deck${deckLetter}Artwork`);
    const displayElement = document.getElementById(`deck${deckLetter}TrackDisplay`);
    
    if (track) {
        nameElement.textContent = track.title;
        artistElement.textContent = track.artist;
        
        if (track.artwork) {
            artworkElement.innerHTML = `<img src="${track.artwork}" alt="${track.title}">`;
        } else {
            artworkElement.textContent = '🎵';
        }
        
        displayElement.classList.add('loaded');
        updateDeckStatus(deckLetter, 'Ready');
        
        // Set initial BPM display
        if (track.bpm) {
            updateDeckBPM(deckLetter, `${track.bpm} BPM`);
        } else {
            updateDeckBPM(deckLetter, 'Detecting...');
        }
    } else {
        nameElement.textContent = 'No track loaded';
        artistElement.textContent = 'Select track from Audius';
        artworkElement.textContent = '🎵';
        displayElement.classList.remove('loaded');
        updateDeckStatus(deckLetter, 'Empty');
        updateDeckBPM(deckLetter, '-- BPM');
    }
    
    updateDeckUI(deckLetter);
}

// Update deck BPM display
function updateDeckBPM(deckLetter, bpmText) {
    const bpmElement = document.getElementById(`deck${deckLetter}BPM`);
    
    if (bpmElement) {
        bpmElement.textContent = bpmText;
        
        // Add visual feedback for BPM detection states
        bpmElement.classList.remove('detecting', 'detected', 'error');
        
        if (bpmText.includes('Detecting') || bpmText.includes('Analyzing') || bpmText.includes('Quick scan')) {
            bpmElement.classList.add('detecting');
        } else if (bpmText.includes('BPM') && !bpmText.includes('--')) {
            bpmElement.classList.add('detected');
        } else if (bpmText.includes('--')) {
            bpmElement.classList.add('error');
        }
        
        console.log(`🎵 Updated Deck ${deckLetter} BPM display: ${bpmText}`);
    }
}

// Update deck status
function updateDeckStatus(deckLetter, status) {
    document.getElementById(`deck${deckLetter}TrackStatus`).textContent = status;
}

// Update deck buttons
function updateDeckUI(deckLetter) {
    const deck = deckState[deckLetter];
    
    const playBtn = document.getElementById(`deck${deckLetter}PlayBtn`);
    const pauseBtn = document.getElementById(`deck${deckLetter}PauseBtn`);
    const stopBtn = document.getElementById(`deck${deckLetter}StopBtn`);
    const skipBtn = document.getElementById(`deck${deckLetter}SkipBtn`);
    
    if (playBtn) playBtn.disabled = !deck.track || deck.isPlaying;
    if (pauseBtn) pauseBtn.disabled = !deck.isPlaying;
    if (stopBtn) stopBtn.disabled = !deck.track || (!deck.isPlaying && !deck.isPaused);
    if (skipBtn) skipBtn.disabled = !deck.track;
}

// Update deck volume indicator
function updateDeckVolumeIndicator(deckLetter, volumePercent) {
    const volumeFill = document.getElementById(`deck${deckLetter}VolumeFill`);
    const volumeText = document.getElementById(`deck${deckLetter}VolumeText`);
    
    if (volumeFill && volumeText) {
        volumeFill.style.width = `${volumePercent}%`;
        volumeText.textContent = `Volume: ${Math.round(volumePercent)}%`;
    }
}

// BPM-related utility functions

// Get deck BPM
function getDeckBPM(deckLetter) {
    const deck = deckState[deckLetter];
    return deck.bpm || 120; // Default to 120 if no BPM detected
}

// Check if both decks have BPM detected
function haveBothDecksBPM() {
    return deckState.A.bpm && deckState.B.bpm;
}

// Calculate BPM difference between decks
function getBPMDifference() {
    if (!haveBothDecksBPM()) return 0;
    
    const bpmA = getDeckBPM('A');
    const bpmB = getDeckBPM('B');
    
    return Math.abs(bpmA - bpmB);
}

// Get BPM sync ratio between decks
function getBPMSyncRatio() {
    if (!haveBothDecksBPM()) return 1;
    
    const bpmA = getDeckBPM('A');
    const bpmB = getDeckBPM('B');
    
    return bpmA / bpmB;
}

// Update BPM sync indicator (if you want to add visual feedback)
function updateBPMSyncIndicator() {
    if (!haveBothDecksBPM()) return;
    
    const difference = getBPMDifference();
    const syncRatio = getBPMSyncRatio();
    
    // Visual feedback based on BPM compatibility
    let syncStatus = '';
    let syncColor = '';
    
    if (difference <= 2) {
        syncStatus = '🟢 Perfect Sync';
        syncColor = '#1ed760';
    } else if (difference <= 5) {
        syncStatus = '🟡 Close Sync';
        syncColor = '#f39c12';
    } else if (difference <= 10) {
        syncStatus = '🟠 Needs Adjustment';
        syncColor = '#e67e22';
    } else {
        syncStatus = '🔴 BPM Mismatch';
        syncColor = '#ff6b6b';
    }
    
    // You can add a sync indicator element to your HTML and update it here
    console.log(`🎵 BPM Sync Status: ${syncStatus} (Difference: ${difference.toFixed(1)} BPM)`);
    
    // Example: Update a hypothetical sync indicator
    const syncIndicator = document.getElementById('bpmSyncIndicator');
    if (syncIndicator) {
        syncIndicator.textContent = syncStatus;
        syncIndicator.style.color = syncColor;
    }
}

// Advanced BPM display formatting
function formatBPMDisplay(bpm, isDetecting = false) {
    if (isDetecting) {
        return '🔍 Analyzing...';
    }
    
    if (!bpm || isNaN(bpm)) {
        return '-- BPM';
    }
    
    return `${Math.round(bpm)} BPM`;
}

// Enhanced deck display with BPM info
function updateDeckDisplayEnhanced(deckLetter, track) {
    updateDeckDisplay(deckLetter, track);
    
    if (track && track.bpm) {
        // Add BPM info to track status
        const statusElement = document.getElementById(`deck${deckLetter}TrackStatus`);
        if (statusElement && track.bpm) {
            const currentStatus = statusElement.textContent;
            if (!currentStatus.includes('BPM')) {
                statusElement.textContent = `${currentStatus} • ${track.bpm} BPM`;
            }
        }
    }
    
    // Update sync indicator if both decks have tracks
    if (deckState.A.track && deckState.B.track) {
        updateBPMSyncIndicator();
    }
}