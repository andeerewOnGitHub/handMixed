// static/js/utils/ui-helpers.js - UI Helper Functions

// Toggle music hub
function toggleHubCollapse() {
    const musicHub = document.getElementById('musicHub');
    const collapseBtn = document.getElementById('collapseBtn');
    
    const isCollapsed = musicHub.classList.contains('collapsed');
    
    if (isCollapsed) {
        musicHub.classList.remove('collapsed');
        collapseBtn.textContent = '▼ Hide';
        updateHubHeight(300);
    } else {
        musicHub.classList.add('collapsed');
        collapseBtn.textContent = '▲ Show';
        updateHubHeight(40);
    }
}

// Update hub height
function updateHubHeight(height) {
    document.documentElement.style.setProperty('--hub-height', `${height}px`);
}

// Format duration
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}