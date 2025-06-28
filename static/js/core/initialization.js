// static/js/core/initialization.js - Application Initialization

// Initialize Application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎵 Initializing HandMixed Pro...');
    
    // Initialize Tone.js
    await initializeToneJS();
    
    // Initialize Wavesurfer instances
    initializeWavesurfers();
    
    // Load saved playlists
    loadSavedPlaylists();
    
    // Set default hub height
    updateHubHeight(40);
    
    console.log('✅ HandMixed Pro initialized successfully');
    updateStatus('Professional DJ Studio ready - Load tracks from Audius!', 'success');
});