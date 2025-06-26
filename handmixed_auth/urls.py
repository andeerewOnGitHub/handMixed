# handmixed_auth/urls.py (app URLs)
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
    path('auth/callback/', views.spotify_callback, name='auth_callback'),  # ADD THIS LINE
    path('api/spotify/callback/', views.spotify_callback, name='spotify_callback'),
    
    # API endpoints for frontend
    path('api/spotify/check-auth/', views.check_spotify_auth, name='api_check_auth'),
    path('api/spotify/auth/', views.spotify_auth, name='api_spotify_auth'),
    path('api/spotify/playlists/', views.get_user_playlists, name='api_playlists'),
    path('api/spotify/playlists/<str:playlist_id>/tracks/', views.get_playlist_tracks, name='api_playlist_tracks'),
]