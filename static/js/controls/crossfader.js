// static/js/controls/crossfader.js - Crossfader Control System

// Set crossfader
function setCrossfader(value) {
    const crossfaderValue = parseInt(value);
    
    // Calculate volume for each deck (0-1)
    const deckAVolume = Math.max(0, (100 - crossfaderValue) / 50);
    const deckBVolume = Math.max(0, crossfaderValue / 50);
    
    // Apply to deck volumes if not hand controlled
    if (deckState.A.audio && !deckState.A.handControlled) {
        deckState.A.audio.volume = deckState.A.volume * deckAVolume;
    }
    
    if (deckState.B.audio && !deckState.B.handControlled) {
        deckState.B.audio.volume = deckState.B.volume * deckBVolume;
    }
    
    console.log(`🎚️ Crossfader: ${crossfaderValue}% (A: ${Math.round(deckAVolume * 100)}%, B: ${Math.round(deckBVolume * 100)}%)`);
}