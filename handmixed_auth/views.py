# handmixed_auth/views.py
import requests
import base64
import urllib.parse
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.conf import settings
from django.contrib.auth import login
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import logging

logger = logging.getLogger(__name__)

def home(request):
    """Main DJ Studio page - requires login"""
    if not request.user.is_authenticated:
        return redirect('login')
    
    # Use display name if available, otherwise fall back to username
    display_name = request.user.first_name or request.user.username
    
    return render(request, 'handmixed_auth/studio.html', {
        'user_name': display_name
    })

def login_view(request):
    """Login page - redirect if already logged in"""
    if request.user.is_authenticated:
        return redirect('home')
    return render(request, 'handmixed_auth/login.html')

@login_required
def logout_view(request):
    """Logout and redirect"""
    from django.contrib.auth import logout
    logout(request)
    # Clear Spotify session data
    request.session.pop('spotify_access_token', None)
    request.session.pop('spotify_refresh_token', None)
    request.session.pop('spotify_token_expires', None)
    return redirect('login')

# Spotify OAuth Views
def spotify_auth(request):
    """Redirect to Spotify authorization"""
    scopes = [
        'user-read-private',
        'user-read-email', 
        'playlist-read-private',
        'playlist-read-collaborative',
        'user-library-read'
    ]
    
    # Store where user came from
    request.session['auth_redirect'] = request.GET.get('next', 'home')
    
    # Use the correct redirect_uri that matches your URL pattern
    redirect_uri = 'http://127.0.0.1:8000/auth/callback/'
    
    params = {
        'client_id': settings.SPOTIFY_CLIENT_ID,
        'response_type': 'code',
        'redirect_uri': redirect_uri,
        'scope': ' '.join(scopes),
        'show_dialog': 'true'  # Force user to see permission dialog
    }
    
    auth_url = f"https://accounts.spotify.com/authorize?{urllib.parse.urlencode(params)}"
    return redirect(auth_url)

