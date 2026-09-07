import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger("python_erp.database")

_supabase_client = None

def get_supabase_client():
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    try:
        from supabase import create_client, Client
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_PUBLISHABLE_KEY
        if url and key:
            _supabase_client = create_client(url, key)
            logger.info("Supabase client initialized successfully.")
            return _supabase_client
        else:
            logger.warning("Supabase URL or Key not set in environment.")
            return None
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None
