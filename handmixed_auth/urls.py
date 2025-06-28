# handmixed_auth/urls.py - FULL AUDIUS VERSION
from django.urls import path
from . import views

urlpatterns = [
    # Main pages
    path('', views.home, name='home'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('error/', views.error_view, name='error'),
    
    # Audius API endpoints
    path('api/audius/trending/', views.get_trending_tracks, name='api_trending_tracks'),
    path('api/audius/search/', views.search_tracks, name='api_search_tracks'),
]