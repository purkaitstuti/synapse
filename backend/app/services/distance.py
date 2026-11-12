"""Innovation distance: an exploration indicator, NOT a measure of originality."""
GROUPS = {"Biology": "life", "Ecology": "life", "Economics": "social", "Psychology": "social",
          "Mathematics": "formal", "Computer Science": "formal",
          "Physics": "physical", "Chemistry": "physical", "Engineering": "physical", "Architecture": "physical"}


def _match(text: str) -> str | None:
    t = text.strip().lower()
    for k in GROUPS:
        if t and (k.lower() in t or t in k.lower()):
            return k
    return None


def innovation_distance(primary: str, domain: str) -> str:
    p, d = _match(primary or ""), _match(domain or "")
    if not p or not d:
        return "unclassified"
    if p == d:
        return "near-domain"
    return "cross-domain" if GROUPS[p] == GROUPS[d] else "far-domain"
