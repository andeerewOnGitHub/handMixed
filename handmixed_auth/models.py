from django.db import models
from django.contrib.auth.models import User

class SpotifyUser(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    spotify_id = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    access_token = models.TextField()
    refresh_token = models.TextField()
    token_expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.display_name or self.spotify_id} - {self.user.username}"