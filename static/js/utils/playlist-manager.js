// static/js/utils/playlist-manager.js - Playlist Management Functions

// Playlist Management
function createPlaylist() {
    const input = document.getElementById('playlistNameInput');
    const name = input.value.trim();
    
    if (!name) {
        updateStatus('Please enter a playlist name', 'error');
        return;
    }
    
    const playlist = {
        id: playlistState.nextPlaylistId++,
        name: name,
        tracks: [],
        created: new Date().toISOString()
    };
    
    playlistState.playlists.push(playlist);
    savePlaylistsToStorage();
    displayPlaylists();
    
    input.value = '';
    updateStatus(`Created playlist "${name}"`, 'success');
    console.log('✅ Created playlist:', playlist);
}

function selectPlaylist(playlistId) {
    const playlist = playlistState.playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    playlistState.activePlaylist = playlist;
    appState.currentTracks = playlist.tracks;
    
    displayPlaylists();
    displayTracks(playlist.tracks);
    
    updateStatus(`Selected playlist "${playlist.name}" with ${playlist.tracks.length} tracks`, 'success');
    console.log('✅ Selected playlist:', playlist);
}

function deletePlaylist(playlistId) {
    if (!confirm('Delete this playlist?')) return;
    
    const index = playlistState.playlists.findIndex(p => p.id === playlistId);
    if (index === -1) return;
    
    const playlist = playlistState.playlists[index];
    playlistState.playlists.splice(index, 1);
    
    if (playlistState.activePlaylist && playlistState.activePlaylist.id === playlistId) {
        playlistState.activePlaylist = null;
        appState.currentTracks = [];
        document.getElementById('tracksContainer').innerHTML = '<div class="loading">🎵 Search for tracks or select a playlist</div>';
        document.getElementById('tracksCount').textContent = '0 tracks';
    }
    
    savePlaylistsToStorage();
    displayPlaylists();
    
    updateStatus(`Deleted playlist "${playlist.name}"`, 'success');
}

function addTrackToPlaylist(track, playlistId) {
    const playlist = playlistState.playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    // Check if track already exists
    if (playlist.tracks.find(t => t.id === track.id)) {
        updateStatus('Track already in playlist', 'error');
        return;
    }
    
    playlist.tracks.push(track);
    savePlaylistsToStorage();
    
    if (playlistState.activePlaylist && playlistState.activePlaylist.id === playlistId) {
        appState.currentTracks = playlist.tracks;
        displayTracks(playlist.tracks);
    }
    
    displayPlaylists();
    updateStatus(`Added "${track.title}" to "${playlist.name}"`, 'success');
}

function addTrackToSelectedPlaylist(trackIndex, playlistId) {
    if (!playlistId || trackIndex >= appState.currentTracks.length) return;
    
    const track = appState.currentTracks[trackIndex];
    addTrackToPlaylist(track, parseInt(playlistId));
}