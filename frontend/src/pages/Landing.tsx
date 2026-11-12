import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import HeroGraph from "../components/HeroGraph";

const STEPS = [
  ["Describe the problem", "Plain language, any field. Add constraints like budget or location if they matter."],
  ["Break it into mechanisms", "Synapse separates what is happening from the surface wording of the problem."],
  ["Search other disciplines", "Biology, physics, economics and seven more, matched by how things work, not by keywords."],
  ["Adapt and check", "Each analogy becomes a proposed solution, with limits stated and real papers retrieved as evidence."],
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#14234a_0%,#070B16_60%)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <Link to="/app" className="text-sm text-slate-300 hover:text-white">Open dashboard</Link>
      </header>
      <main className="mx-auto max-w-6xl px-6">
        <section className="grid items-center gap-10 py-16 lg:grid-cols-2">
          <div>
            <h1 className="text-5xl font-extrabold text-white sm:text-6xl">Connecting the Unconnected.</h1>
            <p className="mt-5 max-w-md text-lg text-slate-300">
              Discover unexpected connections. Transform unrelated knowledge into extraordinary possibilities.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/app/discover" className="rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-3 font-medium text-white">Explore an idea</Link>
              <a href="#how" className="rounded-lg border border-white/15 px-5 py-3 text-slate-200 hover:bg-white/5">See how it works</a>
            </div>
          </div>
          <HeroGraph />
        </section>
        <section id="how" className="pb-24">
          <h2 className="text-3xl font-bold text-white">How Synapse works</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="glass p-5">
                <span className="text-sm text-cyan-300">Step {i + 1}</span>
                <h3 className="mt-1 text-xl font-semibold text-white">{t}</h3>
                <p className="mt-2 text-slate-400">{d}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="pb-20">
          <h2 className="text-3xl font-bold text-white">Connections Synapse can surface</h2>
          <p className="mt-2 text-slate-400">Illustrative examples of the kind of link it looks for. Each result is a conceptual proposal, not a validated solution.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[["Cooling buildings", "Termite mound ventilation", "passive airflow through convection"],
              ["Traffic congestion", "Ant colony routing", "adaptive paths through decentralized feedback"],
              ["Temperature swings", "Phase-change materials", "buffering heat through latent energy"]].map(([a, b, c]) => (
              <div key={b} className="glass p-5"><p className="text-sm text-cyan-300">{a}</p><h3 className="mt-1 text-lg font-semibold text-white">{b}</h3><p className="mt-1 text-sm text-slate-400">{c}</p></div>))}
          </div>
        </section>
        <section className="pb-20">
          <h2 className="text-3xl font-bold text-white">What you can do</h2>
          <ul className="mt-6 grid gap-3 text-slate-300 sm:grid-cols-2">
            {["Break a problem into mechanisms", "Find analogies across ten disciplines", "Explore an interactive knowledge graph", "Generate conceptual solutions and fuse concepts",
              "Retrieve real papers as evidence", "Test constraints with the what-if simulator", "Start from a discovery with reverse search", "Export a PDF innovation report"].map((f) => <li key={f} className="glass px-4 py-3">{f}</li>)}
          </ul>
        </section>
        <section className="pb-24">
          <h2 className="text-3xl font-bold text-white">Built with</h2>
          <p className="mt-3 text-slate-400">React, TypeScript, Tailwind, Framer Motion and React Flow on the front end. FastAPI, SQLAlchemy and Gemini on the back end, with OpenAlex and Semantic Scholar for research. Works in an offline mode when no API key is set.</p>
        </section>
      </main>
      <footer className="border-t border-white/10 py-6 text-center text-sm text-slate-500">
        Synapse. Scores and solutions are AI-generated estimates, not validated results.
      </footer>
    </div>
  );
}
