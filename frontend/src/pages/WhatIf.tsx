import { useState } from "react";
import Picker from "../components/Picker";
import { post, useDiscoveries } from "../api/hooks";

const PRESETS = ["What if electricity is unavailable?", "What if the budget is extremely limited?",
  "What if the solution must use only natural materials?", "What if the system must work without internet?"];

export default function WhatIf() {
  const { list, err, did, setDid } = useDiscoveries();
  const [c, setC] = useState("");
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run() {
    setBusy(true); setMsg(""); setRes(null);
    try { setRes(await post("/api/simulate", { discovery_id: Number(did), constraint: c })); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-white">What-If Simulator</h1>
      <p className="mt-1 text-slate-400">Change a constraint and regenerate the proposals. Needs a live Gemini model to actually apply the constraint.</p>
      <div className="mt-4"><Picker list={list} did={did} setDid={setDid} /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => <button key={p} onClick={() => setC(p)} className="rounded-full border border-white/15 px-3 py-1 text-sm hover:bg-white/5">{p}</button>)}
      </div>
      <input value={c} onChange={(e) => setC(e.target.value)} placeholder="Or write your own constraint…"
        className="mt-3 w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-white" />
      <button onClick={run} disabled={busy || !did || c.length < 5} className="mt-3 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-2.5 text-white disabled:opacity-40">
        {busy ? "Regenerating…" : "Run simulation"}
      </button>
      {(err || msg) && <p role="alert" className="mt-3 text-amber-300">{err || msg}</p>}
      {res && (
        <section className="glass mt-5 p-4">
          <p className="text-sm text-slate-400">Source: <b>{res.source === "gemini" ? "Gemini" : "Offline"}</b> — {res.note}</p>
          {res.solutions.map((s: any) => (
            <article key={s.name} className="mt-3 text-sm"><h3 className="font-semibold text-white">{s.name}</h3>
              <p>{s.description}</p><p className="text-slate-400">{s.implementation}</p></article>
          ))}
        </section>
      )}
    </div>
  );
}