def spotify_callback(request):
    """Handle Spotify OAuth callback and create/login user"""
    code = request.GET.get('code')
    error = request.GET.get('error')
    
    if error:
        logger.error(f"Spotify auth error: {error}")
        return render(request, 'handmixed_auth/error.html', {
            'error': f'Spotify authorization failed: {error}'
        })
    
    if not code:
        return render(request, 'handmixed_auth/error.html', {
            'error': 'No authorization code received from Spotify'
        })
    
    # Exchange code for access token
    # IMPORTANT: Use the same redirect_uri that was used in authorization
    token_data = {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': 'http://127.0.0.1:8000/auth/callback/',  # Must match authorization
    }
    
    # Create authorization header
    auth_str = f"{settings.SPOTIFY_CLIENT_ID}:{settings.SPOTIFY_CLIENT_SECRET}"
    auth_bytes = auth_str.encode('ascii')
    auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
    
    headers = {
        'Authorization': f'Basic {auth_b64}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    try:
        # Get access token
        response = requests.post(
            'https://accounts.spotify.com/api/token',
            data=token_data,
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            logger.error(f"Token exchange failed: {response.status_code} - {response.text}")
            return render(request, 'handmixed_auth/error.html', {
                'error': f'Failed to get access token: {response.status_code} - {response.text}'
            })
        
        token_info = response.json()
        access_token = token_info['access_token']
        
        # Get user info from Spotify
        user_headers = {'Authorization': f'Bearer {access_token}'}
        user_response = requests.get(
            'https://api.spotify.com/v1/me',
            headers=user_headers,
            timeout=10
        )
        
        if user_response.status_code != 200:
            logger.error(f"Failed to get user info: {user_response.status_code}")
            return render(request, 'handmixed_auth/error.html', {
                'error': 'Failed to get user information from Spotify'
            })
        
        spotify_user = user_response.json()
        spotify_id = spotify_user['id']
        spotify_email = spotify_user.get('email', f"{spotify_id}@spotify.local")
        spotify_name = spotify_user.get('display_name', spotify_id)
        
        # Create or get Django user
        user, created = User.objects.get_or_create(
            username=spotify_id,
            defaults={
                'email': spotify_email,
                'first_name': spotify_name,
                'last_name': '',  # Clear last name
            }
        )
        
        if created:
            logger.info(f"Created new user: {spotify_id} ({spotify_name})")
        else:
            logger.info(f"User already exists: {spotify_id} ({spotify_name})")
            # Always update user info in case it changed on Spotify
            user.email = spotify_email
            user.first_name = spotify_name
            user.last_name = ''
            user.save()
            logger.info(f"Updated user info for {spotify_id}: {spotify_name}")
        
        # Log the user into Django
        login(request, user)
        
        # Store Spotify tokens in session
        request.session['spotify_access_token'] = access_token
        request.session['spotify_refresh_token'] = token_info.get('refresh_token')
        request.session['spotify_token_expires'] = token_info.get('expires_in', 3600)
        
        logger.info(f"User {spotify_id} successfully authenticated and logged in")
        
        # Redirect to intended page or home
        redirect_to = request.session.pop('auth_redirect', 'home')
        return redirect(redirect_to)
        
    except requests.RequestException as e:
        logger.error(f"Request error during authentication: {e}")
        return render(request, 'handmixed_auth/error.html', {
            'error': f'Network error during authentication: {str(e)}'
        })
    except Exception as e:
        logger.error(f"Unexpected error during authentication: {e}")
        return render(request, 'handmixed_auth/error.html', {
            'error': f'An unexpected error occurred: {str(e)}'
        })

# API Views for the frontend
@login_required
@require_http_methods(["GET"])
def check_spotify_auth(request):
    """Check if user has valid Spotify authentication"""
    access_token = request.session.get('spotify_access_token')
    
    if not access_token:
        return JsonResponse({'authenticated': False})
    
    # Test the token by making a simple API call
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(
            'https://api.spotify.com/v1/me',
            headers=headers,
            timeout=5
        )
        
        if response.status_code == 200:
            user_info = response.json()
            return JsonResponse({
                'authenticated': True,
                'user': {
                    'id': user_info.get('id'),
                    'display_name': user_info.get('display_name'),
                    'email': user_info.get('email')
                }
            })
        else:
            # Token is invalid, clear it
            request.session.pop('spotify_access_token', None)
            return JsonResponse({'authenticated': False})
            
    except requests.RequestException as e:
        logger.error(f"Error checking Spotify auth: {e}")
        return JsonResponse({'authenticated': False, 'error': str(e)})

# Renamed function to match the frontend expectations
@login_required
@require_http_methods(["GET"])
def get_user_playlists(request):
    """Get user's Spotify playlists - renamed to match frontend API calls"""
    access_token = request.session.get('spotify_access_token')
    
    if not access_token:
        return JsonResponse({'error': 'Not authenticated with Spotify'}, status=401)
    
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        
        # Get user's playlists
        playlists = []
        url = 'https://api.spotify.com/v1/me/playlists'
        
        while url:
            response = requests.get(url, headers=headers, params={'limit': 50}, timeout=10)
            
            if response.status_code == 401:
                # Token expired
                request.session.pop('spotify_access_token', None)
                return JsonResponse({'error': 'Spotify authentication expired'}, status=401)
            elif response.status_code != 200:
                return JsonResponse({'error': f'Spotify API error: {response.status_code}'}, status=500)
            
            data = response.json()
            
            for playlist in data.get('items', []):
                # Only include playlists with tracks
                if playlist.get('tracks', {}).get('total', 0) > 0:
                    playlists.append({
                        'id': playlist['id'],
                        'name': playlist['name'],
                        'description': playlist.get('description', ''),
                        'tracks': {
                            'total': playlist.get('tracks', {}).get('total', 0)
                        },
                        'images': playlist.get('images', []),
                        'owner': {
                            'display_name': playlist.get('owner', {}).get('display_name', 'Unknown')
                        },
                        'external_urls': playlist.get('external_urls', {}),
                        'public': playlist.get('public', False)
                    })
            
            url = data.get('next')  # Pagination
        
        logger.info(f"Retrieved {len(playlists)} playlists for user {request.user.username}")
        return JsonResponse({'playlists': playlists})
        
    except requests.RequestException as e:
        logger.error(f"Error fetching playlists: {e}")
        return JsonResponse({'error': f'Network error: {str(e)}'}, status=500)

@login_required
@require_http_methods(["GET"])
def get_playlist_tracks(request, playlist_id):
    """Get tracks from a specific playlist"""
    access_token = request.session.get('spotify_access_token')
    
    if not access_token:
        return JsonResponse({'error': 'Not authenticated with Spotify'}, status=401)
    
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        
        # Get playlist tracks
        tracks = []
        url = f'https://api.spotify.com/v1/playlists/{playlist_id}/tracks'
        
        while url:
            response = requests.get(
                url, 
                headers=headers, 
                params={'limit': 100, 'fields': 'items(track(id,name,artists,album,preview_url,external_urls,duration_ms,popularity)),next'},
                timeout=10
            )
            
            if response.status_code == 401:
                request.session.pop('spotify_access_token', None)
                return JsonResponse({'error': 'Spotify authentication expired'}, status=401)
            elif response.status_code == 404:
                return JsonResponse({'error': 'Playlist not found'}, status=404)
            elif response.status_code != 200:
                return JsonResponse({'error': f'Spotify API error: {response.status_code}'}, status=500)
            
            data = response.json()
            
            for item in data.get('items', []):
                track = item.get('track')
                if track and track.get('id'):  # Skip null tracks
                    tracks.append({
                        'id': track['id'],
                        'name': track['name'],
                        'artists': [{'name': artist['name']} for artist in track.get('artists', [])],
                        'album': {
                            'name': track.get('album', {}).get('name', 'Unknown Album'),
                            'images': track.get('album', {}).get('images', [])
                        },
                        'preview_url': track.get('preview_url'),
                        'external_urls': track.get('external_urls', {}),
                        'duration_ms': track.get('duration_ms'),
                        'popularity': track.get('popularity', 0)
                    })
            
            url = data.get('next')  # Pagination
        
        # Filter tracks with previews and count them
        tracks_with_previews = [t for t in tracks if t['preview_url']]
        
        logger.info(f"Retrieved {len(tracks)} tracks, {len(tracks_with_previews)} with previews for user {request.user.username}")
        
        return JsonResponse({
            'tracks': tracks,
            'stats': {
                'total_tracks': len(tracks),
                'tracks_with_previews': len(tracks_with_previews)
            }
        })
        
    except requests.RequestException as e:
        logger.error(f"Error fetching playlist tracks: {e}")
        return JsonResponse({'error': f'Network error: {str(e)}'}, status=500)

# Keep the old function name for backward compatibility
get_playlists = get_user_playlists

# Error page view
def error_view(request):
    """Generic error page"""
    return render(request, 'handmixed_auth/error.html')