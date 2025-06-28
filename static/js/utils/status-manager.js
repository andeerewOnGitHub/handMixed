// static/js/utils/status-manager.js - Status Management Functions

// Update status
function updateStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = '▸ ' + message;
    statusDiv.className = 'status ' + type;
    console.log(`Status: ${message}`);
    
    if (type === 'success') {
        setTimeout(() => {
            if (statusDiv.textContent === '▸ ' + message) {
                statusDiv.textContent = '▸ Professional DJ Studio ready';
                statusDiv.className = 'status info';
            }
        }, 5000);
    }
}