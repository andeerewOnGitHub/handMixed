// static/js/gestures/hand-gestures.js - Hand Gesture Processing

// Also update the processHandControl function to match the new mapping
function processHandControl(handSide, handHeight) {
    // Now left hand controls Deck A and right hand controls Deck B
    const deckLetter = handSide === 'leftHand' ? 'A' : 'B';
    const deck = deckState[deckLetter];
    
    // Convert hand height to volume (0.0 to 1.0)
    const volume = Math.max(0, Math.min(1, handHeight));
    
    // Update deck volume
    deck.handVolume = volume;
    deck.handControlled = true;
    
    // Apply volume to audio if track is loaded
    if (deck.audio && deck.track) {
        const finalVolume = deck.volume * volume;
        deck.audio.volume = finalVolume;
    }
    
    // Update visual volume indicator
    updateDeckVolumeIndicator(deckLetter, volume * 100);
    
    console.log(`🖐️ ${handSide} controlling Deck ${deckLetter}: ${Math.round(volume * 100)}%`);
}

// Process deck control based on hand presence
function processHandDeckControl() {
    // Deck A (Left Hand) Control - now that camera is unmirrored
    if (handState.leftHand.detected && handState.leftHand.controlling) {
        const deck = deckState.A;
        if (deck.track && !deck.isPlaying && !deck.isPaused) {
            // Auto-play when hand is detected and track is loaded
            playDeck('A');
            updateStatus('Left hand detected - Playing Deck A', 'success');
        }
        document.getElementById('deckAOverlay').classList.add('hand-active');
    } else {
        // Pause/stop when hand is not detected
        const deck = deckState.A;
        if (deck.isPlaying && deck.handControlled) {
            pauseDeck('A');
            updateStatus('Left hand lost - Pausing Deck A', 'info');
        }
        deck.handControlled = false;
        document.getElementById('deckAOverlay').classList.remove('hand-active');
        updateDeckVolumeIndicator('A', deck.volume * 100);
    }

    // Deck B (Right Hand) Control - now that camera is unmirrored
    if (handState.rightHand.detected && handState.rightHand.controlling) {
        const deck = deckState.B;
        if (deck.track && !deck.isPlaying && !deck.isPaused) {
            // Auto-play when hand is detected and track is loaded
            playDeck('B');
            updateStatus('Right hand detected - Playing Deck B', 'success');
        }
        document.getElementById('deckBOverlay').classList.add('hand-active');
    } else {
        // Pause/stop when hand is not detected
        const deck = deckState.B;
        if (deck.isPlaying && deck.handControlled) {
            pauseDeck('B');
            updateStatus('Right hand lost - Pausing Deck B', 'info');
        }
        deck.handControlled = false;
        document.getElementById('deckBOverlay').classList.remove('hand-active');
        updateDeckVolumeIndicator('B', deck.volume * 100);
    }
}