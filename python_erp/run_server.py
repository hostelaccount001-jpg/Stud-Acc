import uvicorn
import sys
import os

# Add parent directory to python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings

if __name__ == "__main__":
    print("=" * 65)
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"   API Server: http://127.0.0.1:{settings.PORT}")
    print(f"   Interactive Swagger Docs: http://127.0.0.1:{settings.PORT}{settings.API_PREFIX}/docs")
    print("=" * 65)
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=1
    )
