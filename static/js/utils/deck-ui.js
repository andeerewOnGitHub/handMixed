// static/js/utils/deck-ui.js - Deck UI Functions

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
    } else {
        nameElement.textContent = 'No track loaded';
        artistElement.textContent = 'Select track from Audius';
        artworkElement.textContent = '🎵';
        displayElement.classList.remove('loaded');
        updateDeckStatus(deckLetter, 'Empty');
    }
    
    updateDeckUI(deckLetter);
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