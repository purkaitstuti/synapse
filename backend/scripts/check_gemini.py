"""Run from backend/:  python -m scripts.check_gemini
Verifies key loading and a real Gemini round-trip. Never prints the key."""
from app.config import ENV_FILES, settings
from app.engines.decomposer import decompose
from app.schemas.problem import ProblemInput

print("env files found:", [str(p) for p in ENV_FILES if p.exists()] or "NONE")
print("key configured :", bool(settings.gemini_api_key), "| model:", settings.gemini_model)
r = decompose(ProblemInput(description="How can buildings remain cooler without consuming excessive electricity?"))
print("source         :", r.source)
print("note           :", r.note or "-")
print("mechanisms     :", r.analysis.underlying_mechanisms)
print("root causes    :", r.analysis.root_causes)
raise SystemExit(0 if r.source == "gemini" else 1)
