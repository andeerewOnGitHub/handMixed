// static/js/controls/hand-tracking.js - MediaPipe Hand Tracking System

// Initialize MediaPipe Hand Tracking
async function initializeMediaPipe() {
    try {
        console.log('🖐️ Initializing MediaPipe...');
        
        // Get video and canvas elements
        video = document.getElementById('video');
        canvas = document.getElementById('canvas');
        canvasCtx = canvas.getContext('2d');

        // Initialize MediaPipe Hands
        hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        // Configure hands detection
        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5
        });

        // Set up results callback
        hands.onResults(onHandResults);

        // Initialize camera
        camera = new Camera(video, {
            onFrame: async () => {
                if (appState.isTracking) {
                    await hands.send({ image: video });
                }
            },
            width: 1280,
            height: 720
        });

        console.log('✅ MediaPipe initialized successfully');
        return true;
        
    } catch (error) {
        console.error('❌ MediaPipe initialization failed:', error);
        updateStatus('Hand tracking initialization failed', 'error');
        return false;
    }
}

// Handle hand detection results
function onHandResults(results) {
    if (!canvasCtx || !canvas) return;

    // Clear canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reset hand states
    handState.leftHand.detected = false;
    handState.rightHand.detected = false;
    handState.leftHand.controlling = false;
    handState.rightHand.controlling = false;

    // Process detected hands
    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i];
            
            // Determine if it's left or right hand
            const isRightHand = handedness.label === 'Right';
            const handSide = isRightHand ? 'rightHand' : 'leftHand';
            
            // Update hand state
            handState[handSide].detected = true;
            handState[handSide].landmarks = landmarks;
            
            // Get hand position (using wrist landmark)
            const wrist = landmarks[0];
            handState[handSide].y = wrist.y;
            
            // Draw hand landmarks and connections
            drawHandLandmarks(landmarks, isRightHand);
            
            // Check if hand is controlling (middle region of screen)
            const handHeight = 1 - wrist.y; // Invert Y (0 at top, 1 at bottom)
            if (handHeight > 0.2 && handHeight < 0.9) {
                handState[handSide].controlling = true;
                processHandControl(handSide, handHeight);
            }
        }
    }

    // Update UI indicators
    updateHandIndicators();
    
    // Process deck control based on hand presence
    processHandDeckControl();
    
    canvasCtx.restore();
}

// Draw hand landmarks with visual effects
function drawHandLandmarks(landmarks, isRightHand) {
    const handColor = isRightHand ? '#00d4ff' : '#f39c12';
    const glowColor = isRightHand ? 'rgba(0, 212, 255, 0.3)' : 'rgba(243, 156, 18, 0.3)';
    
    // Draw connections
    drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
        color: handColor,
        lineWidth: 3
    });
    
    // Draw landmarks with glow effect
    drawLandmarks(canvasCtx, landmarks, {
        color: handColor,
        lineWidth: 2,
        radius: 4,
        fillColor: glowColor
    });

    // Draw hand mask/overlay
    drawHandMask(landmarks, isRightHand);
}

// Draw hand mask overlay
function drawHandMask(landmarks, isRightHand) {
    if (!landmarks || landmarks.length === 0) return;

    const maskColor = isRightHand ? 'rgba(0, 212, 255, 0.2)' : 'rgba(243, 156, 18, 0.2)';
    const borderColor = isRightHand ? '#00d4ff' : '#f39c12';

    // Create a path around the hand
    canvasCtx.beginPath();
    canvasCtx.fillStyle = maskColor;
    canvasCtx.strokeStyle = borderColor;
    canvasCtx.lineWidth = 2;

    // Get hand bounds
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    landmarks.forEach(landmark => {
        minX = Math.min(minX, landmark.x);
        maxX = Math.max(maxX, landmark.x);
        minY = Math.min(minY, landmark.y);
        maxY = Math.max(maxY, landmark.y);
    });

    // Expand bounds slightly
    const padding = 0.05;
    minX = Math.max(0, minX - padding);
    maxX = Math.min(1, maxX + padding);
    minY = Math.max(0, minY - padding);
    maxY = Math.min(1, maxY + padding);

    // Draw rounded rectangle as hand mask
    const x = minX * canvas.width;
    const y = minY * canvas.height;
    const width = (maxX - minX) * canvas.width;
    const height = (maxY - minY) * canvas.height;
    const radius = 15;

    canvasCtx.beginPath();
    canvasCtx.moveTo(x + radius, y);
    canvasCtx.lineTo(x + width - radius, y);
    canvasCtx.quadraticCurveTo(x + width, y, x + width, y + radius);
    canvasCtx.lineTo(x + width, y + height - radius);
    canvasCtx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    canvasCtx.lineTo(x + radius, y + height);
    canvasCtx.quadraticCurveTo(x, y + height, x, y + height - radius);
    canvasCtx.lineTo(x, y + radius);
    canvasCtx.quadraticCurveTo(x, y, x + radius, y);
    canvasCtx.closePath();

    canvasCtx.fill();
    canvasCtx.stroke();

    // Add hand label
    canvasCtx.fillStyle = borderColor;
    canvasCtx.font = 'bold 16px Orbitron';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(
        isRightHand ? 'DECK A' : 'DECK B',
        x + width / 2,
        y - 10
    );
}

