import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ReactFlow, { Background, Controls, Edge, MiniMap, Node, useNodesState } from "reactflow";
import "reactflow/dist/style.css";

type GNode = { id: string; kind: string; label: string; discipline: string; detail: string };
type GEdge = { id: string; source: string; target: string; type: string; explanation: string };
type Graph = { nodes: GNode[]; edges: GEdge[] };
type Item = { id: number; title: string };

const COLORS: Record<string, string> = {
  problem: "#3B82F6", discipline: "#8B5CF6", concept: "#22D3EE", mechanism: "#34D399", analogy: "#FB923C", solution: "#F472B6",
};
const ROWS = ["problem", "mechanism", "analogy", "concept", "discipline", "solution"];

function layout(g: Graph): Node[] {
  const byKind: Record<string, GNode[]> = {};
  g.nodes.forEach((n) => (byKind[n.kind] ??= []).push(n));
  return g.nodes.map((n) => {
    const row = byKind[n.kind];
    return { id: n.id, data: { label: n.label },
      position: { x: (row.indexOf(n) - (row.length - 1) / 2) * 200 + 400, y: ROWS.indexOf(n.kind) * 150 } };
  });
}

function pathTo(g: Graph, goal: string): string[] {
  const prev: Record<string, string | null> = { problem: null };
  const queue = ["problem"];
  for (const cur of queue) {
    if (cur === goal) {
      const out: string[] = [];
      for (let c: string | null = cur; c; c = prev[c]) out.unshift(c);
      return out;
    }
    for (const e of g.edges) {
      const n = e.source === cur ? e.target : e.target === cur ? e.source : null;
      if (n && !(n in prev)) { prev[n] = cur; queue.push(n); }
    }
  }
  return [];
}

export default function Connections() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const did = params.get("d");
  const [list, setList] = useState<Item[]>([]);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("");
  const [selNode, setSelNode] = useState<string | null>(null);
  const [selEdge, setSelEdge] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [base, setBase, onNodesChange] = useNodesState<Node>([]);

  useEffect(() => {
    fetch("/api/discoveries").then((r) => r.json()).then((l: Item[]) => {
      setList(l);
      if (!did && l.length) setParams({ d: String(l[0].id) });
    }).catch(() => setErr("Cannot reach the backend."));
  }, []);

  useEffect(() => {
    if (!did) return;
    setGraph(null); setSelNode(null); setSelEdge(null); setPicked(new Set()); setFilter("");
    fetch(`/api/graph/${did}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((g: Graph) => {
      setGraph(g); setBase(layout(g));
    }).catch(() => setErr("Could not load that graph."));
  }, [did]);

  const byId = useMemo(() => Object.fromEntries((graph?.nodes ?? []).map((n) => [n.id, n])), [graph]);
  const disciplines = useMemo(() => (graph?.nodes ?? []).filter((n) => n.kind === "discipline").map((n) => n.label), [graph]);
  const hl = useMemo(() => (graph && selNode ? pathTo(graph, selNode) : []), [graph, selNode]);
  const visible = (n: GNode) => !filter || !n.discipline || n.discipline === filter;

  const nodes: Node[] = base.filter((n) => byId[n.id] && visible(byId[n.id])).map((n) => {
    const g = byId[n.id], c = COLORS[g.kind], on = !hl.length || hl.includes(n.id);
    return { ...n, style: { background: c + "22", border: `${picked.has(g.label) ? 3 : 1}px solid ${c}`, color: "#e2e8f0",
      borderRadius: 10, padding: 8, fontSize: 12, width: 170, opacity: on ? 1 : 0.3,
      boxShadow: n.id === selNode ? `0 0 16px ${c}` : undefined } };
  });
  const shown = new Set(nodes.map((n) => n.id));
  const pairs = new Set(hl.slice(1).flatMap((id, i) => [`${hl[i]}|${id}`, `${id}|${hl[i]}`]));
  const edges: Edge[] = (graph?.edges ?? []).filter((e) => shown.has(e.source) && shown.has(e.target)).map((e) => {
    const on = pairs.has(`${e.source}|${e.target}`);
    return { id: e.id, source: e.source, target: e.target, label: e.type, animated: on,
      labelStyle: { fill: "#94A3B8", fontSize: 10 }, labelBgStyle: { fill: "#0B1222" },
      style: { stroke: on ? "#22D3EE" : "#475569", strokeWidth: on ? 2.5 : 1.2 } };
  });

  const node = selNode ? byId[selNode] : null;
  const edge = selEdge ? graph?.edges.find((e) => e.id === selEdge) : null;
  const togglePick = (label: string) => setPicked((p) => { const n = new Set(p); n.has(label) ? n.delete(label) : n.add(label); return n; });

  return (
    <div>
      <h1 className="text-3xl font-bold text-white">Connections</h1>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <select value={did ?? ""} onChange={(e) => setParams({ d: e.target.value })} className="rounded-lg border border-white/10 bg-ink-800 px-3 py-2">
          {list.map((i) => <option key={i.id} value={i.id}>#{i.id} {i.title}</option>)}
        </select>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-white/10 bg-ink-800 px-3 py-2">
          <option value="">All disciplines</option>
          {disciplines.map((d) => <option key={d}>{d}</option>)}
        </select>
        <button disabled={picked.size < 2} onClick={() => nav(`/app/fusion?d=${did}&c=${encodeURIComponent([...picked].join("|"))}`)}
          className="rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-white disabled:opacity-40">
          Fuse selected ({picked.size})
        </button>
      </div>
      {err && <p role="alert" className="mt-3 text-amber-300">{err}</p>}
      {!did && !err && <p className="mt-4 text-slate-400">No discoveries yet. Run one from Discover first.</p>}
      {graph && (
        <div className="mt-4 flex flex-col gap-4 lg:flex-row">
          <div className="h-[620px] flex-1 overflow-hidden rounded-xl border border-white/10">
            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} fitView
              onNodeClick={(_, n) => { setSelNode(n.id); setSelEdge(null); }}
              onEdgeClick={(_, e) => { setSelEdge(e.id); setSelNode(null); }}
              onPaneClick={() => { setSelNode(null); setSelEdge(null); }}>
              <Background /><Controls /><MiniMap />
            </ReactFlow>
          </div>
          <aside className="glass w-full p-4 text-sm lg:w-80">
            {!node && !edge && <p className="text-slate-400">Click a node to see details and highlight its path from the problem. Click a line to see why two nodes are connected. Drag to rearrange; scroll to zoom.</p>}
            {node && (
              <div>
                <span className="text-xs uppercase" style={{ color: COLORS[node.kind] }}>{node.kind}</span>
                <h2 className="mt-1 text-lg font-semibold text-white">{node.label}</h2>
                <p className="mt-2 text-slate-300">{node.detail}</p>
                {hl.length > 1 && <p className="mt-2 text-slate-400">Path from problem: {hl.map((id) => byId[id].label).join(" → ")}</p>}
                {node.kind === "concept" && (
                  <button onClick={() => togglePick(node.label)} className="mt-3 rounded-lg border border-white/20 px-3 py-1.5 text-white">
                    {picked.has(node.label) ? "Remove from fusion" : "Select for fusion"}
                  </button>
                )}
              </div>
            )}
            {edge && (
              <div>
                <span className="text-xs uppercase text-cyan-300">{edge.type}</span>
                <h2 className="mt-1 text-base font-semibold text-white">{byId[edge.source]?.label} → {byId[edge.target]?.label}</h2>
                <p className="mt-2 text-slate-300">{edge.explanation}</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
