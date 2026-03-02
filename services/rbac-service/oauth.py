"""OAuth authentication providers."""

from typing import Optional
import httpx
from authlib.integrations.starlette_client import OAuth

from config import get_settings
from schemas import OAuthUserInfo

settings = get_settings()

oauth = OAuth()

# Configure Google OAuth
if settings.google_client_id and settings.google_client_secret:
    oauth.register(
        name='google',
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={
            'scope': 'openid email profile'
        }
    )


async def get_google_user_info(access_token: str) -> Optional[OAuthUserInfo]:
    """Get user info from Google using access token."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code != 200:
            return None
        
        data = response.json()
        
        return OAuthUserInfo(
            email=data.get("email"),
            first_name=data.get("given_name"),
            last_name=data.get("family_name"),
            avatar_url=data.get("picture"),
            oauth_id=data.get("sub"),
            provider="google"
        )


async def exchange_google_code(code: str, redirect_uri: str) -> Optional[dict]:
    """Exchange authorization code for access token."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            }
        )
        
        if response.status_code != 200:
            return None
        
        return response.json()
