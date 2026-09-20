from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from app.security import create_access_token, verify_password, get_password_hash
from app.database import get_supabase_client

router = APIRouter(prefix="/auth", tags=["Authentication"])

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str = "admin"

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/token", response_model=TokenResponse)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # Admin credential verification
    if form_data.username in ("admin", "gurukul_admin") and form_data.password in ("admin123", "gurukul2026", "admin"):
        token = create_access_token({"sub": form_data.username, "role": "admin"})
        return {"access_token": token, "token_type": "bearer", "role": "admin"}
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

@router.post("/login", response_model=TokenResponse)
async def login_json(req: LoginRequest):
    if req.username in ("admin", "gurukul_admin") and req.password in ("admin123", "gurukul2026", "admin"):
        token = create_access_token({"sub": req.username, "role": "admin"})
        return {"access_token": token, "token_type": "bearer", "role": "admin"}
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid admin credentials",
    )
