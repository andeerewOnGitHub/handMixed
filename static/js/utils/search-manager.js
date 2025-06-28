// static/js/utils/search-manager.js - Search Management Functions

// Search tracks on Audius (simulated)
async function searchTracks() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        updateStatus('Please enter a search query', 'error');
        return;
    }
    
    console.log(`🔍 Searching Audius for: "${query}"`);
    updateStatus(`Searching for "${query}"...`, 'info');
    
    const container = document.getElementById('tracksContainer');
    container.innerHTML = '<div class="loading">🔍 Searching Audius...</div>';

    try {
        // Simulated search results
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const tracks = generateMockTracks(query);
        
        appState.currentTracks = tracks;
        appState.searchQuery = query;
        displayTracks(tracks);
        
        console.log(`✅ Found ${tracks.length} tracks for "${query}"`);
        updateStatus(`Found ${tracks.length} tracks for "${query}"`, 'success');
        
    } catch (error) {
        console.error('❌ Search error:', error);
        container.innerHTML = `
            <div class="loading" style="color: #ff6b6b;">
                ❌ Search failed: ${error.message}<br>
                <button class="hub-btn" onclick="searchTracks()" style="margin-top: 10px;">Try Again</button>
            </div>
        `;
        updateStatus(`Search failed: ${error.message}`, 'error');
    }
}

// Generate mock tracks for demo
function generateMockTracks(query) {
    const artists = ['Porter Robinson', 'Madeon', 'ODESZA', 'Flume', 'Disclosure', 'Caribou', 'Four Tet'];
    const titles = ['Language', 'Shelter', 'Say My Name', 'Never Be Like You', 'Latch', 'Odessa', 'Two Thousand and Seventeen'];
    const tracks = [];
    
    for (let i = 0; i < 20; i++) {
        const artist = artists[Math.floor(Math.random() * artists.length)];
        const title = titles[Math.floor(Math.random() * titles.length)] + (i > 0 ? ` ${i}` : '');
        
        tracks.push({
            id: `track_${Date.now()}_${i}`,
            title: title,
            artist: artist,
            duration: 180 + Math.floor(Math.random() * 120),
            artwork: null,
            stream_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' // Demo audio
        });
    }
    
    return tracks;
}

// Clear search and show current playlist
function clearSearch() {
    document.getElementById('searchInput').value = '';
    appState.searchQuery = '';
    
    if (playlistState.activePlaylist) {
        appState.currentTracks = playlistState.activePlaylist.tracks;
        displayTracks(appState.currentTracks);
        updateStatus(`Showing playlist "${playlistState.activePlaylist.name}"`, 'info');
    } else {
        appState.currentTracks = [];
        document.getElementById('tracksContainer').innerHTML = '<div class="loading">🎵 Search for tracks or select a playlist</div>';
        document.getElementById('tracksCount').textContent = '0 tracks';
        updateStatus('Search cleared', 'info');
    }
}