# handmixed_auth/views.py - CSRF Fixed Version
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

# Spotify OAuth Views - UPDATED WITH FULL PLAYBACK SCOPES
def spotify_auth(request):
    """Redirect to Spotify authorization - UPDATED FOR FULL PLAYBACK"""
    scopes = [
        'user-read-private',
        'user-read-email', 
        'playlist-read-private',
        'playlist-read-collaborative',
        'user-library-read',
        # NEW SCOPES FOR FULL PLAYBACK:
        'streaming',                    # Play full tracks
        'user-modify-playback-state',   # Control playback
        'user-read-playback-state',     # Read current playback
        'user-read-currently-playing'   # Get current track
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
    token_data = {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': 'http://127.0.0.1:8000/auth/callback/',
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
        
        # Check if user has Spotify Premium (required for full playback)
        is_premium = spotify_user.get('product') == 'premium'
        if not is_premium:
            logger.warning(f"User {spotify_id} does not have Spotify Premium")
            request.session['spotify_premium'] = False
        else:
            request.session['spotify_premium'] = True
        
        # Create or get Django user
        user, created = User.objects.get_or_create(
            username=spotify_id,
            defaults={
                'email': spotify_email,
                'first_name': spotify_name,
                'last_name': '',
            }
        )
        
        if created:
            logger.info(f"Created new user: {spotify_id} ({spotify_name})")
        else:
            logger.info(f"User already exists: {spotify_id} ({spotify_name})")
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

# API Views for the frontend - FIXED WITH CSRF EXEMPT
@login_required
@csrf_exempt  # ADDED: Exempt from CSRF for API calls
@require_http_methods(["GET"])
def check_spotify_auth(request):
    """Check if user has valid Spotify authentication - UPDATED"""
    access_token = request.session.get('spotify_access_token')
    is_premium = request.session.get('spotify_premium', False)
    
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
                'premium': is_premium,
                'user': {
                    'id': user_info.get('id'),
                    'display_name': user_info.get('display_name'),
                    'email': user_info.get('email'),
                    'product': user_info.get('product')
                }
            })
        else:
            # Token is invalid, clear it
            request.session.pop('spotify_access_token', None)
            return JsonResponse({'authenticated': False})
            
    except requests.RequestException as e:
        logger.error(f"Error checking Spotify auth: {e}")
        return JsonResponse({'authenticated': False, 'error': str(e)})

# NEW API ENDPOINT: Get access token for frontend Web Playback SDK - FIXED CSRF
@login_required
@csrf_exempt  # ADDED: Exempt from CSRF for API calls
@require_http_methods(["GET"])
def get_spotify_token(request):
    """Get Spotify access token for frontend Web Playback SDK"""
    access_token = request.session.get('spotify_access_token')
    is_premium = request.session.get('spotify_premium', False)
    
    logger.info(f"Token request: access_token={bool(access_token)}, premium={is_premium}")
    
    if not access_token:
        return JsonResponse({'error': 'Not authenticated with Spotify'}, status=401)
    
    if not is_premium:
        return JsonResponse({
            'error': 'Spotify Premium required for full track playback',
            'premium_required': True
        }, status=403)
    
    return JsonResponse({
        'access_token': access_token,
        'premium': is_premium
    })

# NEW API ENDPOINT: Transfer playback to Web Playback SDK device - ALREADY HAS CSRF EXEMPT
@login_required
@require_http_methods(["POST"])
@csrf_exempt
def transfer_playback(request):
    """Transfer playback to Web Playback SDK device"""
    import json
    
    access_token = request.session.get('spotify_access_token')
    if not access_token:
        return JsonResponse({'error': 'Not authenticated'}, status=401)
    
    try:
        data = json.loads(request.body)
        device_id = data.get('device_id')
        
        if not device_id:
            return JsonResponse({'error': 'Device ID required'}, status=400)
        
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.put(
            'https://api.spotify.com/v1/me/player',
            headers=headers,
            json={
                'device_ids': [device_id],
                'play': False
            },
            timeout=10
        )
        
        if response.status_code in [200, 204]:
            return JsonResponse({'success': True})
        else:
            return JsonResponse({
                'error': f'Transfer failed: {response.status_code}'
            }, status=response.status_code)
            
    except Exception as e:
        logger.error(f"Transfer playback error: {e}")
        return JsonResponse({'error': str(e)}, status=500)

# NEW API ENDPOINT: Play track on Web Playback SDK - ALREADY HAS CSRF EXEMPT
@login_required
@require_http_methods(["POST"])
@csrf_exempt
def play_track(request):
    """Play a track using Spotify Web API"""
    import json
    
    access_token = request.session.get('spotify_access_token')
    if not access_token:
        return JsonResponse({'error': 'Not authenticated'}, status=401)
    
    try:
        data = json.loads(request.body)
        track_uri = data.get('track_uri')
        device_id = data.get('device_id')
        
        if not track_uri:
            return JsonResponse({'error': 'Track URI required'}, status=400)
        
        headers = {'Authorization': f'Bearer {access_token}'}
        play_data = {'uris': [track_uri]}
        
        url = 'https://api.spotify.com/v1/me/player/play'
        if device_id:
            url += f'?device_id={device_id}'
        
        response = requests.put(
            url,
            headers=headers,
            json=play_data,
            timeout=10
        )
        
        if response.status_code in [200, 204]:
            return JsonResponse({'success': True})
        else:
            return JsonResponse({
                'error': f'Play failed: {response.status_code}',
                'details': response.text
            }, status=response.status_code)
            
    except Exception as e:
        logger.error(f"Play track error: {e}")
        return JsonResponse({'error': str(e)}, status=500)

