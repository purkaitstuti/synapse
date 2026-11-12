import type { Item } from "../api/hooks";

export default function Picker({ list, did, setDid }: { list: Item[]; did: string | null; setDid: (v: string) => void }) {
  if (!list.length) return <p className="text-slate-400">No discoveries yet. Run one from Discover first.</p>;
  return (
    <select value={did ?? ""} onChange={(e) => setDid(e.target.value)} aria-label="Discovery"
      className="rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm">
      {list.map((i) => <option key={i.id} value={i.id}>#{i.id} {i.title}</option>)}
    </select>
  );
}
