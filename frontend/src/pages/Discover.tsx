import { useState } from "react";
import { Link } from "react-router-dom";
import SolutionsPanel from "../components/SolutionsPanel";

type Analysis = {
  main_problem: string; root_causes: string[]; underlying_mechanisms: string[];
  keywords: string[]; constraints: string[]; desired_outcome: string; technical_concepts: string[];
};
type Analogy = {
  external_discipline: string; discovered_concept: string; mechanism: string; shared_principle: string;
  why_meaningful: string; how_to_adapt: string; limitations: string; relevance_score: number;
  score_basis: "retrieval_similarity" | "ai_estimate"; distance?: string;
};
type Result = {
  id: number; analysis: Analysis; source: "gemini" | "offline"; note: string;
  analogies: Analogy[]; aSource: "gemini" | "offline"; aNote: string;
};

const FIELDS = [
  ["title", "Problem title"], ["primary_discipline", "Primary discipline"],
  ["desired_outcome", "Desired outcome"], ["budget_constraints", "Budget constraints"],
  ["resource_limitations", "Resource limitations"], ["location_context", "Location or context"],
  ["additional_requirements", "Additional requirements"],
] as const;

const inputCls = "mt-1 w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-white";

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-cyan-300">{title}</h3>
      {items.length === 0 ? <p className="mt-1 text-sm text-slate-500">None found.</p> : (
        <ul className="mt-1 flex flex-wrap gap-2">
          {items.map((x) => <li key={x} className="rounded-full bg-white/5 px-3 py-1 text-sm">{x}</li>)}
        </ul>
      )}
    </div>
  );
}

export default function Discover() {
  const [form, setForm] = useState<Record<string, string>>({ description: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setRes(null);
    try {
      const r = await fetch("/api/discover", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new Error(body?.detail?.[0]?.msg ?? `Request failed (${r.status})`);
      setRes({ id: body.discovery_id, analysis: body.analysis, source: body.analysis_source, note: body.analysis_note,
        analogies: body.analogies, aSource: body.analogy_source, aNote: body.analogy_note });
    } catch (err) {
      setError(err instanceof TypeError
        ? "Cannot reach the backend. Start it with: uvicorn app.main:app --reload (in backend/)."
        : (err as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-white">Discover</h1>
      <p className="mt-1 text-slate-400">Describe a problem. Synapse breaks it into mechanisms, then looks for matching mechanisms in other disciplines.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm">What problem are you trying to solve?
          <textarea required rows={4} className={inputCls} value={form.description}
            placeholder="What problem are you trying to solve? Think beyond your discipline..."
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map(([k, label]) => (
            <label key={k} className="block text-sm">{label} (optional)
              <input className={inputCls} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        <button disabled={busy} className="rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-2.5 font-medium text-white disabled:opacity-60">
          {busy ? "Searching…" : "Find connections"}
        </button>
      </form>
      {error && <p role="alert" className="mt-4 text-amber-300">{error}</p>}
      {res && (
        <section className="glass mt-8 space-y-4 p-5">
          <p className="text-sm text-slate-400">
            Source: <b>{res.source === "gemini" ? "Gemini" : "Offline heuristics"}</b>{res.note && ` — ${res.note}`}
          </p>
          <div><h3 className="text-sm font-semibold text-cyan-300">Main problem</h3><p className="mt-1 text-white">{res.analysis.main_problem}</p></div>
          <List title="Root causes" items={res.analysis.root_causes} />
          <List title="Underlying mechanisms" items={res.analysis.underlying_mechanisms} />
          <List title="Keywords" items={res.analysis.keywords} />
          <List title="Constraints" items={res.analysis.constraints} />
          <List title="Technical concepts" items={res.analysis.technical_concepts} />
          <div className="border-t border-white/10 pt-4">
            <h2 className="text-xl font-semibold text-white">Cross-disciplinary analogies</h2>
            <p className="mt-1 text-sm text-slate-400">
              Source: <b>{res.aSource === "gemini" ? "Gemini" : "Offline retrieval"}</b>{res.aNote && ` — ${res.aNote}`}
            </p>
            <p className="text-xs text-slate-500">Distance (near, cross or far domain) is an exploration indicator, not a measure of originality.</p>
            {res.analogies.length === 0 && <p className="mt-3 text-slate-400">No genuine analogies found. Try describing the mechanism (what is flowing, heating, spreading).</p>}
            <div className="mt-3 space-y-3">
              {res.analogies.map((a) => (
                <article key={a.discovered_concept} className="rounded-lg border border-white/10 bg-ink-900/60 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold text-white">{a.discovered_concept}</h3>
                    <span className="text-xs text-slate-400">
                      {a.external_discipline} · {a.distance} · {a.score_basis === "ai_estimate" ? "AI estimate" : "similarity"} {a.relevance_score.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm"><b className="text-cyan-300">How it works: </b>{a.mechanism}</p>
                  <p className="mt-1 text-sm"><b className="text-cyan-300">Shared principle: </b>{a.shared_principle}</p>
                  <p className="mt-1 text-sm"><b className="text-cyan-300">Why it matches: </b>{a.why_meaningful}</p>
                  <p className="mt-1 text-sm"><b className="text-cyan-300">Adaptation: </b>{a.how_to_adapt}</p>
                  <p className="mt-1 text-sm"><b className="text-amber-300">Limits: </b>{a.limitations}</p>
                </article>
              ))}
            </div>
          </div>
          <SolutionsPanel id={res.id} />
          <Link to={`/app/connections?d=${res.id}`} className="inline-block text-cyan-300 underline">Open the knowledge graph</Link>
          <a href={`/api/report/${res.id}`} className="ml-4 inline-block text-cyan-300 underline">Download PDF report</a>
        </section>
      )}
    </div>
  );
}