# NEW API ENDPOINT: Control playback - ALREADY HAS CSRF EXEMPT
@login_required
@require_http_methods(["POST"])
@csrf_exempt
def control_playback(request):
    """Control Spotify playback (pause/play/next/previous)"""
    import json
    
    access_token = request.session.get('spotify_access_token')
    if not access_token:
        return JsonResponse({'error': 'Not authenticated'}, status=401)
    
    try:
        data = json.loads(request.body)
        action = data.get('action')
        device_id = data.get('device_id')
        
        if not action:
            return JsonResponse({'error': 'Action required'}, status=400)
        
        headers = {'Authorization': f'Bearer {access_token}'}
        
        endpoint_map = {
            'play': '/me/player/play',
            'pause': '/me/player/pause',
            'next': '/me/player/next',
            'previous': '/me/player/previous'
        }
        
        if action not in endpoint_map:
            return JsonResponse({'error': 'Invalid action'}, status=400)
        
        url = f'https://api.spotify.com/v1{endpoint_map[action]}'
        if device_id and action in ['play', 'pause']:
            url += f'?device_id={device_id}'
        
        method = requests.put if action in ['play', 'pause'] else requests.post
        response = method(url, headers=headers, timeout=10)
        
        if response.status_code in [200, 204]:
            return JsonResponse({'success': True})
        else:
            return JsonResponse({
                'error': f'{action.title()} failed: {response.status_code}',
                'details': response.text
            }, status=response.status_code)
            
    except Exception as e:
        logger.error(f"Control playback error: {e}")
        return JsonResponse({'error': str(e)}, status=500)

# EXISTING FUNCTIONS (with CSRF exempt added where needed)
@login_required
@csrf_exempt  # ADDED: Exempt from CSRF for API calls
@require_http_methods(["GET"])
def get_user_playlists(request):
    """Get user's Spotify playlists"""
    access_token = request.session.get('spotify_access_token')
    
    if not access_token:
        return JsonResponse({'error': 'Not authenticated with Spotify'}, status=401)
    
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        
        playlists = []
        url = 'https://api.spotify.com/v1/me/playlists'
        
        while url:
            response = requests.get(url, headers=headers, params={'limit': 50}, timeout=10)
            
            if response.status_code == 401:
                request.session.pop('spotify_access_token', None)
                return JsonResponse({'error': 'Spotify authentication expired'}, status=401)
            elif response.status_code != 200:
                return JsonResponse({'error': f'Spotify API error: {response.status_code}'}, status=500)
            
            data = response.json()
            
            for playlist in data.get('items', []):
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
            
            url = data.get('next')
        
        logger.info(f"Retrieved {len(playlists)} playlists for user {request.user.username}")
        return JsonResponse({'playlists': playlists})
        
    except requests.RequestException as e:
        logger.error(f"Error fetching playlists: {e}")
        return JsonResponse({'error': f'Network error: {str(e)}'}, status=500)

@login_required
@csrf_exempt  # ADDED: Exempt from CSRF for API calls
@require_http_methods(["GET"])
def get_playlist_tracks(request, playlist_id):
    """Get tracks from a specific playlist with Spotify URIs"""
    access_token = request.session.get('spotify_access_token')
    
    if not access_token:
        return JsonResponse({'error': 'Not authenticated with Spotify'}, status=401)
    
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        
        tracks = []
        url = f'https://api.spotify.com/v1/playlists/{playlist_id}/tracks'
        
        while url:
            response = requests.get(
                url, 
                headers=headers, 
                params={
                    'limit': 100, 
                    'fields': 'items(track(id,name,artists,album,preview_url,external_urls,duration_ms,popularity,uri)),next'
                },
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
                if track and track.get('id'):
                    tracks.append({
                        'id': track['id'],
                        'name': track['name'],
                        'uri': track.get('uri'),
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
            
            url = data.get('next')
        
        tracks_with_previews = [t for t in tracks if t['preview_url']]
        tracks_with_uris = [t for t in tracks if t['uri']]
        
        logger.info(f"Retrieved {len(tracks)} tracks, {len(tracks_with_previews)} with previews, {len(tracks_with_uris)} with URIs")
        
        return JsonResponse({
            'tracks': tracks,
            'stats': {
                'total_tracks': len(tracks),
                'tracks_with_previews': len(tracks_with_previews),
                'tracks_with_uris': len(tracks_with_uris)
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



@login_required
@csrf_exempt
@require_http_methods(["POST"])
def load_track_to_deck(request):
    """Load a track to a specific deck"""
    import json
    
    try:
        data = json.loads(request.body)
        track_id = data.get('track_id')
        deck = data.get('deck')  # 'A' or 'B'
        
        if not track_id or not deck:
            return JsonResponse({'error': 'Track ID and deck required'}, status=400)
        
        # Store deck assignments in session
        if 'deck_assignments' not in request.session:
            request.session['deck_assignments'] = {}
        
        request.session['deck_assignments'][deck] = track_id
        request.session.modified = True
        
        return JsonResponse({
            'success': True,
            'message': f'Track loaded to Deck {deck}'
        })
        
    except Exception as e:
        logger.error(f"Load track to deck error: {e}")
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@csrf_exempt
@require_http_methods(["GET"])
def get_deck_status(request):
    """Get current deck assignments"""
    deck_assignments = request.session.get('deck_assignments', {})
    return JsonResponse({'deck_assignments': deck_assignments})