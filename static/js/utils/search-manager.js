// static/js/utils/search-manager.js - Search Management Functions

// Search tracks on Audius (simulated)
// Search tracks on Audius via Django API
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
        // Call your Django API endpoint
        const response = await fetch(`/api/audius/search/?q=${encodeURIComponent(query)}&limit=25`);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        const tracks = data.tracks || [];
        
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

// Load trending tracks on startup
async function loadTrendingTracks() {
    console.log('🔥 Loading trending tracks from Audius...');
    updateStatus('Loading trending tracks...', 'info');
    
    const container = document.getElementById('tracksContainer');
    container.innerHTML = '<div class="loading">🔥 Loading trending tracks...</div>';

    try {
        const response = await fetch('/api/audius/trending/?limit=50');
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        const tracks = data.tracks || [];
        
        appState.currentTracks = tracks;
        displayTracks(tracks);
        
        console.log(`✅ Loaded ${tracks.length} trending tracks`);
        updateStatus(`Loaded ${tracks.length} trending tracks`, 'success');
        
    } catch (error) {
        console.error('❌ Error loading trending tracks:', error);
        container.innerHTML = `
            <div class="loading" style="color: #ff6b6b;">
                ❌ Failed to load trending tracks: ${error.message}<br>
                <button class="hub-btn" onclick="loadTrendingTracks()" style="margin-top: 10px;">Try Again</button>
            </div>
        `;
        updateStatus(`Failed to load trending tracks: ${error.message}`, 'error');
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