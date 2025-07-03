// static/js/core/app-state.js - Updated with Multi-Channel Support

console.log('🎛️ HandMixed Pro - Multi-Channel Edition with Advanced Gestures Loading...');

// Global State
const appState = {
    isTracking: false,
    selectedDeck: null,
    currentTracks: [],
    searchQuery: '',
    audioContext: null,
    masterGain: null,
    currentPlaylist: null,
    globalPlaybackState: 'stopped' // 'stopped', 'playing', 'paused'
};

// Enhanced hand tracking state with gesture detection
const handState = {
    leftHand: {
        detected: false,
        y: 0,
        landmarks: null,
        controlling: false,
        volume: 0,
        gestures: {
            thumbIndex: false,
            thumbMiddle: false,
            thumbRing: false,
            thumbPinky: false
        },
        lastGesture: null,
        gestureStartTime: null
    },
    rightHand: {
        detected: false,
        y: 0,
        landmarks: null,
        controlling: false,
        volume: 0,
        gestures: {
            thumbIndex: false,
            thumbMiddle: false,
            thumbRing: false,
            thumbPinky: false
        },
        lastGesture: null,
        gestureStartTime: null
    }
};

// MediaPipe components
let hands, camera, video, canvas, canvasCtx;

// Playlist state
const playlistState = {
    playlists: [],
    activePlaylist: null,
    nextPlaylistId: 1
};

// Enhanced Deck State with Multi-Channel Support
const deckState = {
    A: {
        // Basic deck properties
        player: null,
        track: null,
        volume: 0.7,
        handVolume: 0.7,
        isPlaying: false,
        isPaused: false,
        isFinished: false,
        trackEndListener: null,
        handControlled: false,
        
        // Audio elements
        audio: null,
        gain: null,
        
        // Multi-channel audio properties
        audioChannels: {
            bass: { enabled: true, volume: 1.0, solo: false, mute: false },
            drums: { enabled: true, volume: 1.0, solo: false, mute: false },
            synth: { enabled: true, volume: 1.0, solo: false, mute: false }
        },
        separatedBuffers: null,
        multiChannelPlayer: null,
        
        // Waveform visualization
        wavesurfer: null,  // Single waveform (fallback)
        wavesurfers: {     // Multi-channel waveforms
            bass: null,
            drums: null,
            synth: null
        },
        
        // BPM and sync properties
        bpm: null,
        bpmDetecting: false,
        originalBPM: null,
        currentPlaybackRate: 1.0,
        isSynced: false,
        
        // Legacy properties
        isLoadedFromQueue: false
    },
    B: {
        // Basic deck properties
        player: null,
        track: null,
        volume: 0.7,
        handVolume: 0.7,
        isPlaying: false,
        isPaused: false,
        isFinished: false,
        trackEndListener: null,
        handControlled: false,
        
        // Audio elements
        audio: null,
        gain: null,
        
        // Multi-channel audio properties
        audioChannels: {
            bass: { enabled: true, volume: 1.0, solo: false, mute: false },
            drums: { enabled: true, volume: 1.0, solo: false, mute: false },
            synth: { enabled: true, volume: 1.0, solo: false, mute: false }
        },
        separatedBuffers: null,
        multiChannelPlayer: null,
        
        // Waveform visualization
        wavesurfer: null,  // Single waveform (fallback)
        wavesurfers: {     // Multi-channel waveforms
            bass: null,
            drums: null,
            synth: null
        },
        
        // BPM and sync properties
        bpm: null,
        bpmDetecting: false,
        originalBPM: null,
        currentPlaybackRate: 1.0,
        isSynced: false,
        
        // Legacy properties
        isLoadedFromQueue: false
    }
};

// Enhanced BPM Detection State
const bpmState = {
    isAnalyzing: false,
    detectionQueue: [],
    lastDetectionTime: null,
    detectionCache: new Map(),
    syncThreshold: 5,
    autoSyncEnabled: false,
    
    // Multi-channel BPM analysis
    channelBPM: {
        A: { bass: null, drums: null, synth: null },
        B: { bass: null, drums: null, synth: null }
    }
};

// Audio Source Separation State
const separationState = {
    isProcessing: false,
    processingQueue: [],
    lastProcessedTrack: null,
    separationMethod: 'frequency', // 'frequency' or 'ml'
    
    // Separation settings
    settings: {
        bassRange: { low: 20, high: 250 },
        drumsRange: { low: 200, high: 5000 },
        synthRange: { low: 800, high: 20000 }
    }
};

