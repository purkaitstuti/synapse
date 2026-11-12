"""Retrieves real papers from OpenAlex and Semantic Scholar. Never invents papers."""


def abstract_from_inverted(idx: dict | None) -> str:
    if not idx:
        return ""
    return " ".join(w for _, w in sorted((p, w) for w, ps in idx.items() for p in ps))


def dedupe(papers: list[dict]) -> list[dict]:
    seen, out = set(), []
    for p in papers:
        key = (p.get("doi") or p["title"]).lower().strip()
        if key and key not in seen:
            seen.add(key)
            out.append(p)
    return out


def search_papers(query: str, limit: int = 5):
    """Returns (papers, notes). Failures become notes, not exceptions."""
    import httpx

    from app.config import settings

    papers, notes = [], []
    try:
        params = {"search": query, "per-page": limit,
                  "select": "id,doi,title,publication_year,authorships,abstract_inverted_index,primary_location"}
        if settings.openalex_mailto:
            params["mailto"] = settings.openalex_mailto
        r = httpx.get("https://api.openalex.org/works", params=params, timeout=20)
        r.raise_for_status()
        for w in r.json().get("results", []):
            doi = (w.get("doi") or "").replace("https://doi.org/", "")
            papers.append({"title": w.get("title") or "", "authors": [a["author"]["display_name"] for a in w.get("authorships", [])[:6]],
                           "year": w.get("publication_year"), "abstract": abstract_from_inverted(w.get("abstract_inverted_index"))[:500],
                           "url": w.get("doi") or (w.get("primary_location") or {}).get("landing_page_url") or w.get("id", ""),
                           "doi": doi, "source": "OpenAlex"})
    except Exception as e:
        notes.append(f"OpenAlex unavailable ({type(e).__name__})")
    try:
        headers = {"x-api-key": settings.semantic_scholar_api_key} if settings.semantic_scholar_api_key else {}
        r = httpx.get("https://api.semanticscholar.org/graph/v1/paper/search", headers=headers, timeout=20,
                      params={"query": query, "limit": limit, "fields": "title,year,authors,abstract,externalIds,url"})
        r.raise_for_status()
        for w in r.json().get("data", []):
            papers.append({"title": w.get("title") or "", "authors": [a.get("name", "") for a in (w.get("authors") or [])[:6]],
                           "year": w.get("year"), "abstract": (w.get("abstract") or "")[:500], "url": w.get("url") or "",
                           "doi": (w.get("externalIds") or {}).get("DOI", ""), "source": "Semantic Scholar"})
    except Exception as e:
        notes.append(f"Semantic Scholar unavailable ({type(e).__name__})")
    papers = [{**p, "type": "retrieved"} for p in dedupe([p for p in papers if p["title"]])[:6]]
    return papers, notes
