// static/js/core/initialization.js - Multi-Channel Application Initialization

console.log('🚀 Initializing HandMixed Pro - Multi-Channel Edition...');

// Initialize Application with Multi-Channel Support
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎵 Starting HandMixed Pro Multi-Channel initialization...');
    
    try {
        // Initialize core audio systems
        await initializeAudioSystems();
        
        // Initialize multi-channel waveform visualization
        await initializeVisualization();
        
        // Initialize gesture recognition system
        await initializeGestureSystem();
        
        // Initialize user interface
        await initializeUserInterface();
        
        // Load user data
        await loadUserData();
        
        // Initialize global controls
        initializeGlobalControls();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load default content
        await loadDefaultContent();
        
        console.log('✅ HandMixed Pro Multi-Channel initialization completed successfully');
        updateStatus('Professional Multi-Channel DJ Studio ready - Load tracks and use hand gestures!', 'success');
        
        // Show initialization complete message
        showInitializationComplete();
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        updateStatus('Initialization failed: ' + error.message, 'error');
        showInitializationError(error);
    }
});

// Initialize core audio systems
async function initializeAudioSystems() {
    console.log('🎛️ Initializing audio systems...');
    
    try {
        // Initialize Tone.js
        const toneInitialized = await initializeToneJS();
        if (!toneInitialized) {
            throw new Error('Tone.js initialization failed');
        }
        
        // Initialize Web Audio API context
        try {
            appState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('✅ Web Audio API context created');
        } catch (audioError) {
            console.warn('⚠️ Web Audio API not available, some features may be limited');
        }
        
        // Initialize audio source separation system
        if (appState.audioContext) {
            console.log('🔧 Audio source separation system ready');
        }
        
        console.log('✅ Audio systems initialized');
        
    } catch (error) {
        console.error('❌ Audio system initialization failed:', error);
        throw error;
    }
}

// Initialize visualization systems
async function initializeVisualization() {
    console.log('🌊 Initializing visualization systems...');
    
    try {
        // Initialize multi-channel Wavesurfer instances
        initializeWavesurfers();
        
        // Set up canvas for hand tracking visualization
        await initializeHandTrackingCanvas();
        
        console.log('✅ Visualization systems initialized');
        
    } catch (error) {
        console.error('❌ Visualization initialization failed:', error);
        // Continue without visualization if it fails
        console.log('⚠️ Continuing without full visualization support');
    }
}

// Initialize gesture recognition system
async function initializeGestureSystem() {
    console.log('🖐️ Initializing gesture recognition system...');
    
    try {
        // Check if MediaPipe is available
        if (typeof Hands === 'undefined') {
            console.warn('⚠️ MediaPipe not available, gesture controls will be limited');
            return;
        }
        
        // Initialize MediaPipe hands (but don't start tracking yet)
        console.log('🤖 MediaPipe hands detection ready');
        
        // Set up gesture recognition parameters
        gestureState.recognition.enabled = true;
        gestureState.recognition.sensitivity = 0.05;
        gestureState.recognition.cooldownMs = 200;
        
        console.log('✅ Gesture recognition system initialized');
        
    } catch (error) {
        console.error('❌ Gesture system initialization failed:', error);
        // Continue without gesture controls if it fails
        console.log('⚠️ Continuing without gesture recognition');
    }
}

// Initialize user interface
async function initializeUserInterface() {
    console.log('🎨 Initializing user interface...');
    
    try {
        // Set default hub height
        updateHubHeight(40);
        
        // Initialize deck displays
        updateDeckDisplay('A', null);
        updateDeckDisplay('B', null);
        
        // Initialize channel indicators
        initializeChannelIndicators();
        
        // Initialize gesture instructions
        initializeGestureInstructions();
        
        // Initialize global controls
        initializeGlobalPlaybackControls();
        
        // Update initial UI state
        updateGlobalPlaybackState();
        
        console.log('✅ User interface initialized');
        
    } catch (error) {
        console.error('❌ UI initialization failed:', error);
        throw error;
    }
}

// Initialize channel indicators for both decks
function initializeChannelIndicators() {
    ['A', 'B'].forEach(deckLetter => {
        const channels = ['Bass', 'Drums', 'Synth'];
        channels.forEach(channel => {
            const indicator = document.getElementById(`deck${deckLetter}${channel}Channel`);
            if (indicator) {
                const statusElement = indicator.querySelector('.channel-status');
                if (statusElement) {
                    statusElement.classList.add('active');
                }
            }
        });
    });
    
    console.log('✅ Channel indicators initialized');
}

