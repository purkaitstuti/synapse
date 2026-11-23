
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export type Item = {
  id: number;
  title: string;
  created_at: string;
  analogies: number;
  solutions: number;
};

const API = "http://127.0.0.1:8000";

export async function post(url: string, body: unknown) {
  const endpoint = url.startsWith("http") ? url : `${API}${url}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : `Request failed (${response.status})`
    );
  }

  return data;
}

export function useDiscoveries() {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<Item[]>([]);
  const [err, setErr] = useState("");

  const did = params.get("d");

  useEffect(() => {
    const controller = new AbortController();

    async function loadDiscoveries() {
      try {
        const response = await fetch(`${API}/api/discoveries`, {
          signal: controller.signal,
        });

        const data: unknown = await response.json();

        if (!response.ok) {
          throw new Error(`Failed to load discoveries (${response.status})`);
        }

        const records: unknown[] = Array.isArray(data)
          ? data
          : data !== null &&
              typeof data === "object" &&
              "discoveries" in data &&
              Array.isArray(data.discoveries)
            ? data.discoveries
            : [];

        const items: Item[] = records
          .filter(
            (record): record is Record<string, unknown> =>
              record !== null && typeof record === "object"
          )
          .map((record) => ({
            id: Number(record.id ?? record.discovery_id),
            title: String(
              record.title ??
                record.problem ??
                record.innovation_title ??
                `Discovery ${record.id ?? record.discovery_id}`
            ),
            created_at: String(record.created_at ?? ""),
            analogies: Number(record.analogies ?? 0),
            solutions: Number(record.solutions ?? 0),
          }))
          .filter((item) => Number.isFinite(item.id) && item.id > 0);

        if (!controller.signal.aborted) {
          setList(items);
          setErr("");
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErr(
            error instanceof Error
              ? error.message
              : "Unable to load saved discoveries."
          );
        }
      }
    }

    void loadDiscoveries();

    return () => controller.abort();
  }, []);

  return {
    list,
    err,
    did,
    setDid: (value: string) => setParams({ d: value }),
  };
}
