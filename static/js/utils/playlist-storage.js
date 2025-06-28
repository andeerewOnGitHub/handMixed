// static/js/utils/playlist-storage.js - Playlist Storage Functions

function loadSavedPlaylists() {
    try {
        const saved = localStorage.getItem('audius_playlists');
        if (saved) {
            const data = JSON.parse(saved);
            playlistState.playlists = data.playlists || [];
            playlistState.nextPlaylistId = data.nextId || 1;
            displayPlaylists();
            console.log('✅ Loaded saved playlists:', playlistState.playlists.length);
        }
    } catch (error) {
        console.error('❌ Error loading playlists:', error);
    }
}

function savePlaylistsToStorage() {
    try {
        const data = {
            playlists: playlistState.playlists,
            nextId: playlistState.nextPlaylistId
        };
        localStorage.setItem('audius_playlists', JSON.stringify(data));
        console.log('💾 Playlists saved to storage');
    } catch (error) {
        console.error('❌ Error saving playlists:', error);
    }
}