// Initialize gesture instructions display
function initializeGestureInstructions() {
    const instructions = document.querySelector('.gesture-instructions');
    if (instructions) {
        // Add click handler to toggle instructions
        instructions.addEventListener('click', function() {
            instructions.classList.toggle('collapsed');
        });
        
        // Add hover effects
        instructions.addEventListener('mouseenter', function() {
            instructions.style.transform = 'translateX(-50%) scale(1.02)';
        });
        
        instructions.addEventListener('mouseleave', function() {
            instructions.style.transform = 'translateX(-50%) scale(1)';
        });
    }
    
    console.log('✅ Gesture instructions initialized');
}

// Initialize global playback controls
function initializeGlobalPlaybackControls() {
    const globalPlayBtn = document.getElementById('globalPlayBtn');
    const globalPauseBtn = document.getElementById('globalPauseBtn');
    
    if (globalPlayBtn) {
        globalPlayBtn.addEventListener('click', playBothDecks);
    }
    
    if (globalPauseBtn) {
        globalPauseBtn.addEventListener('click', pauseBothDecks);
    }
    
    // Initialize crossfader
    const crossfader = document.getElementById('crossfader');
    if (crossfader) {
        crossfader.addEventListener('input', function(e) {
            setCrossfader(e.target.value);
            updateCrossfaderVisual(e.target.value);
        });
    }
    
    console.log('✅ Global playback controls initialized');
}

// Load user data
async function loadUserData() {
    console.log('💾 Loading user data...');
    
    try {
        // Load saved playlists
        loadSavedPlaylists();
        
        // Load user preferences (if any)
        loadUserPreferences();
        
        console.log('✅ User data loaded');
        
    } catch (error) {
        console.error('❌ User data loading failed:', error);
        // Continue without user data if it fails
        console.log('⚠️ Continuing without saved user data');
    }
}

// Load user preferences
function loadUserPreferences() {
    try {
        const preferences = localStorage.getItem('handmixed_preferences');
        if (preferences) {
            const prefs = JSON.parse(preferences);
            
            // Apply gesture sensitivity
            if (prefs.gestureSensitivity) {
                gestureState.recognition.sensitivity = prefs.gestureSensitivity;
            }
            
            // Apply audio preferences
            if (prefs.audioSettings) {
                // Apply audio settings
                Object.assign(separationState.settings, prefs.audioSettings);
            }
            
            console.log('✅ User preferences loaded');
        }
    } catch (error) {
        console.error('❌ Error loading user preferences:', error);
    }
}

// Initialize global controls
function initializeGlobalControls() {
    console.log('🎮 Initializing global controls...');
    
    // Set initial crossfader position
    globalControls.crossfaderPosition = 50;
    
    // Set initial master volume
    globalControls.masterVolume = 0.8;
    
    // Initialize sync settings
    globalControls.syncDecks = false;
    globalControls.playBoth = false;
    
    console.log('✅ Global controls initialized');
}

// Set up event listeners
function setupEventListeners() {
    console.log('👂 Setting up event listeners...');
    
    // Window resize handler
    window.addEventListener('resize', handleWindowResize);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Hand tracking button listeners
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (startBtn) {
        startBtn.addEventListener('click', startHandTracking);
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', stopHandTracking);
    }
    
    // Visibility change handler (pause when tab is hidden)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    console.log('✅ Event listeners set up');
}

