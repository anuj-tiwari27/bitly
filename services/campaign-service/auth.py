from typing import Optional, List
from uuid import UUID

from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from config import get_settings

settings = get_settings()
security = HTTPBearer()


class TokenPayload(BaseModel):
    sub: str
    email: str
    roles: List[str]
    exp: int
    iat: int


def verify_access_token(token: str) -> Optional[TokenPayload]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )
        
        if payload.get("type") != "access":
            return None
        
        return TokenPayload(
            sub=payload["sub"],
            email=payload["email"],
            roles=payload.get("roles", []),
            exp=payload["exp"],
            iat=payload["iat"]
        )
    except JWTError:
        return None


async def get_current_user_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenPayload:
    token = credentials.credentials
    payload = verify_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return payload


def get_current_user_id(token: TokenPayload = Depends(get_current_user_token)) -> UUID:
    return UUID(token.sub)
