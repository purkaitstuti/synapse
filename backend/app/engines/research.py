"""Engine 8: research evidence. Papers are retrieved; interpretations are AI-written and labeled."""
from pydantic import BaseModel

from app.config import settings
from app.services.llm import LLMError, generate_json
from app.services.research import search_papers

PROMPT = """For each paper below, using ONLY its abstract, write (a) relevant_finding: one sentence on what it found,
(b) connection: one sentence on how it relates to this proposed solution: {solution}.
If the abstract is empty, write "No abstract available." for both. Return ONLY JSON:
{{"items":[{{"relevant_finding":str,"connection":str}}]}} with exactly {n} items, in order.
PAPERS: {papers}"""


class _Item(BaseModel):
    relevant_finding: str
    connection: str


class _Out(BaseModel):
    items: list[_Item]


def find_evidence(solution: dict, analysis: dict) -> dict:
    mech = (analysis.get("underlying_mechanisms") or [""])[0]
    query = f"{solution['inspiration_source']} {mech}".strip()
    papers, notes = search_papers(query)
    if not papers:
        notes.append("No papers retrieved; nothing is shown rather than guessing.")
        return {"query": query, "papers": [], "note": " ".join(notes)}
    if settings.gemini_api_key:
        brief = [{"title": p["title"], "abstract": p["abstract"]} for p in papers]
        try:
            out = generate_json(PROMPT.format(solution=solution["name"], n=len(papers), papers=brief),
                                lambda d: _Out.model_validate(d))
            if len(out.items) != len(papers):
                raise ValueError("wrong item count")
            papers = [{**p, "ai_interpretation": {**i.model_dump(), "basis": "AI interpretation of the abstract, not a finding of the paper"}}
                      for p, i in zip(papers, out.items)]
        except (LLMError, ValueError) as e:
            notes.append(f"Interpretation unavailable ({e}).")
    else:
        notes.append("No GEMINI_API_KEY: papers shown without AI interpretation.")
    return {"query": query, "papers": papers, "note": " ".join(notes)}