// Handle window resize
function handleWindowResize() {
    // Update canvas size if hand tracking is active
    if (appState.isTracking && canvas) {
        setupHighDPICanvas();
    }
    
    // Update deck overlay positions if needed
    updateDeckOverlayPositions();
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(event) {
    // Don't handle shortcuts if user is typing in an input
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch (event.key.toLowerCase()) {
        case ' ':
            // Spacebar: Toggle global playback
            event.preventDefault();
            if (appState.globalPlaybackState === 'playing') {
                pauseBothDecks();
            } else {
                playBothDecks();
            }
            break;
            
        case 'h':
            // H: Toggle hand tracking
            event.preventDefault();
            if (appState.isTracking) {
                stopHandTracking();
            } else {
                startHandTracking();
            }
            break;
            
        case 'm':
            // M: Toggle music hub
            event.preventDefault();
            toggleHubCollapse();
            break;
            
        case 'escape':
            // Escape: Stop everything
            event.preventDefault();
            pauseBothDecks();
            stopHandTracking();
            break;
    }
}

// Handle visibility change
function handleVisibilityChange() {
    if (document.hidden) {
        console.log('🔇 Tab hidden, reducing activity...');
        // Optionally pause music when tab is hidden
        // pauseBothDecks();
    } else {
        console.log('🔊 Tab visible, resuming normal activity...');
    }
}

// Update deck overlay positions (responsive)
function updateDeckOverlayPositions() {
    const leftOverlay = document.getElementById('deckAOverlay');
    const rightOverlay = document.getElementById('deckBOverlay');
    
    if (window.innerWidth < 768) {
        // Mobile: Stack vertically
        if (leftOverlay) {
            leftOverlay.style.position = 'relative';
            leftOverlay.style.left = 'auto';
            leftOverlay.style.top = 'auto';
            leftOverlay.style.margin = '10px auto';
        }
        
        if (rightOverlay) {
            rightOverlay.style.position = 'relative';
            rightOverlay.style.right = 'auto';
            rightOverlay.style.top = 'auto';
            rightOverlay.style.margin = '10px auto';
        }
    } else {
        // Desktop: Side by side
        if (leftOverlay) {
            leftOverlay.style.position = 'absolute';
            leftOverlay.style.left = '20px';
            leftOverlay.style.top = '60px';
            leftOverlay.style.margin = '0';
        }
        
        if (rightOverlay) {
            rightOverlay.style.position = 'absolute';
            rightOverlay.style.right = '20px';
            rightOverlay.style.top = '60px';
            rightOverlay.style.margin = '0';
        }
    }
}

// Initialize hand tracking canvas
async function initializeHandTrackingCanvas() {
    const canvas = document.getElementById('canvas');
    const video = document.getElementById('video');
    
    if (!canvas || !video) {
        console.warn('⚠️ Hand tracking canvas or video not found');
        return;
    }
    
    // Set up canvas for high DPI displays
    const canvasCtx = canvas.getContext('2d');
    if (canvasCtx) {
        console.log('✅ Hand tracking canvas ready');
    }
}

// Load default content
async function loadDefaultContent() {
    console.log('🎵 Loading default content...');
    
    try {
        // Load trending tracks by default
        await loadTrendingTracks();
        
        console.log('✅ Default content loaded');
        
    } catch (error) {
        console.error('❌ Default content loading failed:', error);
        // Show placeholder content
        document.getElementById('tracksContainer').innerHTML = '<div class="loading">🎵 Search for tracks or select a playlist</div>';
    }
}

// Show initialization complete message
function showInitializationComplete() {
    console.log('🎉 Initialization complete!');
    
    // Show a brief welcome message
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'welcome-message';
    welcomeMessage.innerHTML = `
        <div class="welcome-content">
            <h2>🎵 HandMixed Pro Ready!</h2>
            <p>Multi-channel DJ studio with advanced hand gesture controls</p>
            <div class="welcome-features">
                <span>🖐️ Hand Gestures</span>
                <span>🎚️ Multi-Channel Audio</span>
                <span>🌊 Advanced Waveforms</span>
                <span>🎵 Audius Integration</span>
            </div>
        </div>
    `;
    
    // Add welcome message styles
    const style = document.createElement('style');
    style.textContent = `
        .welcome-message {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(26, 26, 26, 0.95));
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 30px;
            text-align: center;
            border: 2px solid rgba(0, 212, 255, 0.4);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
            z-index: 9999;
            animation: welcomeSlideIn 0.5s ease-out;
        }
        
        @keyframes welcomeSlideIn {
            from { opacity: 0; transform: translate(-50%, -60%); }
            to { opacity: 1; transform: translate(-50%, -50%); }
        }
        
        .welcome-content h2 {
            color: #00d4ff;
            font-family: 'Orbitron', monospace;
            margin-bottom: 10px;
        }
        
        .welcome-content p {
            color: #e0e0e0;
            margin-bottom: 20px;
        }
        
        .welcome-features {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .welcome-features span {
            background: rgba(0, 212, 255, 0.1);
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.8rem;
            color: #00d4ff;
            border: 1px solid rgba(0, 212, 255, 0.3);
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(welcomeMessage);
    
    // Auto-hide welcome message after 3 seconds
    setTimeout(() => {
        welcomeMessage.style.animation = 'welcomeSlideIn 0.5s ease-out reverse';
        setTimeout(() => {
            welcomeMessage.remove();
            style.remove();
        }, 500);
    }, 3000);
}

// Show initialization error
function showInitializationError(error) {
    console.error('💥 Initialization Error:', error);
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.innerHTML = `
        <div class="error-content">
            <h2>❌ Initialization Failed</h2>
            <p>There was an error starting HandMixed Pro:</p>
            <code>${error.message}</code>
            <button onclick="location.reload()">🔄 Reload Page</button>
        </div>
    `;
    
    document.body.appendChild(errorMessage);
}

// Export initialization functions for testing
window.initializeAudioSystems = initializeAudioSystems;
window.initializeVisualization = initializeVisualization;
window.initializeGestureSystem = initializeGestureSystem;

console.log('✅ Multi-Channel Initialization System Ready');
console.log('🎛️ Professional DJ studio initialization complete');
console.log('🖐️ Advanced gesture controls ready');
console.log('🎵 Multi-channel audio processing ready');