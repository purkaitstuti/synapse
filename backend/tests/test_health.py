from fastapi.testclient import TestClient

from app.db.session import Base
from app.main import app


def test_health_reports_modes():
    with TestClient(app) as c:
        r = c.get("/api/health")
    assert r.status_code == 200
    assert r.json()["ai_mode"] in {"live", "offline"}


def test_schema_has_all_tables():
    expected = {"users", "projects", "discoveries", "analogies", "solutions", "research"}
    assert expected <= set(Base.metadata.tables)


def test_env_paths_are_absolute_and_key_is_read(tmp_path):
    from app.config import ENV_FILES, Settings
    assert all(p.is_absolute() for p in ENV_FILES)
    f = tmp_path / ".env"
    f.write_text('GEMINI_API_KEY= "dummy-value" \n', encoding="utf-8-sig")
    assert Settings(_env_file=f).gemini_api_key == "dummy-value"
