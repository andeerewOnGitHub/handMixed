// static/js/core/app-state.js - Global Application State

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

// Deck State with Tone.js integration
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
        handControlled: false
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
        handControlled: false
    }
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