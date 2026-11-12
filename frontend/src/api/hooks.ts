import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export type Item = { id: number; title: string; created_at: string; analogies: number; solutions: number };

export async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const b = await r.json().catch(() => null);
  if (!r.ok) throw new Error(typeof b?.detail === "string" ? b.detail : b?.detail?.[0]?.msg ?? `Request failed (${r.status})`);
  return b;
}

export function useDiscoveries() {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<Item[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch("/api/discoveries").then((r) => r.json()).then((l: Item[]) => {
      setList(l);
      if (!params.get("d") && l.length) setParams({ d: String(l[0].id) }, { replace: true });
    }).catch(() => setErr("Cannot reach the backend. Start it with: uvicorn app.main:app --reload (in backend/)."));
  }, []);
  return { list, err, did: params.get("d"), setDid: (v: string) => setParams({ d: v }) };
}
