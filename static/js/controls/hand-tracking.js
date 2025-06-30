// static/js/controls/hand-tracking.js - MediaPipe Hand Tracking System (Camera Flip Corrected)

// Check MediaPipe dependencies on load
function checkMediaPipeDependencies() {
    const requiredClasses = ['Hands', 'Camera', 'drawConnectors', 'drawLandmarks', 'HAND_CONNECTIONS'];
    const missing = [];
    
    if (typeof Hands === 'undefined') missing.push('Hands');
    if (typeof Camera === 'undefined') missing.push('Camera');
    if (typeof drawConnectors === 'undefined') missing.push('drawConnectors');
    if (typeof drawLandmarks === 'undefined') missing.push('drawLandmarks');
    if (typeof HAND_CONNECTIONS === 'undefined') missing.push('HAND_CONNECTIONS');
    
    if (missing.length > 0) {
        console.error('❌ Missing MediaPipe dependencies:', missing);
        updateStatus(`MediaPipe loading failed: ${missing.join(', ')}`, 'error');
        return false;
    }
    
    console.log('✅ All MediaPipe dependencies loaded');
    return true;
}

// Initialize MediaPipe Hand Tracking
async function initializeMediaPipe() {
    try {
        console.log('🖐️ Initializing MediaPipe...');
        
        // Check dependencies first
        if (!checkMediaPipeDependencies()) {
            throw new Error('MediaPipe dependencies not loaded');
        }
        
        // Get video and canvas elements
        video = document.getElementById('video');
        canvas = document.getElementById('canvas');
        
        if (!video || !canvas) {
            throw new Error('Video or canvas element not found');
        }
        
        canvasCtx = canvas.getContext('2d');
        
        if (!canvasCtx) {
            throw new Error('Unable to get canvas 2D context');
        }

        // Set up high DPI canvas for crisp rendering
        setupHighDPICanvas();

        // Initialize MediaPipe Hands with proper error handling
        hands = new Hands({
            locateFile: (file) => {
                const url = `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                console.log(`📁 Loading MediaPipe file: ${url}`);
                return url;
            }
        });

        // Configure hands detection
        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5
        });

        console.log('⚙️ MediaPipe Hands configured');

        // Set up results callback
        hands.onResults(onHandResults);

        // Initialize camera with error handling
        camera = new Camera(video, {
            onFrame: async () => {
                if (appState.isTracking && hands) {
                    try {
                        await hands.send({ image: video });
                    } catch (frameError) {
                        console.warn('⚠️ Frame processing error:', frameError);
                    }
                }
            },
            width: 1280,
            height: 720
        });

        console.log('📹 Camera initialized');
        console.log('✅ MediaPipe initialized successfully');
        return true;
        
    } catch (error) {
        console.error('❌ MediaPipe initialization failed:', error);
        updateStatus(`Hand tracking failed: ${error.message}`, 'error');
        
        // Show detailed error information
        console.error('MediaPipe Debug Info:');
        console.error('- Video element:', !!video);
        console.error('- Canvas element:', !!canvas);
        console.error('- Hands class available:', typeof Hands !== 'undefined');
        console.error('- Camera class available:', typeof Camera !== 'undefined');
        console.error('- DrawConnectors available:', typeof drawConnectors !== 'undefined');
        
        return false;
    }
}

// Set up high DPI canvas for crisp rendering
function setupHighDPICanvas() {
    try {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        console.log(`📺 Setting up canvas: ${rect.width}x${rect.height}, DPR: ${dpr}`);
        
        // Set the actual canvas size in memory
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        // Scale the canvas back down using CSS
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        // Scale the drawing context to match the device pixel ratio
        canvasCtx.scale(dpr, dpr);
        
        // Enable crisp rendering
        canvasCtx.imageSmoothingEnabled = false;
        canvasCtx.textRendering = 'geometricPrecision';
        
        console.log(`✅ Canvas setup complete: ${canvas.width}x${canvas.height}`);
    } catch (error) {
        console.error('❌ Canvas setup failed:', error);
        throw error;
    }
}

// Handle hand detection results
function onHandResults(results) {
    if (!canvasCtx || !canvas) {
        console.warn('⚠️ Canvas not available for rendering');
        return;
    }

    try {
        // Clear canvas with crisp edges
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set high-quality rendering settings
        canvasCtx.imageSmoothingEnabled = false;
        canvasCtx.lineCap = 'round';
        canvasCtx.lineJoin = 'round';
        
        // Reset hand states
        handState.leftHand.detected = false;
        handState.rightHand.detected = false;
        handState.leftHand.controlling = false;
        handState.rightHand.controlling = false;

        // Process detected hands
        if (results.multiHandLandmarks && results.multiHandedness) {
            console.log(`👐 Detected ${results.multiHandLandmarks.length} hands`);
            
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const landmarks = results.multiHandLandmarks[i];
                const handedness = results.multiHandedness[i];
                
                if (!landmarks || !handedness) continue;
                
                // CORRECTED MAPPING: Account for camera flip
                // MediaPipe sees mirrored view, so we need to flip the mapping
                // MediaPipe "Left" = User's right hand (appears on left of mirrored camera) = Deck B
                // MediaPipe "Right" = User's left hand (appears on right of mirrored camera) = Deck A
                const isUserLeftHand = handedness.label === 'Right'; // Flipped due to camera
                const handSide = isUserLeftHand ? 'leftHand' : 'rightHand';
                
                // Update hand state
                handState[handSide].detected = true;
                handState[handSide].landmarks = landmarks;
                
                // Get hand position (using wrist landmark)
                const wrist = landmarks[0];
                handState[handSide].y = wrist.y;
                
                // Draw hand landmarks and connections
                drawHandLandmarks(landmarks, isUserLeftHand);
                
                // Check if hand is controlling (middle region of screen)
                const handHeight = 1 - wrist.y;
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
        
    } catch (error) {
        console.error('❌ Hand results processing error:', error);
        canvasCtx.restore();
    }
}

// Draw hand landmarks with visual effects
function drawHandLandmarks(landmarks, isUserLeftHand) {
    try {
        // Color based on user's actual hand (not MediaPipe label)
        const handColor = isUserLeftHand ? '#00d4ff' : '#f39c12'; // Left=blue, Right=orange
        const glowColor = isUserLeftHand ? 'rgba(0, 212, 255, 0.3)' : 'rgba(243, 156, 18, 0.3)';
        
        // Draw connections
        if (typeof drawConnectors !== 'undefined' && typeof HAND_CONNECTIONS !== 'undefined') {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
                color: handColor,
                lineWidth: 3
            });
        } else {
            console.warn('⚠️ drawConnectors or HAND_CONNECTIONS not available');
        }
        
        // Draw landmarks with glow effect
        if (typeof drawLandmarks !== 'undefined') {
            drawLandmarks(canvasCtx, landmarks, {
                color: handColor,
                lineWidth: 2,
                radius: 4,
                fillColor: glowColor
            });
        } else {
            console.warn('⚠️ drawLandmarks not available');
        }

        // Draw hand mask/overlay WITH corrected text labels
        drawHandMask(landmarks, isUserLeftHand);
        
    } catch (error) {
        console.error('❌ Drawing error:', error);
    }
}

function drawHandMask(landmarks, isUserLeftHand) {
    if (!landmarks || landmarks.length === 0) return;

    try {
        const maskColor = isUserLeftHand ? 'rgba(0, 212, 255, 0.15)' : 'rgba(243, 156, 18, 0.15)';
        const borderColor = isUserLeftHand ? '#00d4ff' : '#f39c12';

        // Get canvas dimensions
        const rect = canvas.getBoundingClientRect();
        const canvasWidth = rect.width;
        const canvasHeight = rect.height;

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

        // Calculate pixel-aligned coordinates
        const x = Math.round(minX * canvasWidth) + 0.5;
        const y = Math.round(minY * canvasHeight) + 0.5;
        const width = Math.round((maxX - minX) * canvasWidth);
        const height = Math.round((maxY - minY) * canvasHeight);
        const radius = 15;

        // Draw rounded rectangle mask
        canvasCtx.save();
        canvasCtx.fillStyle = maskColor;
        canvasCtx.strokeStyle = borderColor;
        canvasCtx.lineWidth = 2;
        
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
        canvasCtx.restore();

        // Draw deck label text (mirrored to appear correctly in flipped camera)
        const deckLabel = isUserLeftHand ? 'DECK A' : 'DECK B';
        const textX = x + width / 2;
        const textY = y - 10;

        // Save context for text transformation
        canvasCtx.save();

        // Apply horizontal flip to counter the camera's mirroring effect
        canvasCtx.scale(-1, 1);
        
        // Calculate flipped x position (negative because of the scale transform)
        const flippedTextX = -textX;

        // Set text properties
        canvasCtx.font = 'bold 16px Orbitron, monospace';
        canvasCtx.fillStyle = borderColor;
        canvasCtx.strokeStyle = '#000';
        canvasCtx.lineWidth = 3;
        canvasCtx.textAlign = 'center';
        canvasCtx.textBaseline = 'bottom';

        // Draw text with outline (text will appear correctly oriented)
        canvasCtx.strokeText(deckLabel, flippedTextX, textY);
        canvasCtx.fillText(deckLabel, flippedTextX, textY);

        // Restore context to remove the flip transformation
        canvasCtx.restore();
        
    } catch (error) {
        console.error('❌ Hand mask drawing error:', error);
    }
}

// Start hand tracking with improved error handling
async function startHandTracking() {
    if (appState.isTracking) {
        console.log('⚠️ Hand tracking already active');
        return;
    }

    try {
        updateStatus('Initializing hand tracking...', 'info');
        console.log('🚀 Starting hand tracking...');
        
        // Check if running on HTTPS (required for camera access)
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            throw new Error('Camera access requires HTTPS or localhost');
        }
        
        // Initialize MediaPipe if not already done
        if (!hands) {
            const success = await initializeMediaPipe();
            if (!success) {
                throw new Error('MediaPipe initialization failed');
            }
        }

        // Check camera permissions
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop()); // Stop test stream
        
        console.log('📷 Camera permissions granted');

        // Ensure canvas is set up for crisp rendering
        setupHighDPICanvas();

        // Start camera
        console.log('📹 Starting camera...');
        await camera.start();
        
        // Update state
        appState.isTracking = true;
        
        // Update UI
        document.getElementById('video').style.display = 'block';
        document.getElementById('videoPlaceholder').style.display = 'none';
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('stopBtn').style.display = 'block';
        document.getElementById('videoContainer').classList.add('hand-tracking');
        
        console.log('✅ Hand tracking started successfully');
        updateStatus('Hand tracking active - Move your hands to control the decks!', 'success');
        
    } catch (error) {
        console.error('❌ Failed to start hand tracking:', error);
        
        let errorMessage = 'Failed to start hand tracking: ' + error.message;
        
        // Provide specific error messages for common issues
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Camera access denied. Please allow camera permissions.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No camera found. Please connect a camera.';
        } else if (error.name === 'NotSupportedError') {
            errorMessage = 'Camera not supported in this browser.';
        } else if (error.message.includes('HTTPS')) {
            errorMessage = 'Camera requires HTTPS or localhost.';
        }
        
        updateStatus(errorMessage, 'error');
        
        // Reset UI on error
        document.getElementById('video').style.display = 'none';
        document.getElementById('videoPlaceholder').style.display = 'block';
        document.getElementById('startBtn').style.display = 'block';
        document.getElementById('stopBtn').style.display = 'none';
    }
}

// Stop hand tracking
function stopHandTracking() {
    if (!appState.isTracking) {
        console.log('⚠️ Hand tracking not active');
        return;
    }

    try {
        console.log('🛑 Stopping hand tracking...');
        
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

// Update hand detection indicators
function updateHandIndicators() {
    const leftStatus = document.getElementById('leftHandStatus');
    const rightStatus = document.getElementById('rightHandStatus');

    if (!leftStatus || !rightStatus) {
        console.warn('⚠️ Hand indicator elements not found');
        return;
    }

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

// Helper functions for MediaPipe drawing with crisp lines
function drawConnectors(ctx, landmarks, connections, style) {
    const rect = canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    
    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    
    for (const connection of connections) {
        const from = landmarks[connection[0]];
        const to = landmarks[connection[1]];
        
        // Use pixel-aligned coordinates
        const fromX = Math.round(from.x * canvasWidth) + 0.5;
        const fromY = Math.round(from.y * canvasHeight) + 0.5;
        const toX = Math.round(to.x * canvasWidth) + 0.5;
        const toY = Math.round(to.y * canvasHeight) + 0.5;
        
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
    }
    
    ctx.stroke();
    ctx.restore();
}

function drawLandmarks(ctx, landmarks, style) {
    const rect = canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    
    ctx.save();
    ctx.fillStyle = style.fillColor || style.color;
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.lineWidth;
    
    for (const landmark of landmarks) {
        // Use pixel-aligned coordinates
        const x = Math.round(landmark.x * canvasWidth);
        const y = Math.round(landmark.y * canvasHeight);
        
        ctx.beginPath();
        ctx.arc(x, y, style.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }
    
    ctx.restore();
}

// Check MediaPipe status on window load
window.addEventListener('load', () => {
    console.log('🔍 Checking MediaPipe on window load...');
    setTimeout(checkMediaPipeDependencies, 1000);
});