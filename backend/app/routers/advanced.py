from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.engines.evaluation import evaluate
from app.engines.research import find_evidence
from app.engines.reverse import reverse_search
from app.engines.solutions import generate_solutions
from app.routers.discover import IdBody, _get
from app.schemas.analogy import Analogy
from app.schemas.problem import ProblemAnalysis
from app.services import store
from app.services.graph import build_graph, find_path
from app.services.report import build_report_pdf

router = APIRouter(prefix="/api", tags=["advanced"])


class ResearchBody(IdBody):
    solution_index: int = Field(ge=0)


class SimBody(IdBody):
    constraint: str = Field(min_length=5)


class ReverseBody(BaseModel):
    discovery: str = Field(min_length=3)


@router.get("/discovery/{discovery_id}")
def detail(discovery_id: int, db: Session = Depends(get_db)):
    return _get(db, discovery_id).problem_analysis


@router.post("/find-research")
def find_research(body: ResearchBody, db: Session = Depends(get_db)):
    disc = _get(db, body.discovery_id)
    p = disc.problem_analysis
    if body.solution_index >= len(p.get("solutions", [])):
        raise HTTPException(400, "Generate solutions first, or the solution index is out of range.")
    res = find_evidence(p["solutions"][body.solution_index], p["analysis"])
    p.setdefault("research", {})[str(body.solution_index)] = res
    store.save(db, disc, p)
    store.save_research(db, disc.id, body.solution_index, res["papers"])
    return res


@router.post("/evaluate")
def evaluate_solutions(body: IdBody, db: Session = Depends(get_db)):
    disc = _get(db, body.discovery_id)
    p = disc.problem_analysis
    if not p.get("solutions"):
        raise HTTPException(400, "Generate solutions first.")
    evs, src, note = evaluate(p)
    p["evaluations"] = evs
    store.save(db, disc, p)
    return {"evaluations": evs, "source": src, "note": note}


@router.post("/simulate")
def simulate(body: SimBody, db: Session = Depends(get_db)):
    disc = _get(db, body.discovery_id)
    p = disc.problem_analysis
    if not p["analogies"]:
        raise HTTPException(400, "This discovery has no analogies to work from.")
    analysis = ProblemAnalysis(**p["analysis"])
    analysis.constraints = [*analysis.constraints, body.constraint]
    sols, src, note = generate_solutions(analysis, [Analogy(**a) for a in p["analogies"]])
    if src == "offline":
        note = "Constraint NOT applied: offline mode cannot re-reason about constraints. " + note
    out = {"constraint": body.constraint, "solutions": [s.model_dump() for s in sols], "source": src, "note": note}
    p.setdefault("simulations", []).append(out)
    store.save(db, disc, p)
    return out


@router.post("/reverse-search")
def reverse(body: ReverseBody):
    apps, src, note = reverse_search(body.discovery)
    return {"applications": apps, "source": src, "note": note}


@router.get("/path/{discovery_id}")
def path(discovery_id: int, target: str, db: Session = Depends(get_db)):
    g = build_graph(_get(db, discovery_id).problem_analysis)
    nodes = find_path(g, "problem", target)
    if not nodes:
        raise HTTPException(404, "No path to that node.")
    lab = {n["id"]: n["label"] for n in g["nodes"]}
    hops = []
    for a, b in zip(nodes, nodes[1:]):
        e = next(e for e in g["edges"] if {e["source"], e["target"]} == {a, b})
        hops.append({"from": lab[a], "to": lab[b], "type": e["type"], "explanation": e["explanation"]})
    return {"hops": hops}


@router.get("/report/{discovery_id}")
def report(discovery_id: int, db: Session = Depends(get_db)):
    pdf = build_report_pdf(_get(db, discovery_id).problem_analysis)
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="synapse-report-{discovery_id}.pdf"'})
