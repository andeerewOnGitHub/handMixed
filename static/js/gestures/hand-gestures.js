// static/js/gestures/hand-gestures.js - ENHANCED VERSION with Finger Detection

console.log('🎵 Enhanced Hand Gestures Loaded - Multi-Channel DJ Control');

// Finger landmark indices for MediaPipe
const FINGER_LANDMARKS = {
    THUMB_TIP: 4,
    THUMB_IP: 3,
    INDEX_FINGER_TIP: 8,
    INDEX_FINGER_PIP: 6,
    MIDDLE_FINGER_TIP: 12,
    MIDDLE_FINGER_PIP: 10,
    RING_FINGER_TIP: 16,
    RING_FINGER_PIP: 14,
    PINKY_TIP: 20,
    PINKY_PIP: 18,
    WRIST: 0
};

// Enhanced gesture state
const gestureState = {
    leftHand: {
        volume: 0,
        fingerGestures: {
            thumbIndex: false,
            thumbMiddle: false,
            thumbRing: false,
            thumbPinky: false
        },
        lastGesture: null,
        gestureStartTime: null
    },
    rightHand: {
        volume: 0,
        fingerGestures: {
            thumbIndex: false,
            thumbMiddle: false,
            thumbRing: false,
            thumbPinky: false
        },
        lastGesture: null,
        gestureStartTime: null
    }
};

// Process enhanced hand control with finger gestures
function processHandControl(handSide, handHeight) {
    const deckLetter = handSide === 'leftHand' ? 'A' : 'B';
    const deck = deckState[deckLetter];
    const hand = handState[handSide];
    
    if (!hand.landmarks) return;
    
    // Calculate volume based on hand center position (palm center)
    const handCenter = calculateHandCenter(hand.landmarks);
    const volume = calculateVolumeFromPosition(handCenter.y);
    
    // Update volume
    deck.handVolume = volume;
    deck.handControlled = true;
    gestureState[handSide].volume = volume;
    
    // Apply volume to audio
    if (deck.audio && deck.track) {
        const finalVolume = deck.volume * volume;
        deck.audio.volume = finalVolume;
        console.log(`🔊 Deck ${deckLetter} volume: ${Math.round(finalVolume * 100)}%`);
    }
    
    // Detect finger gestures
    detectFingerGestures(handSide, hand.landmarks);
    
    // Update visual indicator
    updateDeckVolumeIndicator(deckLetter, volume * 100);
    
    // Update gesture status
    updateGestureStatus(handSide, deckLetter);
}

// Calculate hand center (palm center) from landmarks
function calculateHandCenter(landmarks) {
    if (!landmarks || landmarks.length < 21) return { x: 0.5, y: 0.5 };
    
    // Use palm landmarks to calculate center
    const palmLandmarks = [
        landmarks[FINGER_LANDMARKS.WRIST],
        landmarks[5],  // Index finger MCP
        landmarks[9],  // Middle finger MCP
        landmarks[13], // Ring finger MCP
        landmarks[17]  // Pinky MCP
    ];
    
    let sumX = 0, sumY = 0;
    palmLandmarks.forEach(landmark => {
        sumX += landmark.x;
        sumY += landmark.y;
    });
    
    return {
        x: sumX / palmLandmarks.length,
        y: sumY / palmLandmarks.length
    };
}

// Calculate volume from hand position (0 = bottom, 1 = top)
function calculateVolumeFromPosition(yPosition) {
    // Invert Y coordinate (MediaPipe Y increases downward)
    // Top of screen (y=0) = max volume (1.0)
    // Bottom of screen (y=1) = min volume (0.0)
    const volume = Math.max(0, Math.min(1, 1 - yPosition));
    
    // Add some smoothing/dead zones
    if (volume < 0.05) return 0;
    if (volume > 0.95) return 1;
    
    return volume;
}

