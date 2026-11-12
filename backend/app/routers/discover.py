from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.models import Discovery
from app.db.session import get_db
from app.engines.analogy import find_analogies
from app.engines.decomposer import decompose
from app.engines.fusion import fuse
from app.engines.solutions import generate_solutions
from app.schemas.analogy import Analogy
from app.schemas.problem import ProblemAnalysis, ProblemInput
from app.services import store
from app.services.distance import innovation_distance
from app.services.graph import build_graph

router = APIRouter(prefix="/api", tags=["discovery"])
KEYS = ("analysis", "analysis_source", "analysis_note", "analogies", "analogy_source", "analogy_note")


class IdBody(BaseModel):
    discovery_id: int


class FuseBody(IdBody):
    concepts: list[str] = Field(min_length=2)


def _get(db: Session, did: int) -> Discovery:
    d = db.get(Discovery, did)
    if not d:
        raise HTTPException(404, f"Discovery {did} not found")
    return d


@router.post("/discover")
def discover(body: ProblemInput, db: Session = Depends(get_db)):
    d = decompose(body)
    analogies, src, note = find_analogies(d.analysis, body)
    payload = {"analysis": d.analysis.model_dump(), "analysis_source": d.source, "analysis_note": d.note,
               "primary_discipline": body.primary_discipline,
               "analogies": [{**a.model_dump(), "distance": innovation_distance(body.primary_discipline, a.external_discipline)} for a in analogies], "analogy_source": src, "analogy_note": note,
               "solutions": [], "fusions": []}
    did = store.create(db, body, payload)
    return {"discovery_id": did, **{k: payload[k] for k in KEYS}, "graph": build_graph(payload)}


@router.get("/discoveries")
def discoveries(db: Session = Depends(get_db)):
    return store.listing(db)


@router.get("/graph/{discovery_id}")
def graph(discovery_id: int, db: Session = Depends(get_db)):
    return build_graph(_get(db, discovery_id).problem_analysis)


@router.post("/generate-solutions")
def solutions(body: IdBody, db: Session = Depends(get_db)):
    disc = _get(db, body.discovery_id)
    p = disc.problem_analysis
    if not p["analogies"]:
        raise HTTPException(400, "This discovery has no analogies to build solutions from.")
    sols, src, note = generate_solutions(ProblemAnalysis(**p["analysis"]), [Analogy(**a) for a in p["analogies"]])
    by = {a["discovered_concept"]: a["external_discipline"] for a in p["analogies"]}
    p["solutions"] = [{**s.model_dump(), "pathway": by.get(s.inspiration_source, "")} for s in sols]
    p["evaluations"], p["research"] = [], {}
    store.save(db, disc, p, p["solutions"])
    return {"solutions": p["solutions"], "source": src, "note": note, "graph": build_graph(p)}


@router.post("/fuse-ideas")
def fuse_ideas(body: FuseBody, db: Session = Depends(get_db)):
    disc = _get(db, body.discovery_id)
    p = disc.problem_analysis
    by_name = {a["discovered_concept"]: Analogy(**a) for a in p["analogies"]}
    missing = [c for c in body.concepts if c not in by_name]
    if missing:
        raise HTTPException(400, f"Unknown concepts for this discovery: {', '.join(missing)}")
    fusion, note = fuse(ProblemAnalysis(**p["analysis"]), [by_name[c] for c in body.concepts])
    p["fusions"].append(fusion.model_dump())
    store.save(db, disc, p)
    return {"fusion": fusion.model_dump(), "note": note, "graph": build_graph(p)}
