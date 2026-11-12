"""Engine 1: Intelligent Problem Decomposer. Gemini when configured, heuristic otherwise."""
import re

from app.config import settings
from app.schemas.problem import AnalyzeResponse, ProblemAnalysis, ProblemInput
from app.services.llm import LLMError, generate_json

PROMPT = """You are the problem-decomposition stage of a cross-disciplinary innovation tool.
Analyze the problem and focus on underlying PHYSICAL/SYSTEMIC MECHANISMS, not surface wording.
Return ONLY JSON with exactly these keys:
main_problem (string), root_causes (string[]), underlying_mechanisms (string[]),
keywords (string[]), constraints (string[]), desired_outcome (string), technical_concepts (string[]).

PROBLEM:
{problem}"""

STOP = set("""a an the and or of to in on for with without how can we do does is are be by at as it its this that
from into than then so such too very more most less much many what which who why when where our your their
should could would will not no using use make get reduce increase""".split())

# Offline lexicon: trigger word -> mechanisms it usually implies. Heuristic, not reasoning.
LEXICON = {
    ("cool", "heat", "hot", "temperature", "thermal"): ["heat absorption", "heat dissipation", "airflow", "insulation"],
    ("traffic", "congestion", "queue", "crowd", "flow"): ["flow routing", "bottleneck formation", "decentralized coordination"],
    ("water", "drought", "irrigation", "moisture"): ["water retention", "evaporation", "capture and distribution"],
    ("energy", "electricity", "power", "battery"): ["energy generation", "energy storage", "energy loss"],
    ("waste", "recycle", "pollution", "plastic"): ["material degradation", "separation and sorting", "resource recovery"],
    ("noise", "sound", "vibration"): ["wave propagation", "absorption and damping"],
    ("infection", "disease", "virus", "spread"): ["transmission networks", "immune response"],
}
CONSTRAINT_WORDS = ("without", "limited", "low", "cheap", "only", "no ", "offline", "budget", "must")


def _words(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z][a-zA-Z\-]{2,}", text.lower())


def _offline(inp: ProblemInput) -> ProblemAnalysis:
    text = inp.as_text()
    words = _words(text)
    keywords = []
    for w in words:
        if w not in STOP and w not in keywords:
            keywords.append(w)
    mechs: list[str] = []
    for triggers, ms in LEXICON.items():
        if any(any(w.startswith(t) for w in words) for t in triggers):
            mechs += [m for m in ms if m not in mechs]
    constraints = [s.strip() for s in re.split(r"[.;\n]", text)
                   if any(c in s.lower() for c in CONSTRAINT_WORDS) and len(s.strip()) > 8]
    constraints += [x for x in (inp.budget_constraints, inp.resource_limitations) if x.strip()]
    main = (inp.title or inp.description).strip()
    return ProblemAnalysis(
        main_problem=main, root_causes=[], underlying_mechanisms=mechs, keywords=keywords[:12],
        constraints=constraints[:6], desired_outcome=inp.desired_outcome.strip(),
        technical_concepts=mechs,
    )


def decompose(inp: ProblemInput) -> AnalyzeResponse:
    if settings.gemini_api_key:
        try:
            analysis = generate_json(PROMPT.format(problem=inp.as_text()),
                                     lambda d: ProblemAnalysis.model_validate(d))
            return AnalyzeResponse(analysis=analysis, source="gemini")
        except LLMError as e:
            return AnalyzeResponse(analysis=_offline(inp), source="offline", note=f"Gemini unavailable ({e}); used offline heuristics.")
    return AnalyzeResponse(
        analysis=_offline(inp), source="offline",
        note="No GEMINI_API_KEY set. Offline mode uses keyword heuristics; root causes need a live model.",
    )