// Detect finger-thumb connections
function detectFingerGestures(handSide, landmarks) {
    const thumbTip = landmarks[FINGER_LANDMARKS.THUMB_TIP];
    const indexTip = landmarks[FINGER_LANDMARKS.INDEX_FINGER_TIP];
    const middleTip = landmarks[FINGER_LANDMARKS.MIDDLE_FINGER_TIP];
    const ringTip = landmarks[FINGER_LANDMARKS.RING_FINGER_TIP];
    const pinkyTip = landmarks[FINGER_LANDMARKS.PINKY_TIP];
    
    const gestureThreshold = 0.05; // Distance threshold for finger connection
    
    // Check thumb-index connection
    const thumbIndexDistance = calculateDistance(thumbTip, indexTip);
    const thumbIndexConnected = thumbIndexDistance < gestureThreshold;
    
    // Check thumb-middle connection
    const thumbMiddleDistance = calculateDistance(thumbTip, middleTip);
    const thumbMiddleConnected = thumbMiddleDistance < gestureThreshold;
    
    // Check thumb-ring connection
    const thumbRingDistance = calculateDistance(thumbTip, ringTip);
    const thumbRingConnected = thumbRingDistance < gestureThreshold;
    
    // Check thumb-pinky connection
    const thumbPinkyDistance = calculateDistance(thumbTip, pinkyTip);
    const thumbPinkyConnected = thumbPinkyDistance < gestureThreshold;
    
    // Update gesture state
    const gestures = gestureState[handSide].fingerGestures;
    const previousGestures = { ...gestures };
    
    gestures.thumbIndex = thumbIndexConnected;
    gestures.thumbMiddle = thumbMiddleConnected;
    gestures.thumbRing = thumbRingConnected;
    gestures.thumbPinky = thumbPinkyConnected;
    
    // Detect new gestures and trigger functions
    if (thumbIndexConnected && !previousGestures.thumbIndex) {
        onThumbIndexGesture(handSide);
    }
    if (thumbMiddleConnected && !previousGestures.thumbMiddle) {
        onThumbMiddleGesture(handSide);
    }
    if (thumbRingConnected && !previousGestures.thumbRing) {
        onThumbRingGesture(handSide);
    }
    if (thumbPinkyConnected && !previousGestures.thumbPinky) {
        onThumbPinkyGesture(handSide);
    }
}

