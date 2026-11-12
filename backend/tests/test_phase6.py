import pytest

from app.config import settings
from app.engines.fusion import fuse
from app.engines.solutions import generate_solutions
from app.schemas.analogy import Analogy
from app.schemas.problem import ProblemAnalysis

A = ProblemAnalysis(main_problem="Keep buildings cooler")


def an(name, principle, mech):
    return Analogy(original_problem="p", external_discipline="X", discovered_concept=name, mechanism=mech,
                   shared_principle=principle, why_meaningful="w", how_to_adapt="Do the thing", limitations="Limits",
                   relevance_score=0.4, score_basis="retrieval_similarity")


@pytest.fixture(autouse=True)
def offline(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")


def test_offline_solutions_are_conceptual_and_labeled():
    sols, src, note = generate_solutions(A, [an("Termite mound", "passive airflow", "convection")])
    assert src == "offline" and note and sols[0].status == "conceptual" and sols[0].inspiration_source == "Termite mound"


def test_offline_fusion_finds_common_terms():
    f, note = fuse(A, [an("Termite mound", "passive airflow regulation", "convection"), an("Wind catcher", "passive airflow capture", "wind")])
    assert f.source == "offline" and f.selected_concepts == ["Termite mound", "Wind catcher"]
    assert "passive" in f.common_mechanisms and f.status == "conceptual"
