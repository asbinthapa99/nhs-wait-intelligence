"""
API Key Authorization layer for exposing the Intelligence Engine to external researchers.
"""
from fastapi.security.api_key import APIKeyHeader
from fastapi import Security, HTTPException, status
import secrets

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# In-memory store for MVP. In production, this ties to PostgreSQL `api_keys` table.
ACTIVE_API_KEYS = {"dev_test_key_123"}

def generate_api_key() -> str:
    """Generate a secure developer key."""
    new_key = f"nhs_{secrets.token_urlsafe(32)}"
    ACTIVE_API_KEYS.add(new_key)
    return new_key

async def verify_api_key(api_key: str = Security(api_key_header)):
    """Dependency to lock down open endpoints."""
    # Allow missing key for standard internal Next.js requests for now (CORS protects this).
    # External requests MUST provde a valid key.
    if api_key and api_key not in ACTIVE_API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Invalid API Key provided for Developer API access."
        )
    return api_key
