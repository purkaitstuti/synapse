import json

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.db.models import Analogy, Discovery, Project, Research, Solution


def create(db: Session, inp, payload: dict) -> int:
    proj = Project(title=(inp.title or inp.description)[:80] or "Untitled", description=inp.description,
                   discipline=inp.primary_discipline)
    disc = Discovery(project=proj, problem_analysis=payload)  # full payload lives in this JSON column
    db.add(disc)
    db.flush()
    for a in payload["analogies"]:
        db.add(Analogy(discovery_id=disc.id, source_concept=a["discovered_concept"], source_domain=a["external_discipline"],
                       shared_mechanism=a["shared_principle"], relevance_score=a["relevance_score"]))
    db.commit()
    return disc.id


def save(db: Session, disc: Discovery, payload: dict, new_solutions=()) -> None:
    disc.problem_analysis = json.loads(json.dumps(payload))
    # Callers edit the loaded dict in place, so the new value compares equal to the old one and SQLAlchemy
    # would skip the UPDATE. Force it.
    flag_modified(disc, "problem_analysis")
    if new_solutions:
        ids = [r.id for r in db.query(Solution).filter_by(discovery_id=disc.id)]
        if ids:
            db.query(Research).filter(Research.solution_id.in_(ids)).delete(synchronize_session=False)
            db.query(Solution).filter(Solution.id.in_(ids)).delete(synchronize_session=False)
    for s in new_solutions:
        db.add(Solution(discovery_id=disc.id, title=s["name"], description=s["description"]))
    db.commit()


def listing(db: Session) -> list[dict]:
    rows = db.query(Discovery).order_by(Discovery.id.desc()).limit(50).all()
    return [{"id": d.id, "title": d.project.title, "created_at": d.created_at.isoformat(),
             "analogies": len(d.problem_analysis.get("analogies", [])),
             "solutions": len(d.problem_analysis.get("solutions", []))} for d in rows]


def save_research(db: Session, discovery_id: int, index: int, papers: list[dict]) -> None:
    rows = db.query(Solution).filter_by(discovery_id=discovery_id).order_by(Solution.id).all()
    if index >= len(rows):
        return
    db.query(Research).filter_by(solution_id=rows[index].id).delete()
    for p in papers:
        db.add(Research(solution_id=rows[index].id, paper_title=p["title"], source_url=p["url"], publication_year=p["year"]))
    db.commit()
