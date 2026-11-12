import pytest

from app.services.distance import innovation_distance
from app.services.research import abstract_from_inverted, dedupe

PAYLOAD = {
    "analysis": {"main_problem": "Keep buildings cooler", "root_causes": [], "underlying_mechanisms": ["airflow"], "constraints": [],
                 "keywords": ["buildings"], "desired_outcome": ""},
    "analogies": [{"discovered_concept": "Termite mound ventilation", "external_discipline": "Biology", "mechanism": "m",
                   "shared_principle": "passive airflow", "why_meaningful": "w <b>&", "limitations": "L", "distance": "far-domain"}],
    "solutions": [{"name": "Stack vents", "description": "d", "inspiration_source": "Termite mound ventilation", "adaptation": "a",
                   "implementation": "i", "challenges": ["c"]}],
    "fusions": [], "evaluations": [{"solution": "Stack vents", "scores": {"relevance": None}, "basis": "offline_unscored"}],
    "research": {"0": {"papers": [{"title": "T", "authors": ["A"], "year": 2020, "source": "OpenAlex", "url": "http://x"}]}},
}


def test_distance_levels():
    assert innovation_distance("Biology", "Biology") == "near-domain"
    assert innovation_distance("Physics", "Chemistry") == "cross-domain"
    assert innovation_distance("Architecture", "Biology") == "far-domain"
    assert innovation_distance("", "Biology") == "unclassified"
    assert innovation_distance("Civil engineering", "Physics") == "cross-domain"


def test_abstract_reconstruction_and_dedupe():
    assert abstract_from_inverted({"cool": [1], "Keep": [0], "air": [2]}) == "Keep cool air"
    assert abstract_from_inverted(None) == ""
    ps = [{"title": "A", "doi": "10.1/x"}, {"title": "A copy", "doi": "10.1/X"}, {"title": "B", "doi": ""}]
    assert len(dedupe(ps)) == 2


def test_report_pdf_is_valid_and_handles_special_characters():
    pytest.importorskip("reportlab")
    from app.services.report import build_report_pdf
    pdf = build_report_pdf(PAYLOAD)
    assert pdf.startswith(b"%PDF") and len(pdf) > 1500


def test_report_works_on_a_fresh_discovery_with_no_solutions():
    pytest.importorskip("reportlab")
    from app.services.report import build_report_pdf
    bare = {**PAYLOAD, "solutions": [], "evaluations": [], "research": {}}
    assert build_report_pdf(bare).startswith(b"%PDF")
