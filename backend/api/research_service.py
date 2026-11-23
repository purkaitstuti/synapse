import httpx


OPENALEX_URL = "https://api.openalex.org/works"


def reconstruct_abstract(index):
    if not isinstance(index, dict):
        return ""

    positions = []

    for word, locations in index.items():
        if not isinstance(locations, list):
            continue

        for position in locations:
            if isinstance(position, int) and position >= 0:
                positions.append((position, word))

    positions.sort(key=lambda item: item[0])

    return " ".join(word for _, word in positions)[:500]


def search_scientific_papers(query, limit=5):
    query = str(query or "").strip()

    if not query:
        return {
            "papers": [],
            "note": "No scientific search query was provided.",
            "query": query,
        }

    limit = max(1, min(int(limit), 5))

    try:
        with httpx.Client(
            timeout=15.0,
            follow_redirects=True,
        ) as client:
            response = client.get(
                OPENALEX_URL,
                params={
                    "search": query,
                    "per-page": limit,
                },
                headers={
                    "User-Agent": "SYNAPSE-Research-Library/1.0",
                    "Accept": "application/json",
                },
            )

            response.raise_for_status()
            payload = response.json()

    except (httpx.HTTPError, ValueError) as exc:
        return {
            "papers": [],
            "note": (
                "OpenAlex could not be reached or returned an invalid "
                "response. No publications were verified."
            ),
            "query": query,
        }

    papers = []

    for work in payload.get("results", []):
        if not isinstance(work, dict):
            continue

        title = work.get("display_name") or work.get("title")
        if not title:
            continue

        authors = [
            entry["author"]["display_name"]
            for entry in work.get("authorships", [])
            if isinstance(entry, dict)
            and isinstance(entry.get("author"), dict)
            and entry["author"].get("display_name")
        ][:8]

        doi = work.get("doi") or ""
        url = doi or work.get("id") or ""

        papers.append({
            "title": title,
            "authors": authors,
            "year": work.get("publication_year"),
            "abstract": reconstruct_abstract(
                work.get("abstract_inverted_index")
            ),
            "url": url,
            "doi": doi,
            "source": "OpenAlex",
        })

    return {
        "papers": papers,
        "note": (
            "These are real publication records returned by OpenAlex. "
            "Search relevance does not establish scientific validation "
            "of the proposed innovation."
        ),
        "query": query,
    }
