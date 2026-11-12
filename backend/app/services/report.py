"""Innovation report (PDF) built from a discovery payload dict."""
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from app.services.graph import build_graph

ROADMAP = ["Validate the mechanism: confirm the source principle in the literature listed above.",
           "Define a baseline and one success metric for the original problem.",
           "Build a small-scale prototype of the most promising solution.",
           "Test against the baseline under your stated constraints and record results.",
           "Iterate or combine concepts (see fusions), then pilot at larger scale."]


def build_report_pdf(p: dict) -> bytes:
    ss = getSampleStyleSheet()
    out: list = []

    def h(t): out.extend([Spacer(1, 10), Paragraph(escape(t), ss["Heading2"])])
    def para(t, style="BodyText"): out.append(Paragraph(escape(str(t)), ss[style]))
    def bullets(items):
        for i in items:
            para("• " + str(i))

    a = p["analysis"]
    para("Synapse Innovation Report", "Title")
    para("Solutions and scores below are conceptual or AI-generated estimates, not validated results.", "Italic")
    h("1. Original problem"); para(a["main_problem"])
    if a.get("desired_outcome"): para("Desired outcome: " + a["desired_outcome"])
    h("2. Problem decomposition")
    for label, key in (("Root causes", "root_causes"), ("Mechanisms", "underlying_mechanisms"), ("Constraints", "constraints"), ("Keywords", "keywords")):
        para(f"{label}:", "Heading4"); bullets(a.get(key) or ["None identified"])
    h("3. Disciplines explored")
    para(", ".join(sorted({x["external_discipline"] for x in p["analogies"]})) or "None matched strongly enough.")
    h("4. Discovered analogies")
    for x in p["analogies"]:
        para(f"{x['discovered_concept']} ({x['external_discipline']}, {x.get('distance', 'unclassified')})", "Heading4")
        para("Shared principle: " + x["shared_principle"]); para("Why it matches: " + x["why_meaningful"]); para("Limits: " + x["limitations"])
    h("5. Knowledge graph (key connections)")
    g = build_graph(p); lab = {n["id"]: n["label"] for n in g["nodes"]}
    para(f"{len(g['nodes'])} nodes, {len(g['edges'])} connections. Interactive graph is available in the app.")
    bullets(f"{lab[e['source']]} —{e['type']}→ {lab[e['target']]}: {e['explanation'][:140]}" for e in g["edges"])
    h("6. Generated solutions (conceptual)")
    for s in p.get("solutions", []) or []:
        para(s["name"], "Heading4"); para(s["description"]); para("Implementation: " + s["implementation"])
        bullets(["Challenge: " + c for c in s["challenges"]])
    if not p.get("solutions"): para("No solutions generated yet.")
    h("7. Idea fusion results")
    for f in p.get("fusions", []) or []:
        para(f["name"], "Heading4"); para(f["proposed_innovation"]); para("Logic: " + f["combination_logic"])
    if not p.get("fusions"): para("No fusions created.")
    h("8. Evaluation (AI-generated estimates)")
    for e in p.get("evaluations", []) or []:
        sc = ", ".join(f"{k} {v}" for k, v in e["scores"].items() if v is not None) or "not scored (offline)"
        para(f"{e['solution']}: {sc}")
    if not p.get("evaluations"): para("Not evaluated yet.")
    h("9. Research references (retrieved)")
    papers = [pp for r in (p.get("research") or {}).values() for pp in r["papers"]]
    for pp in papers:
        para(f"{pp['title']} ({pp.get('year') or 'n.d.'}), {', '.join(pp['authors'][:3])}. {pp['source']}. {pp['url']}")
    if not papers: para("No research retrieved yet.")
    h("10. Challenges")
    bullets({c for s in p.get("solutions", []) or [] for c in s["challenges"]} | {x["limitations"] for x in p["analogies"]})
    h("11. Implementation roadmap (generic template, not generated from your data)")
    bullets(ROADMAP)
    buf = BytesIO()
    SimpleDocTemplate(buf, pagesize=A4, title="Synapse Innovation Report").build(out)
    return buf.getvalue()
