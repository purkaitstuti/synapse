import { useEffect, useState } from "react";
import Picker from "../components/Picker";
import { post, useDiscoveries } from "../api/hooks";

type Paper = { title: string; authors: string[]; year: number | null; abstract: string; url: string; doi: string; source: string;
  ai_interpretation?: { relevant_finding: string; connection: string; basis: string } };
type Res = { papers: Paper[]; note: string; query?: string };

export default function Research() {
  const { list, err, did, setDid } = useDiscoveries();
  const [detail, setDetail] = useState<any>(null);
  const [res, setRes] = useState<Record<string, Res>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!did) return;
    setDetail(null); setMsg("");
    fetch(`/api/discovery/${did}`).then((r) => r.json()).then((d) => { setDetail(d); setRes(d.research ?? {}); });
  }, [did]);

  async function find(i: number) {
    setBusy(i); setMsg("");
    try { const r = await post("/api/find-research", { discovery_id: Number(did), solution_index: i }); setRes((p) => ({ ...p, [String(i)]: r })); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(null); }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-white">Research Library</h1>
      <p className="mt-1 text-slate-400">Real papers from OpenAlex and Semantic Scholar. Any AI interpretation is labeled and is not part of the paper.</p>
      <div className="mt-4"><Picker list={list} did={did} setDid={setDid} /></div>
      {(err || msg) && <p role="alert" className="mt-3 text-amber-300">{err || msg}</p>}
      {detail && !detail.solutions?.length && <p className="mt-4 text-slate-400">Generate solutions for this discovery first (Discover page).</p>}
      {detail?.solutions?.map((s: any, i: number) => (
        <section key={i} className="glass mt-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-white">{s.name}</h2>
            <button onClick={() => find(i)} disabled={busy !== null} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white disabled:opacity-50">
              {busy === i ? "Searching…" : res[String(i)] ? "Search again" : "Find supporting research"}
            </button>
          </div>
          {res[String(i)] && (
            <div className="mt-3 space-y-3">
              {res[String(i)].note && <p className="text-sm text-slate-400">{res[String(i)].note}</p>}
              {res[String(i)].papers.map((p) => (
                <article key={p.title} className="rounded-lg border border-white/10 p-3 text-sm">
                  <a href={p.url} target="_blank" rel="noreferrer" className="font-medium text-cyan-300 underline">{p.title}</a>
                  <p className="text-slate-400">{p.authors.join(", ")} · {p.year ?? "n.d."} · {p.source}{p.doi && ` · DOI ${p.doi}`}</p>
                  {p.abstract && <p className="mt-1 text-slate-300">{p.abstract}{p.abstract.length >= 500 && "…"}</p>}
                  {p.ai_interpretation && (
                    <div className="mt-2 rounded border border-violet-400/30 p-2">
                      <p className="text-xs text-violet-300">{p.ai_interpretation.basis}</p>
                      <p>{p.ai_interpretation.relevant_finding}</p><p className="text-slate-400">{p.ai_interpretation.connection}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
