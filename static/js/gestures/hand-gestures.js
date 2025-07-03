// static/js/gestures/hand-gestures.js - NEVER PAUSE VERSION

console.log('🎵 Hand Gestures Loaded - NEVER PAUSE VERSION');

// Process hand control - ONLY volume control
function processHandControl(handSide, handHeight) {
    const deckLetter = handSide === 'leftHand' ? 'A' : 'B';
    const deck = deckState[deckLetter];
    
    // Convert hand height to volume (0.0 to 1.0)
    const volume = Math.max(0, Math.min(1, handHeight));
    
    // Update deck volume
    deck.handVolume = volume;
    deck.handControlled = true;
    
    // Apply volume to audio
    if (deck.audio && deck.track) {
        const finalVolume = deck.volume * volume;
        deck.audio.volume = finalVolume;
        console.log(`🔊 Deck ${deckLetter} volume: ${Math.round(finalVolume * 100)}%`);
    }
    
    // Update visual indicator
    updateDeckVolumeIndicator(deckLetter, volume * 100);
}

// Process deck control - START ONCE, NEVER PAUSE
function processHandDeckControl() {
    // Deck A (Left Hand)
    if (handState.leftHand.detected && handState.leftHand.controlling) {
        const deck = deckState.A;
        
        // ONLY start if not already playing
        if (deck.track && !deck.isPlaying) {
            console.log('🎵 STARTING Deck A - will never pause again');
            playDeck('A');
            updateStatus('Deck A started - will continue playing', 'success');
        }
        
        document.getElementById('deckAOverlay').classList.add('hand-active');
        
    } else {
        // Hand gone - ONLY set volume to 0, NEVER pause
        const deck = deckState.A;
        
        if (deck.handControlled) {
            console.log('🔇 Hand gone - Deck A volume to 0 (STILL PLAYING)');
            deck.handVolume = 0;
            
            // Set volume to 0 but DO NOT PAUSE
            if (deck.audio) {
                deck.audio.volume = 0;
            }
            
            updateDeckVolumeIndicator('A', 0);
            updateStatus('Hand lost - Deck A muted (still playing)', 'info');
        }
        
        deck.handControlled = false;
        document.getElementById('deckAOverlay').classList.remove('hand-active');
    }

    // Deck B (Right Hand)
    if (handState.rightHand.detected && handState.rightHand.controlling) {
        const deck = deckState.B;
        
        // ONLY start if not already playing
        if (deck.track && !deck.isPlaying) {
            console.log('🎵 STARTING Deck B - will never pause again');
            playDeck('B');
            updateStatus('Deck B started - will continue playing', 'success');
        }
        
        document.getElementById('deckBOverlay').classList.add('hand-active');
        
    } else {
        // Hand gone - ONLY set volume to 0, NEVER pause
        const deck = deckState.B;
        
        if (deck.handControlled) {
            console.log('🔇 Hand gone - Deck B volume to 0 (STILL PLAYING)');
            deck.handVolume = 0;
            
            // Set volume to 0 but DO NOT PAUSE
            if (deck.audio) {
                deck.audio.volume = 0;
            }
            
            updateDeckVolumeIndicator('B', 0);
            updateStatus('Hand lost - Deck B muted (still playing)', 'info');
        }
        
        deck.handControlled = false;
        document.getElementById('deckBOverlay').classList.remove('hand-active');
    }
}

// BLOCK any automatic pausing from other code
let blockAutoPause = false;

// Override pauseDeck to prevent automatic pausing
const originalPauseDeck = window.pauseDeck;
window.pauseDeck = function(deckLetter) {
    console.log(`🛑 pauseDeck called for Deck ${deckLetter}`);
    
    // Check if this pause is from hand control (which we want to block)
    const stack = new Error().stack;
    if (stack.includes('processHand') || blockAutoPause) {
        console.log('❌ BLOCKED automatic pause from hand control');
        return;
    }
    
    console.log('✅ Allowing manual pause');
    return originalPauseDeck(deckLetter);
};

// Set flag to block auto-pause when hands disappear
function blockAutoPauseTemporarily() {
    blockAutoPause = true;
    setTimeout(() => {
        blockAutoPause = false;
    }, 100);
}

console.log('🎛️ Never-pause hand control loaded!');