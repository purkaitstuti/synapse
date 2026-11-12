import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.db.session import Base, get_db
from app.main import app

PROBLEM = {"description": "How can buildings remain cooler without consuming excessive electricity?", "primary_discipline": "Architecture"}


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    eng = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(eng)
    Session = sessionmaker(bind=eng)

    def override():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_full_offline_flow(client, monkeypatch):
    r = client.post("/api/discover", json=PROBLEM)
    assert r.status_code == 200
    d = r.json(); did = d["discovery_id"]
    names = [a["discovered_concept"] for a in d["analogies"]]
    assert "Termite mound ventilation" in names and all(a["distance"] for a in d["analogies"])
    assert {"problem", "concept", "analogy", "discipline"} <= {n["kind"] for n in d["graph"]["nodes"]}

    s = client.post("/api/generate-solutions", json={"discovery_id": did}).json()
    assert s["solutions"] and all(x["status"] == "conceptual" and x["pathway"] for x in s["solutions"])

    f = client.post("/api/fuse-ideas", json={"discovery_id": did, "concepts": names[:2]}).json()
    assert f["fusion"]["status"] == "conceptual"
    assert any(n["id"].startswith("fusion:") for n in f["graph"]["nodes"])

    e = client.post("/api/evaluate", json={"discovery_id": did}).json()
    assert e["source"] == "offline" and all(v is None for ev in e["evaluations"] for v in ev["scores"].values())

    monkeypatch.setattr("app.engines.research.search_papers",
                        lambda q, limit=5: ([{"title": "Real paper", "authors": ["A"], "year": 2019, "abstract": "x",
                                              "url": "http://x", "doi": "", "source": "OpenAlex", "type": "retrieved"}], []))
    rs = client.post("/api/find-research", json={"discovery_id": did, "solution_index": 0}).json()
    assert rs["papers"][0]["type"] == "retrieved"

    sim = client.post("/api/simulate", json={"discovery_id": did, "constraint": "What if electricity is unavailable?"}).json()
    assert sim["note"].startswith("Constraint NOT applied")

    pdf = client.get(f"/api/report/{did}")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")
    assert client.get(f"/api/graph/{did}").status_code == 200
    assert any(i["id"] == did for i in client.get("/api/discoveries").json())


def test_errors_are_clean(client):
    assert client.get("/api/graph/999").status_code == 404
    assert client.post("/api/discover", json={"description": "hi"}).status_code == 422
    assert client.post("/api/generate-solutions", json={"discovery_id": 999}).status_code == 404
    assert client.post("/api/reverse-search", json={"discovery": "Self-healing materials"}).json()["applications"] == []


def test_changes_are_persisted_between_requests(client):
    did = client.post("/api/discover", json=PROBLEM).json()["discovery_id"]
    client.post("/api/generate-solutions", json={"discovery_id": did})
    detail = client.get(f"/api/discovery/{did}").json()
    assert detail["solutions"], "solutions were not saved to the database"
