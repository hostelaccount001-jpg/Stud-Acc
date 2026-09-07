import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    APP_NAME: str = "Gurukul Student ERP & Kiosk Backend"
    APP_VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    
    # Supabase Credentials
    SUPABASE_URL: str = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL", "https://jjkxtgtbogtzhbuxutag.supabase.co")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_PUBLISHABLE_KEY: str = os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY", "")
    
    # JWT Security Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "gurukul-super-secure-jwt-secret-key-2026-production-ready")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Hardware Integration Defaults
    THERMAL_PRINTER_NAME: str = os.getenv("THERMAL_PRINTER_NAME", "POS58")
    MANTRA_SERVICE_URL: str = os.getenv("MANTRA_SERVICE_URL", "http://127.0.0.1:11100")
    
    class Config:
        case_sensitive = True

settings = Settings()
