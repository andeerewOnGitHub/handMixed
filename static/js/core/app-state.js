// static/js/core/app-state.js - Updated with BPM Support

console.log('🎛️ HandMixed Pro - Audius Edition with MediaPipe Loading...');

// Global State
const appState = {
    isTracking: false,
    selectedDeck: null,
    currentTracks: [],
    searchQuery: '',
    audioContext: null,
    masterGain: null,
    currentPlaylist: null
};

// Hand tracking state
const handState = {
    leftHand: {
        detected: false,
        y: 0,
        landmarks: null,
        controlling: false
    },
    rightHand: {
        detected: false,
        y: 0,
        landmarks: null,
        controlling: false
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

// Deck State with Tone.js integration and BPM support
const deckState = {
    A: {
        player: null,
        track: null,
        volume: 0.7,
        handVolume: 0.7,
        isPlaying: false,
        isPaused: false,
        wavesurfer: null,
        gain: null,
        audio: null,
        isLoadedFromQueue: false,
        isFinished: false,
        trackEndListener: null,
        handControlled: false,
        // BPM-related properties
        bpm: null,
        bpmDetecting: false,
        originalBPM: null, // Store original detected BPM
        currentPlaybackRate: 1.0, // For tempo adjustment
        isSynced: false
    },
    B: {
        player: null,
        track: null,
        volume: 0.7,
        handVolume: 0.7,
        isPlaying: false,
        isPaused: false,
        wavesurfer: null,
        gain: null,
        audio: null,
        isLoadedFromQueue: false,
        isFinished: false,
        trackEndListener: null,
        handControlled: false,
        // BPM-related properties
        bpm: null,
        bpmDetecting: false,
        originalBPM: null, // Store original detected BPM
        currentPlaybackRate: 1.0, // For tempo adjustment
        isSynced: false
    }
};

// BPM Detection State
const bpmState = {
    isAnalyzing: false,
    detectionQueue: [],
    lastDetectionTime: null,
    detectionCache: new Map(), // Cache BPM results by track ID
    syncThreshold: 5, // BPM difference threshold for sync indication
    autoSyncEnabled: false
};

// Hand connections for MediaPipe
const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],  // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],  // Index finger
    [0, 9], [9, 10], [10, 11], [11, 12],  // Middle finger
    [0, 13], [13, 14], [14, 15], [15, 16],  // Ring finger
    [0, 17], [17, 18], [18, 19], [19, 20],  // Pinky
    [5, 9], [9, 13], [13, 17]  // Palm connections
];

// BPM Detection Configuration
const BPM_CONFIG = {
    minBPM: 60,
    maxBPM: 200,
    analysisLength: 30, // seconds to analyze for BPM
    cacheExpiry: 1000 * 60 * 60, // 1 hour cache expiry
    quickAnalysisLength: 15 // seconds for quick BPM estimate
};

// Utility functions for BPM management

// Cache BPM result
function cacheBPMResult(trackId, bpm) {
    bpmState.detectionCache.set(trackId, {
        bpm: bpm,
        timestamp: Date.now()
    });
    
    console.log(`💾 Cached BPM result: ${trackId} = ${bpm} BPM`);
}

// Get cached BPM result
function getCachedBPM(trackId) {
    const cached = bpmState.detectionCache.get(trackId);
    
    if (!cached) return null;
    
    // Check if cache is still valid
    const age = Date.now() - cached.timestamp;
    if (age > BPM_CONFIG.cacheExpiry) {
        bpmState.detectionCache.delete(trackId);
        return null;
    }
    
    console.log(`📋 Using cached BPM: ${trackId} = ${cached.bpm} BPM`);
    return cached.bpm;
}

// Check if decks are BPM synced
function areDecksInSync() {
    if (!deckState.A.bpm || !deckState.B.bpm) return false;
    
    const difference = Math.abs(deckState.A.bpm - deckState.B.bpm);
    return difference <= bpmState.syncThreshold;
}

// Get BPM sync status
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
    const percentDiff = (difference / Math.min(bpmA, bpmB)) * 100;
    
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
    } else if (difference <= 10) {
        status = 'Needs adjustment';
        synced = false;
    } else {
        status = 'Major mismatch';
        synced = false;
    }
    
    return {
        synced,
        difference,
        percentDiff,
        status,
        bpmA,
        bpmB
    };
}

// Clean up BPM cache periodically
function cleanupBPMCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [trackId, cached] of bpmState.detectionCache.entries()) {
        const age = now - cached.timestamp;
        if (age > BPM_CONFIG.cacheExpiry) {
            bmpState.detectionCache.delete(trackId);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} expired BPM cache entries`);
    }
}

// Set up periodic cache cleanup
setInterval(cleanupBPMCache, 1000 * 60 * 10); // Clean every 10 minutes