// Start hand tracking
async function startHandTracking() {
    if (appState.isTracking) return;

    try {
        updateStatus('Initializing hand tracking...', 'info');
        
        // Initialize MediaPipe if not already done
        if (!hands) {
            const success = await initializeMediaPipe();
            if (!success) return;
        }

        // Start camera
        await camera.start();
        
        // Update state
        appState.isTracking = true;
        
        // Update UI
        document.getElementById('video').style.display = 'block';
        document.getElementById('videoPlaceholder').style.display = 'none';
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('stopBtn').style.display = 'block';
        document.getElementById('videoContainer').classList.add('hand-tracking');
        
        console.log('✅ Hand tracking started');
        updateStatus('Hand tracking active - Move your hands to control the decks!', 'success');
        
    } catch (error) {
        console.error('❌ Failed to start hand tracking:', error);
        updateStatus('Failed to start hand tracking: ' + error.message, 'error');
    }
}

// Stop hand tracking
function stopHandTracking() {
    if (!appState.isTracking) return;

    try {
        // Stop camera
        if (camera) {
            camera.stop();
        }
        
        // Update state
        appState.isTracking = false;
        
        // Reset hand states
        handState.leftHand.detected = false;
        handState.rightHand.detected = false;
        handState.leftHand.controlling = false;
        handState.rightHand.controlling = false;
        
        // Reset deck hand control
        deckState.A.handControlled = false;
        deckState.B.handControlled = false;
        
        // Update UI
        document.getElementById('video').style.display = 'none';
        document.getElementById('videoPlaceholder').style.display = 'block';
        document.getElementById('startBtn').style.display = 'block';
        document.getElementById('stopBtn').style.display = 'none';
        document.getElementById('videoContainer').classList.remove('hand-tracking');
        
        // Clear canvas
        if (canvasCtx) {
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // Update indicators
        updateHandIndicators();
        
        // Reset deck overlays
        document.getElementById('deckAOverlay').classList.remove('hand-active');
        document.getElementById('deckBOverlay').classList.remove('hand-active');
        
        // Reset volume indicators
        updateDeckVolumeIndicator('A', deckState.A.volume * 100);
        updateDeckVolumeIndicator('B', deckState.B.volume * 100);
        
        console.log('✅ Hand tracking stopped');
        updateStatus('Hand tracking stopped', 'info');
        
    } catch (error) {
        console.error('❌ Error stopping hand tracking:', error);
        updateStatus('Error stopping hand tracking', 'error');
    }
}

// Helper functions for MediaPipe drawing
function drawConnectors(ctx, landmarks, connections, style) {
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.lineWidth;
    ctx.beginPath();
    
    for (const connection of connections) {
        const from = landmarks[connection[0]];
        const to = landmarks[connection[1]];
        
        ctx.moveTo(from.x * canvas.width, from.y * canvas.height);
        ctx.lineTo(to.x * canvas.width, to.y * canvas.height);
    }
    
    ctx.stroke();
}

function drawLandmarks(ctx, landmarks, style) {
    ctx.fillStyle = style.fillColor || style.color;
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.lineWidth;
    
    for (const landmark of landmarks) {
        ctx.beginPath();
        ctx.arc(
            landmark.x * canvas.width,
            landmark.y * canvas.height,
            style.radius,
            0,
            2 * Math.PI
        );
        ctx.fill();
        ctx.stroke();
    }
}

// Update hand detection indicators
function updateHandIndicators() {
    const leftStatus = document.getElementById('leftHandStatus');
    const rightStatus = document.getElementById('rightHandStatus');

    // Left hand indicator
    if (handState.leftHand.detected) {
        if (handState.leftHand.controlling) {
            leftStatus.className = 'hand-status controlling';
        } else {
            leftStatus.className = 'hand-status detected';
        }
    } else {
        leftStatus.className = 'hand-status';
    }

    // Right hand indicator
    if (handState.rightHand.detected) {
        if (handState.rightHand.controlling) {
            rightStatus.className = 'hand-status controlling';
        } else {
            rightStatus.className = 'hand-status detected';
        }
    } else {
        rightStatus.className = 'hand-status';
    }
}