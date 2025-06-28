// static/js/utils/playlist-ui.js - Playlist UI Functions

function displayPlaylists() {
    const container = document.getElementById('playlistsContainer');
    const countElement = document.getElementById('playlistsCount');
    
    countElement.textContent = playlistState.playlists.length;
    
    if (playlistState.playlists.length === 0) {
        container.innerHTML = '<div class="loading">Create your first playlist above</div>';
        return;
    }

    let playlistsHTML = '';
    
    playlistState.playlists.forEach((playlist, index) => {
        const isActive = playlistState.activePlaylist && playlistState.activePlaylist.id === playlist.id;
        
        playlistsHTML += `
            <div class="playlist-item ${isActive ? 'active' : ''}" onclick="selectPlaylist(${playlist.id})">
                <div class="playlist-icon">📋</div>
                <div class="playlist-info">
                    <div class="playlist-name">${playlist.name}</div>
                    <div class="playlist-count">${playlist.tracks.length} tracks</div>
                </div>
                <div class="playlist-actions">
                    <button class="playlist-action-btn" onclick="event.stopPropagation(); deletePlaylist(${playlist.id})" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = playlistsHTML;
}