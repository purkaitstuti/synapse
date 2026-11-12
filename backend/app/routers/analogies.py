from fastapi import APIRouter

from app.engines.analogy import explore, find_analogies
from app.engines.decomposer import decompose
from app.schemas.analogy import FindResponse
from app.schemas.problem import ProblemInput

router = APIRouter(prefix="/api", tags=["analogies"])


@router.post("/find-analogies", response_model=FindResponse)
def find(body: ProblemInput) -> FindResponse:
    d = decompose(body)
    analogies, src, note = find_analogies(d.analysis, body)
    return FindResponse(analysis=d.analysis, analysis_source=d.source, analysis_note=d.note,
                        analogies=analogies, analogy_source=src, analogy_note=note)


@router.post("/explore-domains")
def explore_domains(body: ProblemInput):
    d = decompose(body)
    return {"candidates": [{"concept": c["concept"], "domain": c["domain"], "similarity": s, "shared_terms": t}
                           for c, s, t in explore(d.analysis, body)]}
