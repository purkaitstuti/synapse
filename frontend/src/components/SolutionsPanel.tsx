import { useState } from "react";
import { post } from "../api/hooks";

const CRIT = ["relevance", "novelty", "feasibility", "impact", "complexity", "evidence"];

type Sol = {
  name: string; description: string; inspiration_source: string; original_mechanism: string; adaptation: string;
  pathway?: string; implementation: string; required_resources: string[]; expected_benefits: string[]; challenges: string[]; feasibility: string;
};

const Row = ({ label, items }: { label: string; items: string[] }) =>
  items.length ? <p className="mt-1 text-sm"><b className="text-cyan-300">{label}: </b>{items.join("; ")}</p> : null;

export default function SolutionsPanel({ id }: { id: number }) {
  const [sols, setSols] = useState<Sol[] | null>(null);
  const [meta, setMeta] = useState({ source: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ev, setEv] = useState<any>(null);

  async function run() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/generate-solutions", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ discovery_id: id }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(typeof b.detail === "string" ? b.detail : "Request failed");
      setSols(b.solutions); setMeta({ source: b.source, note: b.note });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function evaluate() {
    setErr("");
    try { setEv(await post("/api/evaluate", { discovery_id: id })); } catch (e) { setErr((e as Error).message); }
  }

  return (
    <div className="border-t border-white/10 pt-4">
      <h2 className="text-xl font-semibold text-white">Solutions</h2>
      {!sols && <button onClick={run} disabled={busy} className="mt-2 rounded-lg border border-white/20 px-4 py-2 text-white disabled:opacity-60">
        {busy ? "Generating…" : "Generate solutions from these analogies"}</button>}
      {err && <p role="alert" className="mt-2 text-amber-300">{err}</p>}
      {sols && (
        <>
          <p className="mt-1 text-sm text-slate-400">
            Source: <b>{meta.source === "gemini" ? "Gemini" : "Offline templates"}</b>{meta.note && ` — ${meta.note}`}. All are conceptual proposals, not validated solutions.
          </p>
          <div className="mt-3 space-y-3">
            {sols.map((s) => (
              <article key={s.name} className="rounded-lg border border-white/10 bg-ink-900/60 p-4">
                <span className="text-xs uppercase text-violet-300">{s.pathway ? `${s.pathway} pathway` : ""}</span>
                <h3 className="text-lg font-semibold text-white">{s.name}</h3>
                <p className="mt-1 text-sm">{s.description}</p>
                <p className="mt-1 text-sm"><b className="text-cyan-300">Inspired by: </b>{s.inspiration_source} — {s.original_mechanism}</p>
                <p className="mt-1 text-sm"><b className="text-cyan-300">Adaptation: </b>{s.adaptation}</p>
                <p className="mt-1 text-sm"><b className="text-cyan-300">Implementation: </b>{s.implementation}</p>
                <Row label="Resources" items={s.required_resources} />
                <Row label="Benefits" items={s.expected_benefits} />
                <Row label="Challenges" items={s.challenges} />
                <p className="mt-1 text-sm"><b className="text-amber-300">Feasibility: </b>{s.feasibility || "Not assessed"}</p>
              </article>
            ))}
          </div>
          <button onClick={evaluate} className="mt-3 rounded-lg border border-white/20 px-4 py-2 text-white">Evaluate and compare</button>
          {ev && (
            <div className="mt-3 overflow-x-auto">
              <p className="text-sm text-slate-400">{ev.note} (AI-generated estimates, 0-10; complexity 10 = hardest.)</p>
              <table className="mt-2 w-full text-left text-sm">
                <thead><tr><th className="pr-3">Solution</th>{CRIT.map((c) => <th key={c} className="pr-3 capitalize">{c}</th>)}</tr></thead>
                <tbody>{ev.evaluations.map((e: any) => (
                  <tr key={e.solution} className="border-t border-white/10">
                    <td className="py-1 pr-3">{e.solution}</td>
                    {CRIT.map((c) => <td key={c} title={e.explanations[c]} className="pr-3">{e.scores[c] ?? "—"}</td>)}
                  </tr>))}</tbody>
              </table>
              {ev.source === "offline" && <ul className="mt-2 list-disc pl-5 text-xs text-slate-400">{ev.evaluations[0] && ["relevance", "novelty", "evidence"].map((c) => <li key={c}>{ev.evaluations[0].explanations[c]}</li>)}</ul>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
