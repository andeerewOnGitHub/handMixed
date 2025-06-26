# handmixed_auth/urls.py - Updated with Full Spotify Playback Endpoints
from django.urls import path
from . import views

urlpatterns = [
    # Main pages
    path('', views.home, name='home'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('error/', views.error_view, name='error'),
    
    # Spotify OAuth
    path('spotify/auth/', views.spotify_auth, name='spotify_auth'),
    path('auth/callback/', views.spotify_callback, name='auth_callback'),
    path('api/spotify/callback/', views.spotify_callback, name='spotify_callback'),
    
    # API endpoints for frontend
    path('api/spotify/check-auth/', views.check_spotify_auth, name='api_check_auth'),
    path('api/spotify/auth/', views.spotify_auth, name='api_spotify_auth'),
    path('api/spotify/playlists/', views.get_user_playlists, name='api_playlists'),
    path('api/spotify/playlists/<str:playlist_id>/tracks/', views.get_playlist_tracks, name='api_playlist_tracks'),
    
    # NEW: Full Spotify Playback API Endpoints
    path('api/spotify/token/', views.get_spotify_token, name='api_spotify_token'),
    path('api/spotify/transfer-playback/', views.transfer_playback, name='api_transfer_playback'),
    path('api/spotify/play/', views.play_track, name='api_play_track'),
    path('api/spotify/control/', views.control_playback, name='api_control_playback'),
]