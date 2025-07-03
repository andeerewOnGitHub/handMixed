// static/js/utils/deck-ui.js - Updated with Multi-Channel Support

console.log('🎛️ Multi-Channel Deck UI System Loading...');

// Update deck display with multi-channel information
function updateDeckDisplay(deckLetter, track) {
    const nameElement = document.getElementById(`deck${deckLetter}TrackName`);
    const artistElement = document.getElementById(`deck${deckLetter}TrackArtist`);
    const artworkElement = document.getElementById(`deck${deckLetter}Artwork`);
    const displayElement = document.getElementById(`deck${deckLetter}TrackDisplay`);
    
    if (track) {
        nameElement.textContent = track.title;
        artistElement.textContent = track.artist;
        
        if (track.artwork) {
            artworkElement.innerHTML = `<img src="${track.artwork}" alt="${track.title}">`;
        } else {
            artworkElement.textContent = '🎵';
        }
        
        displayElement.classList.add('loaded');
        updateDeckStatus(deckLetter, 'Ready');
        
        // Set initial BPM display
        if (track.bpm) {
            updateDeckBPM(deckLetter, `${track.bpm} BPM`);
        } else {
            updateDeckBPM(deckLetter, 'Detecting...');
        }
        
        // Initialize multi-channel display
        initializeMultiChannelDisplay(deckLetter);
        
    } else {
        nameElement.textContent = 'No track loaded';
        artistElement.textContent = 'Select track from Audius';
        artworkElement.textContent = '🎵';
        displayElement.classList.remove('loaded');
        updateDeckStatus(deckLetter, 'Empty');
        updateDeckBPM(deckLetter, '-- BPM');
        
        // Reset multi-channel display
        resetMultiChannelDisplay(deckLetter);
    }
    
    updateDeckUI(deckLetter);
}

// Initialize multi-channel display elements
function initializeMultiChannelDisplay(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (!deck.audioChannels) {
        console.warn(`⚠️ No audio channels found for Deck ${deckLetter}`);
        return;
    }
    
    // Update channel indicators
    updateChannelIndicators(deckLetter);
    
    // Show multi-channel waveform containers
    const waveformContainers = [
        document.getElementById(`deck${deckLetter}WaveformBass`),
        document.getElementById(`deck${deckLetter}WaveformDrums`),
        document.getElementById(`deck${deckLetter}WaveformSynth`)
    ];
    
    waveformContainers.forEach(container => {
        if (container) {
            container.style.display = 'block';
            container.style.opacity = '1';
        }
    });
    
    console.log(`✅ Multi-channel display initialized for Deck ${deckLetter}`);
}

// Reset multi-channel display
function resetMultiChannelDisplay(deckLetter) {
    // Reset channel indicators
    const channels = ['Bass', 'Drums', 'Synth'];
    channels.forEach(channel => {
        const indicator = document.getElementById(`deck${deckLetter}${channel}Channel`);
        if (indicator) {
            const statusElement = indicator.querySelector('.channel-status');
            if (statusElement) {
                statusElement.classList.remove('active');
            }
        }
    });
    
    // Clear waveform containers
    const waveformContainers = [
        document.getElementById(`deck${deckLetter}WaveformBass`),
        document.getElementById(`deck${deckLetter}WaveformDrums`),
        document.getElementById(`deck${deckLetter}WaveformSynth`)
    ];
    
    waveformContainers.forEach(container => {
        if (container) {
            container.innerHTML = '';
            container.style.opacity = '0.5';
        }
    });
    
    console.log(`🔄 Multi-channel display reset for Deck ${deckLetter}`);
}

