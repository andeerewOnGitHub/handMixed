// static/js/utils/track-ui.js - Track UI Functions

// Display tracks in UI
function displayTracks(tracks) {
    const container = document.getElementById('tracksContainer');
    const countElement = document.getElementById('tracksCount');
    
    countElement.textContent = `${tracks.length} tracks`;
    
    if (!tracks || tracks.length === 0) {
        container.innerHTML = '<div class="loading">No tracks found</div>';
        return;
    }

    let tracksHTML = '';
    
    tracks.forEach((track, index) => {
        const duration = formatDuration(track.duration);
        const artworkUrl = track.artwork;
        
        tracksHTML += `
            <div class="track-item" onclick="loadTrackToDeck(${index})">
                <div class="track-number">${index + 1}</div>
                <div class="track-artwork">
                    ${artworkUrl ? 
                        `<img src="${artworkUrl}" alt="${track.title}" loading="lazy">` :
                        '🎵'
                    }
                </div>
                <div class="track-info">
                    <div class="track-name">${track.title}</div>
                    <div class="track-artist">${track.artist}</div>
                </div>
                <div class="track-duration">${duration}</div>
                ${playlistState.playlists.length > 0 && !playlistState.activePlaylist ? `
                    <div class="track-actions">
                        <select class="track-action-btn" onchange="addTrackToSelectedPlaylist(${index}, this.value); this.value='';" style="background: rgba(30, 215, 96, 0.2); border: none; color: #1ed760; font-size: 0.6rem;">
                            <option value="">+ Playlist</option>
                            ${playlistState.playlists.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                        </select>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    container.innerHTML = tracksHTML;
}