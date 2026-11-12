from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import ENV_FILES, settings
from app.db import models  # noqa: F401  (registers tables)
from app.db.session import Base, engine
from app.routers import discover
from app.routers import advanced, analogies, analyze


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="Synapse API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(analyze.router)
app.include_router(analogies.router)
app.include_router(discover.router)
app.include_router(advanced.router)


@app.get("/api/health")
def health():
    with engine.connect() as c:
        c.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "ai_mode": settings.ai_mode,              # live (Gemini) | offline (seed corpus)
        "graph_backend": settings.graph_backend,  # neo4j | in-memory
        "database": engine.dialect.name,
        "gemini_key_configured": bool(settings.gemini_api_key),  # never the key itself
        "env_files_found": [str(p) for p in ENV_FILES if p.exists()],
    }
