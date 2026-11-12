import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDiscoveries } from "../api/hooks";

type Health = { ai_mode: string; graph_backend: string; database: string; gemini_key_configured: boolean };

export default function Dashboard() {
  const { list, err } = useDiscoveries();
  const [h, setH] = useState<Health | null>(null);
  useEffect(() => { fetch("/api/health").then((r) => r.json()).then(setH).catch(() => {}); }, []);
  const concepts = list.reduce((n, i) => n + i.analogies, 0);
  const saved = list.filter((i) => i.solutions > 0);

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-white">Welcome back</h1>
      <p className="mt-1 text-slate-400">Start from a problem, or pick up where you left off.</p>
      <Link to="/app/discover" className="mt-5 inline-block rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-2.5 font-medium text-white">New discovery</Link>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="glass p-5">
          <h2 className="text-lg font-semibold text-white">Recent explorations</h2>
          {err && <p className="mt-2 text-sm text-amber-300">{err}</p>}
          {!err && !list.length && <p className="mt-2 text-sm text-slate-400">None yet. Run your first discovery and it will appear here.</p>}
          <ul className="mt-2 space-y-1 text-sm">{list.slice(0, 5).map((i) => <li key={i.id}><Link className="text-cyan-300 underline" to={`/app/connections?d=${i.id}`}>{i.title}</Link></li>)}</ul>
        </section>
        <section className="glass p-5">
          <h2 className="text-lg font-semibold text-white">Saved innovations</h2>
          {!saved.length && <p className="mt-2 text-sm text-slate-400">Discoveries with generated solutions appear here.</p>}
          <ul className="mt-2 space-y-1 text-sm">{saved.slice(0, 5).map((i) => <li key={i.id}>{i.title} · {i.solutions} solutions</li>)}</ul>
        </section>
        <section className="glass p-5">
          <h2 className="text-lg font-semibold text-white">Totals</h2>
          <p className="mt-2 text-sm text-slate-300">{list.length} discoveries · {concepts} concepts explored</p>
        </section>
        <section className="glass p-5">
          <h2 className="text-lg font-semibold text-white">System status</h2>
          {h ? <p className="mt-2 text-sm text-slate-300">AI: <b>{h.ai_mode === "live" ? "Gemini (live)" : "Offline mode"}</b> · Graph: <b>{h.graph_backend}</b> · DB: <b>{h.database}</b></p>
             : <p className="mt-2 text-sm text-slate-400">Checking backend…</p>}
        </section>
      </div>
    </div>
  );
}
