from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite:///./nexgram_dev.db" # Defaulting to sync sqlite for simplicity in MVP
    
    # Alembic relies on sync, and FastAPI can use async or sync.
    # To keep things straightforward and aligned with the "avoid overengineering" principle,
    # we'll use sync SQLAlchemy 2.0. If async is needed later, we can switch to asyncpg/aiosqlite.

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
