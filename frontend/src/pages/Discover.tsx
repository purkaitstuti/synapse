
import { useState, type FormEvent } from "react";
import {
  BrainCircuit,
  Search,
  Sparkles,
  FlaskConical,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const API = "http://127.0.0.1:8000";

type Mechanism = {
  rank: number;
  mechanism_name: string;
  scientific_domain: string;
  working_principle: string;
  similarity: number;
  evidence_status: string;
  scientifically_verified: boolean;
  knowledge_graph?: {
    database_match?: boolean;
    mechanism_id?: string | number | null;
    matched_record_count?: number;
  };
};

type Innovation = {
  problem_analysis?: string;
  root_causes?: string[];
  innovation_title?: string;
  proposed_solution?: string;
  mechanisms_used?: string[];
  working_principle?: string;
  implementation_steps?: string[];
  advantages?: string[];
  limitations?: string[];
  validation_plan?: string[];
  novelty_explanation?: string;
  scientific_confidence?: string;
};

type DiscoveryResponse = {
  status: string;
  discovery: {
    results: Mechanism[];
  };
};

type InnovationResponse = {
  status: string;
  model_used: string;
  innovation: Innovation;
  retrieved_mechanisms: Mechanism[];
};

type RetrievalMode = "standard" | "experimental";

function DetailList({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  if (!items?.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-cyan-300">
        {title}
      </h3>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function Discover() {
  const [problem, setProblem] = useState("");
  const [topK, setTopK] = useState(5);

  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("");

  const [error, setError] = useState("");
  const [mechanisms, setMechanisms] = useState<Mechanism[]>([]);
  const [innovation, setInnovation] = useState<Innovation | null>(null);
  const [model, setModel] = useState("");
  const isOffline = model === "Offline retrieval-based outline (no Gemini AI)";

  const [retrievalMode, setRetrievalMode] =
    useState<RetrievalMode>("standard");

  // Distinguishes retrieval-only from Gemini generation.
  const [experimentalGenerated, setExperimentalGenerated] =
    useState(false);

  async function requestJSON<T>(
    endpoint: string,
    body: object
  ): Promise<T> {
    const response = await fetch(`${API}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : `Request failed (${response.status})`
      );
    }

    return data as T;
  }

  function validateProblem(): boolean {
    if (problem.trim().length < 10) {
      setError("Please describe your problem in more detail.");
      return false;
    }

    return true;
  }

  function resetResults(mode: RetrievalMode) {
    setError("");
    setMechanisms([]);
    setInnovation(null);
    setModel("");
    setRetrievalMode(mode);
    setExperimentalGenerated(false);
  }

  // 65-mechanism experimental retrieval without Gemini.
  async function handleExperimentalSearch() {
    if (loading || !validateProblem()) return;

    setLoading(true);
    resetResults("experimental");

    try {
      setStage(
        "Searching the experimental 65-mechanism catalogue..."
      );

      const discovery = await requestJSON<DiscoveryResponse>(
        "/api/discover-experimental",
        {
          problem: problem.trim(),
          top_k: topK,
        }
      );

      const found = discovery.discovery?.results || [];
      setMechanisms(found);

      if (!found.length) {
        setError(
          "No matching experimental mechanisms were found."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Experimental retrieval failed."
      );
    } finally {
      setLoading(false);
      setStage("");
    }
  }

  // 65-mechanism experimental retrieval + Gemini innovation.
  async function handleExperimentalInnovation() {
    if (loading || !validateProblem()) return;

    setLoading(true);
    resetResults("experimental");

    try {
      setStage(
        "Retrieving 65-mechanism candidates and generating with Gemini AI..."
      );

      const generated = await requestJSON<InnovationResponse>(
        "/api/innovate-experimental",
        {
          problem: problem.trim(),
          top_k: topK,
        }
      );

      // Use the exact mechanisms passed to Gemini.
      setMechanisms(generated.retrieved_mechanisms || []);
      setInnovation(generated.innovation);
      setModel(generated.model_used);
      setExperimentalGenerated(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Experimental innovation generation failed."
      );
    } finally {
      setLoading(false);
      setStage("");
    }
  }


  // Retrieval-based research outline without Gemini.
  async function handleOfflineInnovation() {
    if (loading || !validateProblem()) return;

    setLoading(true);
    resetResults("experimental");

    try {
      setStage("Building a retrieval-based research outline...");

      const generated = await requestJSON<InnovationResponse>(
        "/api/innovate-offline",
        {
          problem: problem.trim(),
          top_k: topK,
        }
      );

      setMechanisms(generated.retrieved_mechanisms || []);
      setInnovation(generated.innovation);
      setModel("Offline retrieval-based outline (no Gemini AI)");
      setExperimentalGenerated(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Offline research outline failed."
      );
    } finally {
      setLoading(false);
      setStage("");
    }
  }

  // Original 60-mechanism workflow + Gemini innovation.
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (loading || !validateProblem()) return;

    setLoading(true);
    resetResults("standard");

    try {
      setStage("Retrieving scientific mechanisms...");

      const discovery = await requestJSON<DiscoveryResponse>(
        "/api/discover",
        {
          problem: problem.trim(),
          top_k: topK,
        }
      );

      const found = discovery.discovery?.results || [];
      setMechanisms(found);

      if (!found.length) {
        setError(
          "No matching mechanism candidates were found."
        );
        return;
      }

      setStage("Generating an innovation with Gemini AI...");

      const generated = await requestJSON<InnovationResponse>(
        "/api/innovate",
        {
          problem: problem.trim(),
          top_k: topK,
        }
      );

      // Show the results actually used by Gemini.
      setMechanisms(generated.retrieved_mechanisms || found);
      setInnovation(generated.innovation);
      setModel(generated.model_used);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
      setStage("");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-9 w-9 text-cyan-400" />
          <h1 className="text-3xl font-bold text-white">
            SYNAPSE Discovery Engine
          </h1>
        </div>

        <p className="max-w-3xl text-slate-400">
          Explore scientific mechanisms across disciplines and
          generate AI-powered innovation concepts.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-xl"
      >
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <Search className="h-5 w-5 text-cyan-400" />
          Describe your problem
        </div>

        <textarea
          value={problem}
          onChange={(event) => setProblem(event.target.value)}
          placeholder="Example: How can robots grip fragile objects without damaging them?"
          rows={5}
          required
          minLength={10}
          maxLength={2000}
          disabled={loading}
          className="w-full resize-y rounded-xl border border-white/10 bg-slate-950 p-4 text-white outline-none focus:border-cyan-500 disabled:opacity-60"
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="text-sm text-slate-300">
            Mechanisms to retrieve
            <select
              value={topK}
              onChange={(event) =>
                setTopK(Number(event.target.value))
              }
              disabled={loading}
              className="ml-3 rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
            >
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            {/* Original 60-mechanism Gemini workflow */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-5 w-5" />
              Generate Innovation
            </button>

            {/* Experimental retrieval only */}
            <button
              type="button"
              onClick={handleExperimentalSearch}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-violet-400/40 bg-violet-500/10 px-5 py-3 font-semibold text-violet-200 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FlaskConical className="h-5 w-5" />
              Search 65 Mechanisms
            </button>

            {/* New experimental Gemini workflow */}
            <button
              type="button"
              onClick={handleExperimentalInnovation}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-5 w-5" />
              Generate Experimental Innovation
            </button>

            <button
              type="button"
              onClick={handleOfflineInnovation}
              disabled={loading}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
            >
              Generate Offline Research Outline
            </button>

          </div>
        </div>

        <p className="text-xs leading-relaxed text-slate-400">
          Generate Innovation uses the standard 60-mechanism
          catalogue with Gemini AI. Search 65 Mechanisms retrieves
          experimental candidates without Gemini. Generate
          Experimental Innovation uses the expanded 65-mechanism
          catalogue with Gemini AI.
        </p>

        {loading && (
          <div
            role="status"
            className="flex items-center gap-3 text-sm text-cyan-300"
          >
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            {stage}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}
      </form>

      {mechanisms.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-cyan-400" />
              <h2 className="text-2xl font-bold text-white">
                Retrieved Scientific Mechanisms
              </h2>
            </div>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                retrievalMode === "experimental"
                  ? "border-violet-400/30 bg-violet-500/10 text-violet-200"
                  : "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
              }`}
            >
              {retrievalMode === "experimental"
                ? "Experimental 65-mechanism index"
                : "Standard 60-mechanism index"}
            </span>
          </div>

          <p className="text-sm text-amber-300">
            These are experimental retrieval candidates.
            Similarity scores do not represent scientific confidence.
            Scientific evidence requires independent verification.
          </p>

          {retrievalMode === "experimental" && (
            <p className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-3 text-sm text-violet-200">
              This experimental catalogue includes five additional
              materials-science mechanisms. Knowledge-graph links
              may be unavailable for expansion mechanisms.
              {experimentalGenerated
                ? " The innovation below was generated by Gemini using candidates from this catalogue."
                : isOffline
                  ? " The outline below was assembled from retrieved mechanisms without Gemini."
                  : " This search displays retrieval results only; Gemini was not called."}
              {" "}Scientific verification remains pending.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {mechanisms.map((item, index) => (
              <article
                key={`${item.mechanism_name}-${index}`}
                className="space-y-3 rounded-xl border border-white/10 bg-slate-900/70 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold capitalize text-white">
                    {item.rank}. {item.mechanism_name}
                  </h3>

                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                    {Number(item.similarity).toFixed(3)}
                  </span>
                </div>

                <p className="text-xs uppercase tracking-wide text-cyan-400">
                  {item.scientific_domain}
                </p>

                <p className="text-sm leading-relaxed text-slate-300">
                  {item.working_principle}
                </p>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
                    Evidence: {item.evidence_status || "Unverified"}
                  </span>

                  {item.knowledge_graph?.database_match && (
                    <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-blue-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Database linked
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {innovation && (
        <section
          className={`space-y-6 rounded-2xl border bg-slate-900/80 p-6 shadow-xl ${
            retrievalMode === "experimental"
              ? "border-violet-500/20"
              : "border-cyan-500/20"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
              <Sparkles
                className={`h-6 w-6 ${
                  retrievalMode === "experimental"
                    ? "text-violet-400"
                    : "text-cyan-400"
                }`}
              />
              {isOffline
                ? "Retrieval-Based Research Outline"
                : "AI-Generated Innovation"}
            </h2>

            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
              {isOffline ? "No Gemini AI used" : `Generated using ${model}`}
            </span>
          </div>

          <h3 className="text-xl font-semibold text-cyan-300">
            {innovation.innovation_title}
          </h3>

          <div className="space-y-2">
            <h4 className="font-semibold text-white">
              Problem Analysis
            </h4>
            <p className="text-sm leading-relaxed text-slate-300">
              {innovation.problem_analysis}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-white">
              Proposed Solution
            </h4>
            <p className="text-sm leading-relaxed text-slate-300">
              {innovation.proposed_solution}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-white">
              Working Principle
            </h4>
            <p className="text-sm leading-relaxed text-slate-300">
              {innovation.working_principle}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <DetailList
              title="Root Causes"
              items={innovation.root_causes}
            />
            <DetailList
              title="Mechanisms Used"
              items={innovation.mechanisms_used}
            />
            <DetailList
              title="Implementation Steps"
              items={innovation.implementation_steps}
            />
            <DetailList
              title="Advantages"
              items={innovation.advantages}
            />
            <DetailList
              title="Limitations"
              items={innovation.limitations}
            />
            <DetailList
              title="Validation Plan"
              items={innovation.validation_plan}
            />
          </div>

          {innovation.novelty_explanation && (
            <div className="space-y-2">
              <h4 className="font-semibold text-white">
                Potential Novelty
              </h4>
              <p className="text-sm text-slate-300">
                {innovation.novelty_explanation}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
            {isOffline
              ? "Scientific verification: Pending. This is a retrieval-based research outline. No generative AI was used, and no engineering solution has been validated."
              : "Scientific verification: Pending. This is an AI-generated conceptual proposal, not a validated engineering solution."}
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Print / Save as PDF
          </button>
        </section>
      )}
    </div>
  );
}