// Calculate distance between two landmarks
function calculateDistance(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = (point1.z || 0) - (point2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// PLACEHOLDER FUNCTIONS for finger gestures
// These can be customized for different DJ functions

function onThumbIndexGesture(handSide) {
    const deckLetter = handSide === 'leftHand' ? 'A' : 'B';
    console.log(`👆 Thumb-Index gesture detected on ${handSide} (Deck ${deckLetter})`);
    
    // PLACEHOLDER: Bass/Kick channel control
    toggleAudioChannel(deckLetter, 'bass');
    updateStatus(`Deck ${deckLetter}: Bass/Kick channel toggled`, 'info');
}

function onThumbMiddleGesture(handSide) {
    const deckLetter = handSide === 'leftHand' ? 'A' : 'B';
    console.log(`🖕 Thumb-Middle gesture detected on ${handSide} (Deck ${deckLetter})`);
    
    // PLACEHOLDER: Drums/Percussion channel control
    toggleAudioChannel(deckLetter, 'drums');
    updateStatus(`Deck ${deckLetter}: Drums/Percussion channel toggled`, 'info');
}

function onThumbRingGesture(handSide) {
    const deckLetter = handSide === 'leftHand' ? 'A' : 'B';
    console.log(`💍 Thumb-Ring gesture detected on ${handSide} (Deck ${deckLetter})`);
    
    // PLACEHOLDER: Synth/Melody channel control
    toggleAudioChannel(deckLetter, 'synth');
    updateStatus(`Deck ${deckLetter}: Synth/Melody channel toggled`, 'info');
}

function onThumbPinkyGesture(handSide) {
    const deckLetter = handSide === 'leftHand' ? 'A' : 'B';
    console.log(`🤙 Thumb-Pinky gesture detected on ${handSide} (Deck ${deckLetter})`);
    
    // PLACEHOLDER: Master/All channels control
    toggleAllAudioChannels(deckLetter);
    updateStatus(`Deck ${deckLetter}: All channels toggled`, 'info');
}

// Audio channel control functions (placeholders)
function toggleAudioChannel(deckLetter, channelType) {
    const deck = deckState[deckLetter];
    if (!deck.audioChannels) {
        deck.audioChannels = {
            bass: { enabled: true, volume: 1.0 },
            drums: { enabled: true, volume: 1.0 },
            synth: { enabled: true, volume: 1.0 }
        };
    }
    
    const channel = deck.audioChannels[channelType];
    if (channel) {
        channel.enabled = !channel.enabled;
        console.log(`🎚️ Deck ${deckLetter} ${channelType} channel: ${channel.enabled ? 'ON' : 'OFF'}`);
        
        // Apply channel settings to audio
        updateAudioChannelSettings(deckLetter);
    }
}

function toggleAllAudioChannels(deckLetter) {
    const deck = deckState[deckLetter];
    if (!deck.audioChannels) return;
    
    // Check if all channels are enabled
    const allEnabled = Object.values(deck.audioChannels).every(ch => ch.enabled);
    
    // Toggle all channels
    Object.values(deck.audioChannels).forEach(channel => {
        channel.enabled = !allEnabled;
    });
    
    console.log(`🎚️ Deck ${deckLetter} all channels: ${!allEnabled ? 'ON' : 'OFF'}`);
    updateAudioChannelSettings(deckLetter);
}

function updateAudioChannelSettings(deckLetter) {
    const deck = deckState[deckLetter];
    if (!deck.audio || !deck.audioChannels) return;
    
    // Calculate overall volume based on enabled channels
    const enabledChannels = Object.values(deck.audioChannels).filter(ch => ch.enabled);
    const channelVolume = enabledChannels.length > 0 ? 
        enabledChannels.reduce((sum, ch) => sum + ch.volume, 0) / enabledChannels.length : 0;
    
    // Apply volume with hand control
    const finalVolume = deck.volume * deck.handVolume * channelVolume;
    if (deck.audio) {
        deck.audio.volume = finalVolume;
    }
    
    // Update visual indicators
    updateChannelIndicators(deckLetter);
}

function updateChannelIndicators(deckLetter) {
    const deck = deckState[deckLetter];
    if (!deck.audioChannels) return;
    
    // Update channel status in UI (if elements exist)
    const bassIndicator = document.getElementById(`deck${deckLetter}BassChannel`);
    const drumsIndicator = document.getElementById(`deck${deckLetter}DrumsChannel`);
    const synthIndicator = document.getElementById(`deck${deckLetter}SynthChannel`);
    
    if (bassIndicator) {
        bassIndicator.classList.toggle('active', deck.audioChannels.bass.enabled);
    }
    if (drumsIndicator) {
        drumsIndicator.classList.toggle('active', deck.audioChannels.drums.enabled);
    }
    if (synthIndicator) {
        synthIndicator.classList.toggle('active', deck.audioChannels.synth.enabled);
    }
}

// Enhanced deck control - START BOTH DECKS SIMULTANEOUSLY
function processHandDeckControl() {
    const leftHandDetected = handState.leftHand.detected && handState.leftHand.controlling;
    const rightHandDetected = handState.rightHand.detected && handState.rightHand.controlling;
    
    // Deck A (Left Hand)
    if (leftHandDetected) {
        const deck = deckState.A;
        document.getElementById('deckAOverlay').classList.add('hand-active');
        
        // Only set volume, don't auto-play individual decks
        if (deck.handControlled && deck.audio) {
            const finalVolume = deck.volume * deck.handVolume;
            deck.audio.volume = finalVolume;
        }
        
    } else {
        // Hand gone - mute but don't pause
        const deck = deckState.A;
        if (deck.handControlled && deck.audio) {
            deck.audio.volume = 0;
        }
        deck.handControlled = false;
        document.getElementById('deckAOverlay').classList.remove('hand-active');
    }

    // Deck B (Right Hand)
    if (rightHandDetected) {
        const deck = deckState.B;
        document.getElementById('deckBOverlay').classList.add('hand-active');
        
        // Only set volume, don't auto-play individual decks
        if (deck.handControlled && deck.audio) {
            const finalVolume = deck.volume * deck.handVolume;
            deck.audio.volume = finalVolume;
        }
        
    } else {
        // Hand gone - mute but don't pause
        const deck = deckState.B;
        if (deck.handControlled && deck.audio) {
            deck.audio.volume = 0;
        }
        deck.handControlled = false;
        document.getElementById('deckBOverlay').classList.remove('hand-active');
    }
}

// Update gesture status display
function updateGestureStatus(handSide, deckLetter) {
    const gestures = gestureState[handSide].fingerGestures;
    const volume = Math.round(gestureState[handSide].volume * 100);
    
    let gestureStatus = [];
    if (gestures.thumbIndex) gestureStatus.push('👆');
    if (gestures.thumbMiddle) gestureStatus.push('🖕');
    if (gestures.thumbRing) gestureStatus.push('💍');
    if (gestures.thumbPinky) gestureStatus.push('🤙');
    
    const statusText = gestureStatus.length > 0 ? 
        `${gestureStatus.join(' ')} ${volume}%` : 
        `${volume}%`;
    
    console.log(`🎚️ Deck ${deckLetter} gestures: ${statusText}`);
}

// Global play function for both decks
function playBothDecks() {
    console.log('🎵 Starting both decks simultaneously');
    
    const deckAHasTrack = deckState.A.track && deckState.A.audio;
    const deckBHasTrack = deckState.B.track && deckState.B.audio;
    
    if (!deckAHasTrack && !deckBHasTrack) {
        updateStatus('No tracks loaded in either deck', 'error');
        return;
    }
    
    // Start both decks
    const promises = [];
    
    if (deckAHasTrack && !deckState.A.isPlaying) {
        promises.push(playDeck('A'));
    }
    
    if (deckBHasTrack && !deckState.B.isPlaying) {
        promises.push(playDeck('B'));
    }
    
    if (promises.length === 0) {
        updateStatus('Both decks already playing', 'info');
        return;
    }
    
    // Update UI
    const globalPlayBtn = document.getElementById('globalPlayBtn');
    const globalPauseBtn = document.getElementById('globalPauseBtn');
    
    if (globalPlayBtn) globalPlayBtn.style.display = 'none';
    if (globalPauseBtn) globalPauseBtn.style.display = 'block';
    
    updateStatus('Both decks playing - Use hand gestures to control!', 'success');
}

// Global pause function for both decks
function pauseBothDecks() {
    console.log('⏸️ Pausing both decks');
    
    if (deckState.A.isPlaying) pauseDeck('A');
    if (deckState.B.isPlaying) pauseDeck('B');
    
    // Update UI
    const globalPlayBtn = document.getElementById('globalPlayBtn');
    const globalPauseBtn = document.getElementById('globalPauseBtn');
    
    if (globalPlayBtn) globalPlayBtn.style.display = 'block';
    if (globalPauseBtn) globalPauseBtn.style.display = 'none';
    
    updateStatus('Both decks paused', 'info');
}

// Initialize enhanced audio channels for both decks
function initializeAudioChannels() {
    ['A', 'B'].forEach(deckLetter => {
        const deck = deckState[deckLetter];
        deck.audioChannels = {
            bass: { enabled: true, volume: 1.0 },
            drums: { enabled: true, volume: 1.0 },
            synth: { enabled: true, volume: 1.0 }
        };
    });
    
    console.log('🎚️ Audio channels initialized for both decks');
}

// Call initialization
initializeAudioChannels();

console.log('🎛️ Enhanced hand control with multi-channel audio loaded!');