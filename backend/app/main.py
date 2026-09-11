from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine
from app.api.router import api_router

app = FastAPI(
    title="NEXGram API",
    description="Backend API for NEXGram B2B Commerce Ecosystem",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], # explicitly allow vite frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/health")
def health_check():
    # Basic check to see if we can connect to the DB
    try:
        with engine.connect() as conn:
            pass
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
        
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "database": db_status
    }
