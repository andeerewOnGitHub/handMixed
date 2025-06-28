// static/js/audio/wavesurfer-setup.js - Wavesurfer Waveform Visualization Setup

// Initialize Wavesurfer instances for both decks
function initializeWavesurfers() {
    try {
        // Deck A Wavesurfer
        deckState.A.wavesurfer = WaveSurfer.create({
            container: '#deckAWaveformContainer',
            waveColor: '#00d4ff',
            progressColor: '#1ed760',
            cursorColor: '#fff',
            barWidth: 2,
            barRadius: 1,
            height: 60,
            normalize: true,
            backend: 'WebAudio',
            responsive: true
        });

        // Deck B Wavesurfer
        deckState.B.wavesurfer = WaveSurfer.create({
            container: '#deckBWaveformContainer',
            waveColor: '#f39c12',
            progressColor: '#1ed760',
            cursorColor: '#fff',
            barWidth: 2,
            barRadius: 1,
            height: 60,
            normalize: true,
            backend: 'WebAudio',
            responsive: true
        });

        console.log('🌊 Wavesurfer instances initialized');
    } catch (error) {
        console.error('❌ Wavesurfer initialization failed:', error);
    }
}