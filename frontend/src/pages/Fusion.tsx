
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

type Fusion = {
  name: string;
  selected_concepts: string[];
  common_mechanisms: string[];
  combination_logic: string;
  proposed_innovation: string;
  working_principle: string;
  implementation_possibilities: string[];
  advantages: string[];
  risks_limitations: string[];
};

type FusionResponse = {
  status: string;
  discovery_id: number;
  model_used: string;
  fusion: Fusion;
  note: string;
};

type GraphNode = {
  id: string;
  kind: string;
  label: string;
  discipline: string;
  detail: string;
};

function ResultList({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  if (!items?.length) return null;

  return (
    <div className="mt-6">
      <h3 className="mb-3 text-base font-semibold text-cyan-300">
        {title}
      </h3>

      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-slate-300"
          >
            <span className="mr-2 text-cyan-400">
              {index + 1}.
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FusionPage() {
  const [params] = useSearchParams();

  const discoveryId = params.get("d");

  const [concepts, setConcepts] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>(
    (params.get("c") ?? "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean)
  );

  const [result, setResult] =
    useState<FusionResponse | null>(null);

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load mechanisms from the selected discovery
  useEffect(() => {
    if (!discoveryId) return;

    let active = true;

    async function loadMechanisms() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/graph/${encodeURIComponent(discoveryId!)}`
        );

        if (!response.ok) {
          throw new Error("Could not load discovery.");
        }

        const graph = await response.json();

        const nodes: GraphNode[] = graph.nodes ?? [];

        const allowedKinds = [
          "concept",
          "mechanism",
          "analogy",
        ];

        const names = [
          ...new Set(
            nodes
              .filter((node) =>
                allowedKinds.includes(node.kind)
              )
              .map((node) => node.label)
          ),
        ];

        if (active) {
          setConcepts(names);

          setPicked((previous) =>
            previous.filter((name) =>
              names.some(
                (available) =>
                  available.toLowerCase() ===
                  name.toLowerCase()
              )
            )
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load mechanisms."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMechanisms();

    return () => {
      active = false;
    };
  }, [discoveryId]);

  function toggleConcept(name: string) {
    setPicked((previous) =>
      previous.includes(name)
        ? previous.filter((item) => item !== name)
        : [...previous, name]
    );
  }

  async function generateFusion() {
    if (!discoveryId || picked.length < 2) return;

    setBusy(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/fuse-ideas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          discovery_id: Number(discoveryId),
          concepts: picked,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Idea Fusion generation failed."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate fusion."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!discoveryId) {
    return (
      <div className="text-slate-400">
        Open a discovery in{" "}
        <Link
          to="/app/connections"
          className="text-cyan-300 underline"
        >
          Connections
        </Link>{" "}
        and select mechanisms to fuse.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Idea Fusion
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Combine scientific mechanisms to generate
          interdisciplinary hybrid innovation proposals
          using SYNAPSE AI.
        </p>
      </div>

      {/* MECHANISM SELECTOR */}
      <section className="rounded-2xl border border-white/10 bg-[#101827] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Select Scientific Mechanisms
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Choose at least two mechanisms to combine.
            </p>
          </div>

          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
            {picked.length} selected
          </span>
        </div>

        {loading && (
          <p className="mt-5 text-sm text-slate-400">
            Loading mechanisms...
          </p>
        )}

        {!loading && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {concepts.map((name) => {
              const selected = picked.includes(name);

              return (
                <label
                  key={name}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                    selected
                      ? "border-cyan-500/50 bg-cyan-500/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleConcept(name)}
                    className="h-4 w-4 accent-cyan-400"
                  />

                  <span className="text-sm font-medium text-slate-200">
                    {name}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <button
          onClick={generateFusion}
          disabled={busy || loading || picked.length < 2}
          className="mt-6 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy
            ? "Generating Hybrid Innovation..."
            : `Fuse ${picked.length} Mechanisms`}
        </button>

        {busy && (
          <p className="mt-3 text-sm text-cyan-300">
            Gemini is analyzing the selected mechanisms.
            This may take a little time.
          </p>
        )}
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300"
        >
          {error}
        </div>
      )}

      {/* GENERATED FUSION RESULT */}
      {result && (
        <section className="rounded-2xl border border-white/10 bg-[#101827] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              AI-Generated Hybrid Innovation
            </span>

            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
              Scientific verification pending
            </span>
          </div>

          <h2 className="mt-4 text-2xl font-bold text-white">
            {result.fusion.name}
          </h2>

          <p className="mt-2 text-xs text-slate-500">
            Generated using {result.model_used}
          </p>

          <div className="mt-6">
            <h3 className="text-base font-semibold text-cyan-300">
              Proposed Innovation
            </h3>

            <p className="mt-2 leading-7 text-slate-300">
              {result.fusion.proposed_innovation}
            </p>
          </div>

          <div className="mt-6">
            <h3 className="text-base font-semibold text-cyan-300">
              Combination Logic
            </h3>

            <p className="mt-2 leading-7 text-slate-300">
              {result.fusion.combination_logic}
            </p>
          </div>

          <div className="mt-6">
            <h3 className="text-base font-semibold text-cyan-300">
              Working Principle
            </h3>

            <p className="mt-2 leading-7 text-slate-300">
              {result.fusion.working_principle}
            </p>
          </div>

          <ResultList
            title="Common Mechanisms"
            items={result.fusion.common_mechanisms}
          />

          <ResultList
            title="Implementation Possibilities"
            items={result.fusion.implementation_possibilities}
          />

          <ResultList
            title="Advantages"
            items={result.fusion.advantages}
          />

          <ResultList
            title="Risks and Limitations"
            items={result.fusion.risks_limitations}
          />

          <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-slate-400">
            {result.note}
          </div>

          <Link
            to={`/app/connections?d=${discoveryId}`}
            className="mt-6 inline-block text-sm font-medium text-cyan-300 underline"
          >
            Return to Knowledge Graph
          </Link>
        </section>
      )}
    </div>
  );
}