// Update channel indicators based on current state
function updateChannelIndicators(deckLetter) {
    const deck = deckState[deckLetter];
    
    if (!deck.audioChannels) {
        console.warn(`⚠️ No audio channels to update for Deck ${deckLetter}`);
        return;
    }
    
    const channelMap = {
        bass: 'Bass',
        drums: 'Drums', 
        synth: 'Synth'
    };
    
    Object.keys(deck.audioChannels).forEach(channelKey => {
        const channel = deck.audioChannels[channelKey];
        const channelName = channelMap[channelKey];
        const indicator = document.getElementById(`deck${deckLetter}${channelName}Channel`);
        
        if (indicator) {
            const statusElement = indicator.querySelector('.channel-status');
            if (statusElement) {
                // Update active state
                statusElement.classList.toggle('active', channel.enabled);
                
                // Update visual style based on channel state
                if (channel.enabled) {
                    statusElement.style.opacity = '1';
                    statusElement.style.filter = 'none';
                } else {
                    statusElement.style.opacity = '0.3';
                    statusElement.style.filter = 'grayscale(100%)';
                }
                
                // Add pulsing effect if channel is being controlled
                if (deck.handControlled) {
                    statusElement.classList.add('pulsing');
                } else {
                    statusElement.classList.remove('pulsing');
                }
            }
        }
    });
    
    // Update waveform visibility
    updateChannelWaveformVisibility(deckLetter);
    
    console.log(`🎚️ Channel indicators updated for Deck ${deckLetter}`);
}

// Update deck BPM display with enhanced styling
function updateDeckBPM(deckLetter, bpmText) {
    console.log(`🎵 Updating Deck ${deckLetter} BPM: ${bpmText}`);
    
    const bpmElement = document.getElementById(`deck${deckLetter}BPM`);
    
    if (!bpmElement) {
        console.error(`❌ BPM element not found: deck${deckLetter}BPM`);
        return;
    }
    
    bpmElement.textContent = bpmText;
    
    // Remove all BPM state classes
    bpmElement.classList.remove('detecting', 'detected', 'error', 'synced');
    
    // Add appropriate class based on BPM text
    if (bpmText.includes('Detecting') || bpmText.includes('Analyzing') || bpmText.includes('~')) {
        bpmElement.classList.add('detecting');
        bpmElement.style.color = '#f39c12';
        bpmElement.style.animation = 'pulse 1.5s ease-in-out infinite';
    } else if (bpmText.includes('BPM') && !bpmText.includes('--')) {
        bpmElement.classList.add('detected');
        bpmElement.style.color = '#1ed760';
        bpmElement.style.animation = 'none';
        
        // Check if decks are in sync
        if (areDecksInSync()) {
            bpmElement.classList.add('synced');
            bpmElement.style.boxShadow = '0 0 10px rgba(30, 215, 96, 0.5)';
        }
    } else {
        bpmElement.classList.add('error');
        bpmElement.style.color = '#666';
        bpmElement.style.animation = 'none';
    }
}

// Update deck status with multi-channel info
function updateDeckStatus(deckLetter, status) {
    const statusElement = document.getElementById(`deck${deckLetter}TrackStatus`);
    if (!statusElement) return;
    
    let statusText = status;
    
    // Add multi-channel info if available
    const deck = deckState[deckLetter];
    if (deck.separatedBuffers && status !== 'Empty') {
        statusText += ' • Multi-Channel';
    }
    
    // Add BPM info if available
    if (deck.bpm && status !== 'Empty') {
        statusText += ` • ${deck.bpm} BPM`;
    }
    
    statusElement.textContent = statusText;
}

// Update deck buttons (simplified since we removed individual deck controls)
function updateDeckUI(deckLetter) {
    const deck = deckState[deckLetter];
    
    // Update any remaining deck-specific UI elements
    // Most controls are now global, but we might have some deck-specific indicators
    
    // Update global playback controls
    updateGlobalPlaybackState();
    
    // Update deck overlay classes
    const overlay = document.getElementById(`deck${deckLetter}Overlay`);
    if (overlay) {
        overlay.classList.toggle('loaded', !!deck.track);
        overlay.classList.toggle('playing', deck.isPlaying);
        overlay.classList.toggle('multi-channel', !!deck.separatedBuffers);
    }
}

