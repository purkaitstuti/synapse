import { Link } from "react-router-dom";
import { useDiscoveries } from "../api/hooks";

export default function Workspace() {
  const { list, err } = useDiscoveries();
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-white">My Workspace</h1>
      {err && <p role="alert" className="mt-3 text-amber-300">{err}</p>}
      {!err && !list.length && <p className="mt-3 text-slate-400">Nothing here yet. Start from <Link to="/app/discover" className="text-cyan-300 underline">Discover</Link>.</p>}
      <div className="mt-4 space-y-3">
        {list.map((i) => (
          <article key={i.id} className="glass p-4">
            <h2 className="font-semibold text-white">#{i.id} {i.title}</h2>
            <p className="text-sm text-slate-400">{new Date(i.created_at).toLocaleString()} · {i.analogies} analogies · {i.solutions} solutions</p>
            <p className="mt-2 flex flex-wrap gap-4 text-sm text-cyan-300">
              <Link to={`/app/connections?d=${i.id}`} className="underline">Graph</Link>
              <Link to={`/app/research?d=${i.id}`} className="underline">Research</Link>
              <Link to={`/app/what-if?d=${i.id}`} className="underline">What-if</Link>
              <a href={`/api/report/${i.id}`} className="underline">PDF report</a>
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
