// static/js/audio/tone-setup.js - Tone.js Audio System Setup

// Initialize Tone.js Audio Context
async function initializeToneJS() {
    try {
        // Initialize Tone.js
        await Tone.start();
        console.log('🎛️ Tone.js initialized');
        
        // Create master volume control
        appState.masterGain = new Tone.Gain(0.8).toDestination();
        
        // Create individual deck gains
        deckState.A.gain = new Tone.Gain(0.7).connect(appState.masterGain);
        deckState.B.gain = new Tone.Gain(0.7).connect(appState.masterGain);
        
        console.log('✅ Audio system initialized');
        return true;
    } catch (error) {
        console.error('❌ Tone.js initialization failed:', error);
        updateStatus('Audio system failed to initialize', 'error');
        return false;
    }
}