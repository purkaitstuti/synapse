from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
# Absolute paths, so loading never depends on the directory uvicorn/pytest is started from.
# Later files override earlier ones: backend/.env wins over <project>/.env.
ENV_FILES = (BACKEND_DIR.parent / ".env", BACKEND_DIR / ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILES,
        env_file_encoding="utf-8-sig",  # tolerates the BOM that Windows editors add
        env_ignore_empty=True,          # an empty OS variable must not mask the .env value
        extra="ignore",
    )

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.8-flash"
    gemini_fallback_models: str = ""  # comma-separated, tried if the main model keeps failing
    database_url: str = "sqlite:///./synapse.db"
    neo4j_uri: str = ""
    neo4j_user: str = "neo4j"
    neo4j_password: str = ""
    chroma_path: str = "./.chroma"
    openalex_mailto: str = ""
    semantic_scholar_api_key: str = ""
    cors_origins: str = "http://localhost:5173"

    @field_validator("gemini_api_key", "gemini_model", mode="before")
    @classmethod
    def _clean(cls, v):
        return v.strip().strip("\"'") if isinstance(v, str) else v

    @property
    def ai_mode(self) -> str:
        return "live" if self.gemini_api_key else "offline"

    @property
    def graph_backend(self) -> str:
        return "in-memory"  # Neo4j adapter not built yet; NEO4J_* settings are currently unused


settings = Settings()
