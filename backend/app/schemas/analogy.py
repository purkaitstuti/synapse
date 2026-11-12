from typing import Literal

from pydantic import BaseModel

from app.schemas.problem import ProblemAnalysis


class Analogy(BaseModel):
    original_problem: str
    external_discipline: str
    discovered_concept: str
    mechanism: str
    shared_principle: str
    why_meaningful: str
    how_to_adapt: str
    limitations: str
    relevance_score: float  # 0-1
    score_basis: Literal["retrieval_similarity", "ai_estimate"]


class FindResponse(BaseModel):
    analysis: ProblemAnalysis
    analysis_source: Literal["gemini", "offline"]
    analysis_note: str = ""
    analogies: list[Analogy]
    analogy_source: Literal["gemini", "offline"]
    analogy_note: str = ""
