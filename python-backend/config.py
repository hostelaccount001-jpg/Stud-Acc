import os

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://lmfcylkhxlruvvjmlckd.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmN5bGtoeGxydXZ2am1sY2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTgwODYsImV4cCI6MjEwMTQ5NDA4Nn0.2P8pOwbL3Vqu-g2jy7OsR6_TdrtqZsIQ07Q6nhbZj6E")

PORT = int(os.getenv("PORT", "5000"))
HOST = os.getenv("HOST", "0.0.0.0")

BIOMETRIC_STRICT_THRESHOLD = 0.38  # Cosine distance <= 0.38 (>= 82.0% confidence)
SESSION_TTL_SECONDS = 30.0
