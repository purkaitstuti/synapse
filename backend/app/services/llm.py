import json
import re
import time

import httpx

from app.config import settings

URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
RETRY_STATUS = {429, 500, 502, 503, 504}  # temporary overload / server errors
BACKOFF = (2, 4, 8)                       # seconds to wait before each retry


class LLMError(RuntimeError):
    pass


def _parse_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    return json.loads(text)


def _post(prompt: str, timeout: float, model: str) -> str:
    """One Gemini call, retrying temporary failures (e.g. HTTP 503 'high demand')."""
    for i in range(len(BACKOFF) + 1):
        try:
            r = httpx.post(
                URL.format(model=model),
                headers={"x-goog-api-key": settings.gemini_api_key},
                json={"contents": [{"parts": [{"text": prompt}]}],
                      "generationConfig": {"responseMimeType": "application/json", "temperature": 0.4}},
                timeout=timeout,
            )
            r.raise_for_status()
            return r.json()["candidates"][0]["content"]["parts"][0]["text"]
        except httpx.HTTPStatusError as e:
            code = e.response.status_code
            if code in RETRY_STATUS and i < len(BACKOFF):
                time.sleep(BACKOFF[i])
                continue
            try:
                detail = e.response.json()["error"]["message"][:160]
            except Exception:
                detail = ""
            raise LLMError(f"Gemini HTTP {code}: {detail}".strip()) from e
        except httpx.TransportError as e:  # timeouts, connection resets
            if i < len(BACKOFF):
                time.sleep(BACKOFF[i])
                continue
            raise LLMError(f"Gemini request failed: {type(e).__name__}") from e
    raise LLMError("Gemini request failed")


def _post_any(prompt: str, timeout: float) -> str:
    models = [settings.gemini_model] + [m.strip() for m in settings.gemini_fallback_models.split(",") if m.strip()]
    err = None
    for m in models:
        try:
            return _post(prompt, timeout, m)
        except LLMError as e:
            err = e
    raise err


def generate_json(prompt: str, validate, timeout: float = 30.0):
    """Call Gemini, parse JSON, run `validate(dict)`. One repair retry on bad output."""
    if not settings.gemini_api_key:
        raise LLMError("GEMINI_API_KEY is not set")
    last_err = ""
    for attempt in range(2):
        p = prompt if attempt == 0 else f"{prompt}\n\nYour previous reply was invalid ({last_err}). Return ONLY valid JSON."
        try:
            return validate(_parse_json(_post_any(p, timeout)))
        except (KeyError, IndexError, ValueError) as e:
            last_err = str(e)[:200]
    raise LLMError(f"Gemini returned invalid output twice: {last_err}")
