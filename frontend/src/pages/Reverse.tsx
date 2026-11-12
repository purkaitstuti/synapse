import { useState } from "react";
import { post } from "../api/hooks";

export default function Reverse() {
  const [t, setT] = useState("");
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run() {
    setBusy(true); setMsg(""); setRes(null);
    try { setRes(await post("/api/reverse-search", { discovery: t })); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-white">Reverse Innovation</h1>
      <p className="mt-1 text-slate-400">Start from an interesting discovery, such as "self-healing materials", and see where it could be applied.</p>
      <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Self-healing materials"
        className="mt-4 w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-white" />
      <button onClick={run} disabled={busy || t.length < 3} className="mt-3 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-2.5 text-white disabled:opacity-40">
        {busy ? "Searching…" : "Find applications"}
      </button>
      {msg && <p role="alert" className="mt-3 text-amber-300">{msg}</p>}
      {res && (
        <section className="mt-5 space-y-3">
          <p className="text-sm text-slate-400">{res.note}</p>
          {res.applications.map((a: any) => (
            <article key={a.application} className="glass p-4 text-sm">
              <span className="text-xs uppercase text-cyan-300">{a.field}</span>
              <h3 className="font-semibold text-white">{a.application}</h3>
              <p className="mt-1">{a.why_relevant}</p><p className="mt-1 text-amber-300">Limits: {a.limitations}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
