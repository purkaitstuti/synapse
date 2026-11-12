from fastapi import APIRouter

from app.engines.decomposer import decompose
from app.schemas.problem import AnalyzeResponse, ProblemInput

router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/analyze-problem", response_model=AnalyzeResponse)
def analyze_problem(body: ProblemInput) -> AnalyzeResponse:
    return decompose(body)