// Gesture Recognition State
const gestureState = {
    recognition: {
        enabled: true,
        sensitivity: 0.05,
        cooldownMs: 200
    },
    
    // Gesture mapping to functions
    gestureMapping: {
        thumbIndex: 'toggleBassChannel',
        thumbMiddle: 'toggleDrumsChannel',
        thumbRing: 'toggleSynthChannel',
        thumbPinky: 'toggleAllChannels'
    },
    
    // Gesture history for pattern recognition
    gestureHistory: [],
    maxHistoryLength: 50
};

// Hand connections for MediaPipe
const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],          // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],          // Index finger
    [0, 9], [9, 10], [10, 11], [11, 12],     // Middle finger
    [0, 13], [13, 14], [14, 15], [15, 16],   // Ring finger
    [0, 17], [17, 18], [18, 19], [19, 20],   // Pinky
    [5, 9], [9, 13], [13, 17]                // Palm connections
];

// Enhanced BPM Configuration
const BPM_CONFIG = {
    minBPM: 60,
    maxBPM: 200,
    analysisLength: 30,
    cacheExpiry: 1000 * 60 * 60,
    quickAnalysisLength: 15,
    
    // Multi-channel BPM analysis
    channelAnalysis: {
        enabled: true,
        bassWeight: 0.4,
        drumsWeight: 0.4,
        synthWeight: 0.2
    }
};

// Audio Context Configuration
const AUDIO_CONFIG = {
    sampleRate: 44100,
    bufferSize: 2048,
    
    // Multi-channel processing
    channels: {
        bass: { color: '#ff6b6b', label: 'Bass/Kick' },
        drums: { color: '#f39c12', label: 'Drums/Percussion' },
        synth: { color: '#00d4ff', label: 'Synth/Melody' }
    },
    
    // Frequency separation ranges
    frequencyRanges: {
        bass: { low: 20, high: 250 },
        drums: { low: 200, high: 5000 },
        synth: { low: 800, high: 20000 }
    }
};

// Global playback controls
const globalControls = {
    playBoth: false,
    syncDecks: false,
    crossfaderPosition: 50,
    masterVolume: 0.8
};

// Enhanced Utility Functions

// BPM Management
function cacheBPMResult(trackId, bpm, channel = null) {
    const key = channel ? `${trackId}_${channel}` : trackId;
    bmpState.detectionCache.set(key, {
        bpm: bpm,
        channel: channel,
        timestamp: Date.now()
    });
    
    console.log(`💾 Cached BPM result: ${key} = ${bpm} BPM`);
}

function getCachedBPM(trackId, channel = null) {
    const key = channel ? `${trackId}_${channel}` : trackId;
    const cached = bmpState.detectionCache.get(key);
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > BPM_CONFIG.cacheExpiry) {
        bmpState.detectionCache.delete(key);
        return null;
    }
    
    return cached.bpm;
}

// Multi-Channel Management
function getChannelState(deckLetter, channel) {
    const deck = deckState[deckLetter];
    if (!deck.audioChannels || !deck.audioChannels[channel]) {
        return null;
    }
    return deck.audioChannels[channel];
}

function setChannelState(deckLetter, channel, property, value) {
    const deck = deckState[deckLetter];
    if (!deck.audioChannels || !deck.audioChannels[channel]) {
        return false;
    }
    
    deck.audioChannels[channel][property] = value;
    
    // Update audio if playing
    if (deck.multiChannelPlayer && deck.isPlaying) {
        updateDeckVolume(deckLetter);
    }
    
    // Update visual indicators
    updateChannelIndicators(deckLetter);
    
    return true;
}

// Deck State Management
function getDeckState(deckLetter) {
    return deckState[deckLetter];
}

function setBothDecksState(property, value) {
    deckState.A[property] = value;
    deckState.B[property] = value;
}

function areBothDecksReady() {
    return deckState.A.track && deckState.B.track;
}

function areBothDecksPlaying() {
    return deckState.A.isPlaying && deckState.B.isPlaying;
}

// Global Playback State
function updateGlobalPlaybackState() {
    if (areBothDecksPlaying()) {
        appState.globalPlaybackState = 'playing';
    } else if (deckState.A.isPlaying || deckState.B.isPlaying) {
        appState.globalPlaybackState = 'playing';
    } else {
        appState.globalPlaybackState = 'stopped';
    }
    
    // Update UI
    updateGlobalPlaybackUI();
}