// Update deck volume indicator with enhanced visuals
function updateDeckVolumeIndicator(deckLetter, volumePercent) {
    const volumeFill = document.getElementById(`deck${deckLetter}VolumeFill`);
    const volumeText = document.getElementById(`deck${deckLetter}VolumeText`);
    
    if (volumeFill && volumeText) {
        // Smooth animation for volume changes
        volumeFill.style.transition = 'width 0.1s ease';
        volumeFill.style.width = `${volumePercent}%`;
        
        // Update text with hand control indicator
        const deck = deckState[deckLetter];
        let volumeTextContent = `Volume: ${Math.round(volumePercent)}%`;
        
        if (deck.handControlled) {
            volumeTextContent += ' 🖐️';
        }
        
        volumeText.textContent = volumeTextContent;
        
        // Add visual feedback based on volume level
        if (volumePercent > 80) {
            volumeFill.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.3)';
        } else if (volumePercent > 50) {
            volumeFill.style.boxShadow = '0 0 5px rgba(255, 255, 255, 0.2)';
        } else {
            volumeFill.style.boxShadow = 'none';
        }
    }
}

// Enhanced BPM sync indicator
function updateBPMSyncIndicator() {
    if (!haveBothDecksBPM()) return;
    
    const syncStatus = getBPMSyncStatus();
    
    // Update individual deck BPM displays with sync status
    ['A', 'B'].forEach(deckLetter => {
        const bpmElement = document.getElementById(`deck${deckLetter}BPM`);
        if (bmpElement) {
            if (syncStatus.synced) {
                bmpElement.classList.add('synced');
                bmpElement.style.borderColor = '#1ed760';
            } else {
                bmpElement.classList.remove('synced');
                bmpElement.style.borderColor = '';
            }
        }
    });
    
    // Update global sync status if there's a sync indicator
    const globalSyncIndicator = document.getElementById('globalSyncIndicator');
    if (globalSyncIndicator) {
        globalSyncIndicator.textContent = `${syncStatus.status} (${syncStatus.difference?.toFixed(1)} BPM diff)`;
        globalSyncIndicator.style.color = syncStatus.synced ? '#1ed760' : '#f39c12';
    }
    
    console.log(`🎵 BPM Sync Status: ${syncStatus.status} (${syncStatus.difference?.toFixed(1)} BPM difference)`);
}

// BPM-related utility functions
function getDeckBPM(deckLetter) {
    const deck = deckState[deckLetter];
    return deck.bpm || 120;
}

function haveBothDecksBPM() {
    return deckState.A.bpm && deckState.B.bpm;
}

function getBPMDifference() {
    if (!haveBothDecksBPM()) return 0;
    
    const bpmA = getDeckBPM('A');
    const bpmB = getDeckBPM('B');
    
    return Math.abs(bpmA - bpmB);
}

function getBPMSyncRatio() {
    if (!haveBothDecksBPM()) return 1;
    
    const bpmA = getDeckBPM('A');
    const bpmB = getDeckBPM('B');
    
    return bpmA / bpmB;
}

// Enhanced deck display with multi-channel information
function updateDeckDisplayEnhanced(deckLetter, track) {
    updateDeckDisplay(deckLetter, track);
    
    if (track) {
        // Add processing status
        const deck = deckState[deckLetter];
        if (isSeparationProcessing(deckLetter)) {
            updateDeckStatus(deckLetter, 'Processing Multi-Channel...');
        } else if (deck.separatedBuffers) {
            updateDeckStatus(deckLetter, 'Multi-Channel Ready');
        }
        
        // Update BPM with channel information
        if (track.bpm) {
            const statusElement = document.getElementById(`deck${deckLetter}TrackStatus`);
            if (statusElement && !statusElement.textContent.includes('BPM')) {
                statusElement.textContent += ` • ${track.bpm} BPM`;
            }
        }
    }
    
    // Update sync indicator if both decks have tracks
    if (deckState.A.track && deckState.B.track) {
        updateBPMSyncIndicator();
    }
}

// Format BPM display with enhanced information
function formatBPMDisplay(bpm, isDetecting = false, channelInfo = null) {
    if (isDetecting) {
        return '🔍 Analyzing...';
    }
    
    if (!bpm || isNaN(bpm)) {
        return '-- BPM';
    }
    
    let displayText = `${Math.round(bpm)} BPM`;
    
    // Add channel information if available
    if (channelInfo) {
        displayText += ` (${channelInfo})`;
    }
    
    return displayText;
}

