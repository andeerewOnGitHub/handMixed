# handmixed_auth/views.py - FULL AUDIUS VERSION
import json
import logging
import requests

from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

logger = logging.getLogger(__name__)

def home(request):
    """Main DJ Studio page"""
    return render(request, 'handmixed_auth/studio.html')

def login_view(request):
    """Simple demo login"""
    try:
        user, created = User.objects.get_or_create(
            username='demo_dj',
            defaults={
                'email': 'demo@handmixed.com',
                'first_name': 'Demo DJ'
            }
        )
        login(request, user)
        return redirect('home')
    except Exception as e:
        logger.error(f"Login error: {e}")
        return render(request, 'handmixed_auth/error.html', {'error': 'Login failed'})

def logout_view(request):
    """Logout view"""
    logout(request)
    return redirect('home')

def error_view(request):
    """Error page"""
    return render(request, 'handmixed_auth/error.html')

# Audius API Configuration
AUDIUS_API_BASE = 'https://discoveryprovider.audius.co'

@csrf_exempt
@require_http_methods(["GET"])
def get_trending_tracks(request):
    """Get trending tracks from Audius"""
    try:
        limit = min(int(request.GET.get('limit', 50)), 100)
        offset = int(request.GET.get('offset', 0))
        time_range = request.GET.get('time', 'week')
        
        url = f"{AUDIUS_API_BASE}/v1/tracks/trending"
        params = {'limit': limit, 'offset': offset, 'time': time_range}
        
        response = requests.get(url, params=params, timeout=15)
        
        if response.status_code != 200:
            return JsonResponse({'error': f'Audius API error: {response.status_code}'}, status=500)
        
        data = response.json()
        tracks = data.get('data', [])
        
        processed_tracks = []
        for track in tracks:
            if not track or not track.get('id'):
                continue
                
            processed_track = {
                'id': track['id'],
                'title': track.get('title', 'Unknown Title'),
                'artist': track.get('user', {}).get('name', 'Unknown Artist'),
                'duration': track.get('duration', 0),
                'artwork': None,
                'genre': track.get('genre'),
                'play_count': track.get('play_count', 0),
                'stream_url': f"{AUDIUS_API_BASE}/v1/tracks/{track['id']}/stream"
            }
            
            # Handle artwork safely
            artwork = track.get('artwork')
            if artwork and isinstance(artwork, dict):
                processed_track['artwork'] = artwork.get('480x480') or artwork.get('150x150')
            
            processed_tracks.append(processed_track)
        
        return JsonResponse({
            'tracks': processed_tracks,
            'total': len(processed_tracks)
        })
        
    except Exception as e:
        logger.error(f"Error fetching trending tracks: {e}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def search_tracks(request):
    """Search tracks on Audius"""
    try:
        query = request.GET.get('q', '').strip()
        if not query:
            return JsonResponse({'error': 'Search query required'}, status=400)
        
        limit = min(int(request.GET.get('limit', 25)), 100)
        
        url = f"{AUDIUS_API_BASE}/v1/tracks/search"
        params = {'query': query, 'limit': limit}
        
        response = requests.get(url, params=params, timeout=15)
        
        if response.status_code != 200:
            return JsonResponse({'error': f'Search error: {response.status_code}'}, status=500)
        
        data = response.json()
        tracks = data.get('data', [])
        
        processed_tracks = []
        for track in tracks:
            if not track or not track.get('id'):
                continue
                
            processed_track = {
                'id': track['id'],
                'title': track.get('title', 'Unknown Title'),
                'artist': track.get('user', {}).get('name', 'Unknown Artist'),
                'duration': track.get('duration', 0),
                'artwork': None,
                'genre': track.get('genre'),
                'stream_url': f"{AUDIUS_API_BASE}/v1/tracks/{track['id']}/stream"
            }
            
            # Handle artwork safely
            artwork = track.get('artwork')
            if artwork and isinstance(artwork, dict):
                processed_track['artwork'] = artwork.get('480x480') or artwork.get('150x150')
            
            processed_tracks.append(processed_track)
        
        return JsonResponse({
            'tracks': processed_tracks,
            'query': query,
            'total': len(processed_tracks)
        })
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        return JsonResponse({'error': str(e)}, status=500)