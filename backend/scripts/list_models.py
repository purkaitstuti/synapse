"""python scripts/list_models.py  -> model names your key can call for generateContent (never prints the key)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import httpx

from app.config import settings

r = httpx.get("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
              headers={"x-goog-api-key": settings.gemini_api_key}, timeout=30)
r.raise_for_status()
for m in r.json().get("models", []):
    if "generateContent" in m.get("supportedGenerationMethods", []):
        print(m["name"].removeprefix("models/"))