// Update gesture feedback display
function updateGestureDisplay(deckLetter, gestures) {
    const gestureElements = {
        thumbIndex: document.getElementById(`deck${deckLetter}GestureThumbIndex`),
        thumbMiddle: document.getElementById(`deck${deckLetter}GestureThumbMiddle`),
        thumbRing: document.getElementById(`deck${deckLetter}GestureThumbRing`),
        thumbPinky: document.getElementById(`deck${deckLetter}GestureThumbPinky`)
    };
    
    Object.keys(gestures).forEach(gestureKey => {
        const element = gestureElements[gestureKey];
        if (element) {
            element.classList.toggle('active', gestures[gestureKey]);
        }
    });
}

// Create visual feedback for multi-channel processing
function showMultiChannelProcessingFeedback(deckLetter, show = true) {
    const overlay = document.getElementById(`deck${deckLetter}Overlay`);
    
    if (!overlay) return;
    
    const existingIndicator = overlay.querySelector('.processing-indicator');
    
    if (show) {
        if (!existingIndicator) {
            const indicator = document.createElement('div');
            indicator.className = 'processing-indicator';
            indicator.innerHTML = `
                <div class="processing-spinner"></div>
                <div class="processing-text">Processing Multi-Channel Audio...</div>
            `;
            overlay.appendChild(indicator);
        }
    } else {
        if (existingIndicator) {
            existingIndicator.remove();
        }
    }
}

// Update crossfader visual feedback
function updateCrossfaderVisual(position) {
    const crossfader = document.getElementById('crossfader');
    if (!crossfader) return;
    
    // Update crossfader thumb position
    crossfader.value = position;
    
    // Update visual feedback based on position
    const leftIntensity = Math.max(0, (100 - position) / 50);
    const rightIntensity = Math.max(0, position / 50);
    
    // Update deck overlays based on crossfader position
    const leftOverlay = document.getElementById('deckAOverlay');
    const rightOverlay = document.getElementById('deckBOverlay');
    
    if (leftOverlay) {
        leftOverlay.style.opacity = 0.7 + (leftIntensity * 0.3);
    }
    
    if (rightOverlay) {
        rightOverlay.style.opacity = 0.7 + (rightIntensity * 0.3);
    }
}

// Create and update multi-channel waveform labels
function updateWaveformLabels(deckLetter) {
    const waveformContainers = [
        { id: `deck${deckLetter}WaveformBass`, label: 'Bass/Kick', color: '#ff6b6b' },
        { id: `deck${deckLetter}WaveformDrums`, label: 'Drums', color: '#f39c12' },
        { id: `deck${deckLetter}WaveformSynth`, label: 'Synth', color: '#00d4ff' }
    ];
    
    waveformContainers.forEach(container => {
        const element = document.getElementById(container.id);
        if (element) {
            const label = element.parentElement.querySelector('.waveform-label');
            if (label) {
                label.style.color = container.color;
                label.textContent = container.label;
            }
        }
    });
}

// Initialize deck UI enhancements
function initializeDeckUIEnhancements() {
    // Add CSS for new UI elements
    const style = document.createElement('style');
    style.textContent = `
        .processing-indicator {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 1000;
        }
        
        .processing-spinner {
            width: 30px;
            height: 30px;
            border: 3px solid #333;
            border-top: 3px solid #00d4ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .processing-text {
            color: #00d4ff;
            font-size: 0.8rem;
            font-family: 'Orbitron', monospace;
        }
        
        .channel-status.pulsing {
            animation: channelPulse 1s ease-in-out infinite;
        }
        
        @keyframes channelPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        .deck-overlay.multi-channel {
            border-image: linear-gradient(45deg, #ff6b6b, #f39c12, #00d4ff) 1;
        }
        
        .deck-bpm.synced {
            animation: syncPulse 2s ease-in-out infinite;
        }
        
        @keyframes syncPulse {
            0%, 100% { box-shadow: 0 0 5px rgba(30, 215, 96, 0.3); }
            50% { box-shadow: 0 0 15px rgba(30, 215, 96, 0.7); }
        }
    `;
    document.head.appendChild(style);
    
    console.log('✅ Deck UI enhancements initialized');
}

// Initialize UI enhancements when the script loads
initializeDeckUIEnhancements();

console.log('✅ Multi-Channel Deck UI System Ready');
console.log('🎚️ Enhanced visual feedback for multi-channel audio');
console.log('🖐️ Gesture-based channel control indicators');
console.log('🌊 Multi-channel waveform visualization support');