
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDiscoveries } from "../api/hooks";

type Health = {
  status?: string;
  retrieval?: string;
  knowledge_graph?: string;
  ai_mode?: string;
  graph_backend?: string;
  database?: string;
  gemini_key_configured?: boolean;
};

export default function Dashboard() {
  const { list, err } = useDiscoveries();
  const [health, setHealth] = useState<Health | null>(null);

  // Prevent crashes when discovery history is unavailable.
  const discoveries = Array.isArray(list) ? list : [];

  const concepts = discoveries.reduce(
    (total, item) => total + (Number(item.analogies) || 0),
    0
  );

  const saved = discoveries.filter(
    (item) => Number(item.solutions) > 0
  );

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/health")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Health check failed");
        }
        return response.json();
      })
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const backendOnline = health?.status === "healthy";

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-white">
        Welcome back
      </h1>

      <p className="mt-1 text-slate-400">
        Start from a problem, or pick up where you left off.
      </p>

      <Link
        to="/app/discover"
        className="mt-5 inline-block rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-2.5 font-medium text-white"
      >
        New discovery
      </Link>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="glass p-5">
          <h2 className="text-lg font-semibold text-white">
            Recent explorations
          </h2>

          {err && (
            <p className="mt-2 text-sm text-amber-300">
              {err}
            </p>
          )}

          {discoveries.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">
              No saved discoveries yet. Start exploring scientific
              mechanisms using the Discover page.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {discoveries.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link
                    className="text-cyan-300 underline"
                    to={`/app/connections?d=${item.id}`}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass p-5">
          <h2 className="text-lg font-semibold text-white">
            Saved innovations
          </h2>

          {saved.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">
              Saved innovations will appear here when
              discovery history is implemented.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {saved.slice(0, 5).map((item) => (
                <li key={item.id}>
                  {item.title} · {item.solutions} solutions
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass p-5">
          <h2 className="text-lg font-semibold text-white">
            Totals
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            {discoveries.length} saved discoveries ·{" "}
            {concepts} concepts explored
          </p>
        </section>

        <section className="glass p-5">
          <h2 className="text-lg font-semibold text-white">
            System status
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Backend:{" "}
            <span
              className={
                backendOnline
                  ? "text-green-400"
                  : "text-amber-400"
              }
            >
              {backendOnline ? "Online" : "Unavailable"}
            </span>
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Retrieval: {health?.retrieval || "Unknown"}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Knowledge graph:{" "}
            {health?.knowledge_graph || "Unknown"}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Gemini generation is tested separately through
            the innovation endpoint.
          </p>
        </section>
      </div>
    </div>
  );
}
