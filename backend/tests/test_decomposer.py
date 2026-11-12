import pytest
from pydantic import ValidationError

from app.config import settings
from app.engines import decomposer
from app.schemas.problem import ProblemInput
from app.services.llm import LLMError


@pytest.fixture(autouse=True)
def no_key(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")


def test_building_cooling_yields_expected_mechanisms():
    r = decomposer.decompose(ProblemInput(description="How can buildings remain cooler without consuming excessive electricity?"))
    assert r.source == "offline" and r.note
    m = r.analysis.underlying_mechanisms
    assert {"heat absorption", "heat dissipation", "airflow", "insulation"} <= set(m)
    assert "buildings" in r.analysis.keywords


def test_too_short_input_rejected():
    with pytest.raises(ValidationError):
        ProblemInput(description="hi")


def test_gemini_failure_falls_back(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "x")
    def boom(*a, **k): raise LLMError("timeout")
    monkeypatch.setattr(decomposer, "generate_json", boom)
    r = decomposer.decompose(ProblemInput(description="Reduce traffic congestion in crowded cities"))
    assert r.source == "offline" and "Gemini unavailable" in r.note
    assert "flow routing" in r.analysis.underlying_mechanisms


def test_gemini_success_is_labeled(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "x")
    from app.schemas.problem import ProblemAnalysis
    monkeypatch.setattr(decomposer, "generate_json", lambda p, v: ProblemAnalysis(main_problem="m"))
    r = decomposer.decompose(ProblemInput(description="Reduce traffic congestion in crowded cities"))
    assert r.source == "gemini"