function updateGlobalPlaybackUI() {
    const globalPlayBtn = document.getElementById('globalPlayBtn');
    const globalPauseBtn = document.getElementById('globalPauseBtn');
    
    if (globalPlayBtn && globalPauseBtn) {
        if (appState.globalPlaybackState === 'playing') {
            globalPlayBtn.style.display = 'none';
            globalPauseBtn.style.display = 'block';
        } else {
            globalPlayBtn.style.display = 'block';
            globalPauseBtn.style.display = 'none';
        }
    }
}

// Enhanced BPM Sync Functions
function areDecksInSync() {
    if (!deckState.A.bpm || !deckState.B.bpm) return false;
    
    const difference = Math.abs(deckState.A.bpm - deckState.B.bpm);
    return difference <= bmpState.syncThreshold;
}

function getBPMSyncStatus() {
    if (!deckState.A.bpm || !deckState.B.bpm) {
        return {
            synced: false,
            difference: null,
            status: 'No BPM data available'
        };
    }
    
    const bpmA = deckState.A.bpm;
    const bpmB = deckState.B.bpm;
    const difference = Math.abs(bpmA - bpmB);
    
    let status = '';
    let synced = false;
    
    if (difference <= 1) {
        status = 'Perfect sync';
        synced = true;
    } else if (difference <= 3) {
        status = 'Very close';
        synced = true;
    } else if (difference <= 5) {
        status = 'Close enough';
        synced = false;
    } else {
        status = 'Needs adjustment';
        synced = false;
    }
    
    return {
        synced,
        difference,
        status,
        bpmA,
        bpmB
    };
}

// Gesture History Management
function addGestureToHistory(gesture, handSide, timestamp) {
    const entry = {
        gesture,
        handSide,
        timestamp: timestamp || Date.now(),
        deckLetter: handSide === 'leftHand' ? 'A' : 'B'
    };
    
    gestureState.gestureHistory.push(entry);
    
    // Keep history within limits
    if (gestureState.gestureHistory.length > gestureState.maxHistoryLength) {
        gestureState.gestureHistory.shift();
    }
}

function getRecentGestures(timeWindowMs = 5000) {
    const now = Date.now();
    return gestureState.gestureHistory.filter(entry => 
        now - entry.timestamp <= timeWindowMs
    );
}

// Audio Separation State Management
function setSeparationProcessing(deckLetter, isProcessing) {
    separationState.isProcessing = isProcessing;
    
    if (isProcessing) {
        separationState.processingQueue.push(deckLetter);
    } else {
        const index = separationState.processingQueue.indexOf(deckLetter);
        if (index !== -1) {
            separationState.processingQueue.splice(index, 1);
        }
    }
}

function isSeparationProcessing(deckLetter = null) {
    if (deckLetter) {
        return separationState.processingQueue.includes(deckLetter);
    }
    return separationState.isProcessing;
}

// Cleanup Functions
function cleanupBPMCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, cached] of bmpState.detectionCache.entries()) {
        const age = now - cached.timestamp;
        if (age > BPM_CONFIG.cacheExpiry) {
            bmpState.detectionCache.delete(key);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} expired BPM cache entries`);
    }
}

function cleanupGestureHistory() {
    const cutoffTime = Date.now() - (1000 * 60 * 5); // 5 minutes
    gestureState.gestureHistory = gestureState.gestureHistory.filter(
        entry => entry.timestamp > cutoffTime
    );
}

// Set up periodic cleanup
setInterval(cleanupBPMCache, 1000 * 60 * 10); // Clean BPM cache every 10 minutes
setInterval(cleanupGestureHistory, 1000 * 60 * 2); // Clean gesture history every 2 minutes

// Debug Functions
function debugState() {
    console.log('🔍 Current App State:');
    console.log('- Global:', appState);
    console.log('- Deck A:', deckState.A);
    console.log('- Deck B:', deckState.B);
    console.log('- Hand State:', handState);
    console.log('- Gesture State:', gestureState);
    console.log('- BPM State:', bmpState);
    console.log('- Separation State:', separationState);
}

// Export debug function to global scope
window.debugState = debugState;

console.log('✅ Multi-Channel App State Initialized');
console.log('🎚️ Multi-channel audio channels ready');
console.log('🖐️ Enhanced gesture recognition ready');
console.log('🌊 Multi-channel waveforms ready');
console.log('🎵 Professional DJ features loaded!');