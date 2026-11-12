import pytest

from app.config import settings
from app.engines import analogy
from app.schemas.problem import ProblemAnalysis, ProblemInput
from app.services.llm import LLMError

A = ProblemAnalysis(main_problem="Keep buildings cooler", underlying_mechanisms=["heat dissipation", "airflow", "insulation"],
                    keywords=["buildings", "cooler", "electricity"])
INP = ProblemInput(description="How can buildings remain cooler without excessive electricity?")


def test_offline_analogies_are_labeled_and_complete(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    res, src, note = analogy.find_analogies(A, INP)
    assert src == "offline" and note and res
    assert all(a.score_basis == "retrieval_similarity" and a.limitations and a.shared_principle for a in res)
    assert "Termite mound ventilation" in [a.discovered_concept for a in res]


def test_gemini_failure_falls_back(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "x")
    def boom(*a, **k): raise LLMError("HTTP 503")
    monkeypatch.setattr(analogy, "generate_json", boom)
    res, src, note = analogy.find_analogies(A, INP)
    assert src == "offline" and "Gemini unavailable" in note and res
