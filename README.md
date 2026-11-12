# Synapse — Connecting the Unconnected

Finds mechanism-level analogies between your problem and ten other disciplines, builds an interactive knowledge graph,
proposes conceptual solutions, retrieves real papers as evidence, and exports a PDF report.
Everything AI-written is labeled; without a Gemini key the app runs in an honest **offline mode**.

## Run locally (two terminals)
```powershell
# 1) backend  (run everything from the backend folder)
cd backend
python -m venv .venv ; .venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy ..\.env.example .env        # then put GEMINI_API_KEY in backend\.env (never commit it)
python -m pytest
python scripts/check_gemini.py   # optional: confirms live Gemini; never prints the key
uvicorn app.main:app --reload    # http://localhost:8000/docs

# 2) frontend
cd frontend ; npm install ; npm run dev    # http://localhost:5173
```

## Import convention (important)
The backend root is `backend/`. Every import is `from app.x import y` (or `import app.x`). Nothing is ever `backend.app`.
Run `python scripts/check_imports.py` from `backend/` to verify; `--fix` rewrites wrong imports. Never create `backend/__init__.py`.

## Layout
`app/engines` (decomposer, analogy, solutions, fusion, evaluation, research, reverse) · `app/services` (llm, retrieval, graph, distance,
research, report, store) · `app/routers` · `app/schemas` · `app/db` · `app/seed/corpus.py` (16-mechanism starter corpus).

## Demo: "How can buildings remain cooler without consuming excessive electricity?"
Discover → Generate solutions → Evaluate → Open knowledge graph (click nodes and lines; select two concepts → Fuse) →
Research Library → Download PDF report.

## Endpoints
POST /api/discover · /api/analyze-problem · /api/explore-domains · /api/find-analogies · /api/generate-solutions · /api/fuse-ideas ·
/api/evaluate · /api/find-research · /api/simulate · /api/reverse-search · GET /api/graph/{id} · /api/discoveries · /api/discovery/{id} ·
/api/path/{id}?target= · /api/report/{id} · /api/health

## Known limitations (stated plainly)
- **Offline mode** is a keyword/TF-IDF match over a 16-entry corpus. Solutions are templates; there are no numeric scores; what-if and reverse search need Gemini.
- **Graph store is in-memory** (rebuilt from saved data). The Neo4j adapter is not built; `NEO4J_*` settings are unused.
- **Retrieval uses TF-IDF**, not sentence-transformer embeddings or ChromaDB. The `search()` function is the swap-in point.
- **Hidden-connection detection** uses graph traversal only (`/api/path`), without semantic-similarity weighting. The graph view has no "expand node" action.
- **No user accounts**; the `users` table exists but is unused. Discovery data is stored as JSON in `discoveries.problem_analysis`.
- Research needs internet. If both APIs fail, nothing is shown instead of guessing. The PDF lists graph connections as text, not an image.
- The frontend has been written but not compiled or run by the author's tooling; report any build error.
