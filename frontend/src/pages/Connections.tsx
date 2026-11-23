
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  type Node,
  type Edge,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

type GNode = {
  id: string;
  kind: string;
  label: string;
  discipline: string;
  detail: string;
};

type GEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  explanation: string;
};

type Graph = {
  nodes: GNode[];
  edges: GEdge[];
};

type Item = {
  id: number;
  title: string;
};

const COLORS: Record<string, string> = {
  problem: "#3B82F6",
  mechanism: "#10B981",
  analogy: "#F59E0B",
  concept: "#06B6D4",
  solution: "#EC4899",
  discipline: "#8B5CF6",
};

const ORDER = [
  "problem",
  "mechanism",
  "analogy",
  "concept",
  "solution",
  "discipline",
];

const LABELS: Record<string, string> = {
  problem: "Research Problem",
  mechanism: "Retrieved Mechanism",
  analogy: "AI-Selected Mechanism",
  concept: "Scientific Concept",
  solution: "Proposed Innovation",
  discipline: "Scientific Discipline",
};

const ROW_HEIGHT = 245;
const COL_WIDTH = 290;
const NODE_WIDTH = 225;

function getColor(kind: string) {
  return COLORS[kind] ?? "#94A3B8";
}

function createLayout(graph: Graph): Node[] {
  const groups: Record<string, GNode[]> = {};

  graph.nodes.forEach((node) => {
    if (!groups[node.kind]) groups[node.kind] = [];
    groups[node.kind].push(node);
  });

  const maxCount = Math.max(
    1,
    ...Object.values(groups).map((items) => items.length)
  );

  const centerX = ((maxCount - 1) * COL_WIDTH) / 2;

  return graph.nodes.map((node) => {
    const group = groups[node.kind] ?? [node];
    const index = group.findIndex(
      (item) => item.id === node.id
    );
    const rowIndex = ORDER.indexOf(node.kind);

    return {
      id: node.id,
      type: "default",
      data: {
        label: node.label,
      },
      position: {
        x:
          centerX +
          (index - (group.length - 1) / 2) * COL_WIDTH -
          NODE_WIDTH / 2,
        y: Math.max(rowIndex, 0) * ROW_HEIGHT,
      },

      // Correct React Flow Position enum values.
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,

      draggable: true,
    };
  });
}

function findPath(graph: Graph, goal: string): string[] {
  if (goal === "problem") return ["problem"];

  const previous: Record<string, string | null> = {
    problem: null,
  };

  const queue = ["problem"];

  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];

    if (current === goal) {
      const path: string[] = [];
      let cursor: string | null = current;

      while (cursor !== null) {
        path.unshift(cursor);
        cursor = previous[cursor] ?? null;
      }

      return path;
    }

    for (const edge of graph.edges) {
      const next =
        edge.source === current
          ? edge.target
          : edge.target === current
          ? edge.source
          : null;

      if (next && !(next in previous)) {
        previous[next] = current;
        queue.push(next);
      }
    }
  }

  return [];
}

export default function Connections() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const discoveryId = params.get("d");

  const [discoveries, setDiscoveries] = useState<Item[]>([]);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [disciplineFilter, setDisciplineFilter] =
    useState("");
  const [selectedNode, setSelectedNode] =
    useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] =
    useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(
    new Set()
  );

  const [baseNodes, setBaseNodes, onNodesChange] =
    useNodesState([]);

  // --------------------------------------------------
  // LOAD SAVED DISCOVERIES
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadDiscoveries() {
      try {
        const response = await fetch("/api/discoveries");

        if (!response.ok) {
          throw new Error("Discovery API failed");
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid discoveries response");
        }

        if (!active) return;

        const items = data as Item[];
        setDiscoveries(items);
        setError("");

        if (!discoveryId && items.length > 0) {
          setParams({ d: String(items[0].id) });
        }
      } catch (err) {
        console.error("Discoveries error:", err);

        if (active) {
          setError("Could not load saved discoveries.");
        }
      }
    }

    loadDiscoveries();

    return () => {
      active = false;
    };

    // Load the discovery list once when this page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------
  // LOAD KNOWLEDGE GRAPH
  // --------------------------------------------------

  useEffect(() => {
    if (!discoveryId) {
      setGraph(null);
      return;
    }

    let active = true;

    setLoading(true);
    setError("");
    setGraph(null);
    setSelectedNode(null);
    setSelectedEdge(null);
    setPicked(new Set());
    setDisciplineFilter("");

    async function loadGraph() {
      try {
        const response = await fetch(
          `/api/graph/${encodeURIComponent(discoveryId!)}`
        );

        if (!response.ok) {
          throw new Error(
            `Graph API: ${response.status}`
          );
        }

        const data: Graph = await response.json();

        if (
          !Array.isArray(data.nodes) ||
          !Array.isArray(data.edges)
        ) {
          throw new Error("Invalid graph response");
        }

        if (!active) return;

        setGraph(data);
        setBaseNodes(createLayout(data));
      } catch (err) {
        console.error("Graph loading error:", err);

        if (active) {
          setError(
            "Could not load the selected knowledge graph."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadGraph();

    return () => {
      active = false;
    };
  }, [discoveryId, setBaseNodes]);

  // --------------------------------------------------
  // GRAPH DATA
  // --------------------------------------------------

  const byId = useMemo<Record<string, GNode>>(() => {
    const result: Record<string, GNode> = {};

    for (const node of graph?.nodes ?? []) {
      result[node.id] = node;
    }

    return result;
  }, [graph]);

  const disciplines = useMemo(() => {
    const values = new Set<string>();

    for (const node of graph?.nodes ?? []) {
      if (
        node.kind === "discipline" &&
        node.label
      ) {
        values.add(node.label);
      }
    }

    return [...values].sort();
  }, [graph]);

  const highlightedPath = useMemo(() => {
    if (!graph || !selectedNode) return [];

    return findPath(graph, selectedNode);
  }, [graph, selectedNode]);

  const highlightedPairs = useMemo(() => {
    const pairs = new Set<string>();

    for (
      let i = 1;
      i < highlightedPath.length;
      i++
    ) {
      const a = highlightedPath[i - 1];
      const b = highlightedPath[i];

      pairs.add(`${a}|${b}`);
      pairs.add(`${b}|${a}`);
    }

    return pairs;
  }, [highlightedPath]);

  const nodes: Node[] = useMemo(() => {
    return baseNodes
      .filter((node) => {
        const data = byId[node.id];

        if (!data) return false;
        if (!disciplineFilter) return true;

        if (
          data.kind === "problem" ||
          data.kind === "solution"
        ) {
          return true;
        }

        if (data.kind === "discipline") {
          return data.label === disciplineFilter;
        }

        return (
          !data.discipline ||
          data.discipline === disciplineFilter
        );
      })
      .map((node) => {
        const data = byId[node.id];
        const color = getColor(data.kind);

        const isSelected = selectedNode === node.id;
        const isPicked = picked.has(data.label);
        const isHighlighted =
          highlightedPath.length === 0 ||
          highlightedPath.includes(node.id);

        return {
          ...node,
          data: {
            label: (
              <div className="text-center">
                <div
                  className="mb-2 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color }}
                >
                  {LABELS[data.kind] ?? data.kind}
                </div>

                <div className="break-words text-[13px] font-semibold leading-5 text-white">
                  {data.label}
                </div>

                {data.discipline &&
                  data.kind !== "discipline" && (
                    <div className="mt-2 truncate text-[10px] text-slate-400">
                      {data.discipline}
                    </div>
                  )}

                {isPicked && (
                  <div className="mt-2 text-[10px] text-cyan-300">
                    Selected for fusion
                  </div>
                )}
              </div>
            ),
          },
          style: {
            width: NODE_WIDTH,
            minHeight: 90,
            padding: "14px",
            background: "#101A2E",
            border: `${
              isSelected || isPicked ? 2 : 1
            }px solid ${color}`,
            borderRadius: 14,
            color: "#FFFFFF",
            opacity: isHighlighted ? 1 : 0.3,
            boxShadow: isSelected
              ? `0 0 24px ${color}55`
              : "0 6px 20px #00000033",
            transition:
              "opacity 150ms ease, box-shadow 150ms ease",
          },
        };
      });
  }, [
    baseNodes,
    byId,
    disciplineFilter,
    highlightedPath,
    selectedNode,
    picked,
  ]);

  const shownIds = useMemo(
    () => new Set(nodes.map((node) => node.id)),
    [nodes]
  );

  const edges: Edge[] = useMemo(() => {
    return (graph?.edges ?? [])
      .filter(
        (edge) =>
          shownIds.has(edge.source) &&
          shownIds.has(edge.target)
      )
      .map((edge) => {
        const highlighted = highlightedPairs.has(
          `${edge.source}|${edge.target}`
        );

        const selected = selectedEdge === edge.id;
        const emphasized = highlighted || selected;

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: "smoothstep",
          animated: emphasized,
          label: emphasized
            ? edge.type
            : undefined,
          labelStyle: {
            fill: "#E2E8F0",
            fontSize: 11,
            fontWeight: 600,
          },
          labelBgStyle: {
            fill: "#101A2E",
          },
          labelBgPadding: [6, 4],
          labelBgBorderRadius: 5,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: emphasized
              ? "#22D3EE"
              : "#475569",
            width: 14,
            height: 14,
          },
          style: {
            stroke: emphasized
              ? "#22D3EE"
              : "#475569",
            strokeWidth: emphasized
              ? 2.5
              : 1.3,
            opacity:
              selectedNode && !highlighted
                ? 0.2
                : 0.85,
          },
        };
      });
  }, [
    graph,
    shownIds,
    highlightedPairs,
    selectedEdge,
    selectedNode,
  ]);

  const currentNode = selectedNode
    ? byId[selectedNode]
    : null;

  const currentEdge = selectedEdge
    ? graph?.edges.find(
        (edge) => edge.id === selectedEdge
      )
    : null;

  const canFuse = (node: GNode) =>
    ["concept", "mechanism", "analogy"].includes(
      node.kind
    );

  function togglePick(label: string) {
    setPicked((previous) => {
      const next = new Set(previous);

      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }

      return next;
    });
  }

  function openFusion() {
    if (picked.size < 2 || !discoveryId) return;

    const concepts = encodeURIComponent(
      [...picked].join("|")
    );

    navigate(
      `/app/fusion?d=${encodeURIComponent(
        discoveryId
      )}&c=${concepts}`
    );
  }

  function resetLayout() {
    if (!graph) return;

    setBaseNodes(createLayout(graph));
    setSelectedNode(null);
    setSelectedEdge(null);
  }

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Knowledge Connections
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Explore scientific mechanisms, interdisciplinary
          relationships, and AI-generated innovation concepts.
        </p>
      </div>

      {/* DISCOVERY CONTROLS */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={discoveryId ?? ""}
          onChange={(event) =>
            setParams({ d: event.target.value })
          }
          className="min-w-[250px] max-w-full flex-1 rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white"
        >
          {discoveries.length === 0 && (
            <option value="">
              No saved discoveries
            </option>
          )}

          {discoveries.map((item) => (
            <option key={item.id} value={item.id}>
              #{item.id} {item.title}
            </option>
          ))}
        </select>

        <select
          value={disciplineFilter}
          onChange={(event) =>
            setDisciplineFilter(event.target.value)
          }
          className="rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white"
        >
          <option value="">
            All disciplines
          </option>

          {disciplines.map((discipline) => (
            <option
              key={discipline}
              value={discipline}
            >
              {discipline}
            </option>
          ))}
        </select>

        <button
          onClick={resetLayout}
          disabled={!graph}
          className="rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white transition hover:bg-white/10 disabled:opacity-40"
        >
          Reset Layout
        </button>

        <button
          disabled={picked.size < 2}
          onClick={openFusion}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Fuse Selected ({picked.size})
        </button>
      </div>

      {/* LEGEND */}
      <div className="flex flex-wrap gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        {ORDER.map((kind) => (
          <div
            key={kind}
            className="flex items-center gap-2 text-xs text-slate-300"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: getColor(kind),
              }}
            />
            {LABELS[kind]}
          </div>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300"
        >
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-white/10 p-6 text-center text-sm text-slate-400">
          Loading knowledge graph...
        </div>
      )}

      {!discoveryId && !loading && !error && (
        <div className="rounded-xl border border-white/10 p-8 text-center text-slate-400">
          No saved discoveries yet. Generate an innovation
          from the Discover page first.
        </div>
      )}

      {/* GRAPH AND INFORMATION PANEL */}
      {graph && !loading && (
        <div className="flex flex-col gap-4 xl:flex-row">
          <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#080F1E]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Discovery Knowledge Graph
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {nodes.length} visible nodes ·{" "}
                  {edges.length} relationships
                </p>
              </div>

              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-300">
                Verification pending
              </span>
            </div>

            <div className="h-[720px] w-full">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onNodeClick={(_, node) => {
                  setSelectedNode(node.id);
                  setSelectedEdge(null);
                }}
                onEdgeClick={(_, edge) => {
                  setSelectedEdge(edge.id);
                  setSelectedNode(null);
                }}
                onPaneClick={() => {
                  setSelectedNode(null);
                  setSelectedEdge(null);
                }}
                fitView
                fitViewOptions={{
                  padding: 0.2,
                  maxZoom: 1,
                }}
                minZoom={0.15}
                maxZoom={2}
                nodesDraggable
                nodesConnectable={false}
                attributionPosition="bottom-left"
                proOptions={{
                  hideAttribution: true,
                }}
              >
                <Background
                  color="#334155"
                  gap={22}
                  size={1}
                />

                <Controls
                  position="bottom-left"
                  showInteractive={false}
                />

                <MiniMap
                  position="bottom-right"
                  nodeColor={(node) =>
                    getColor(
                      byId[node.id]?.kind ?? ""
                    )
                  }
                  maskColor="rgba(5, 10, 20, 0.7)"
                  style={{
                    background: "#101A2E",
                    border: "1px solid #334155",
                  }}
                  pannable
                  zoomable
                />
              </ReactFlow>
            </div>
          </div>

          {/* DETAILS PANEL */}
          <aside className="glass w-full self-start rounded-2xl p-5 text-sm xl:w-[320px]">
            <h2 className="text-lg font-semibold text-white">
              Connection Explorer
            </h2>

            <div className="my-4 border-t border-white/10" />

            {!currentNode && !currentEdge && (
              <div className="space-y-4 text-slate-400">
                <p>
                  Select any node to explore its scientific
                  mechanism, discipline, or proposed innovation.
                </p>

                <p>
                  Select a connecting line to understand the
                  relationship between two nodes.
                </p>

                <p>
                  Drag nodes to rearrange the graph. Use the
                  zoom controls to navigate.
                </p>

                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs">
                  Retrieved relationships and AI-generated
                  connections are experimental and require
                  independent scientific verification.
                </div>
              </div>
            )}

            {currentNode && (
              <div className="space-y-4">
                <div>
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{
                      color: getColor(
                        currentNode.kind
                      ),
                    }}
                  >
                    {LABELS[currentNode.kind] ??
                      currentNode.kind}
                  </span>

                  <h3 className="mt-2 break-words text-lg font-semibold text-white">
                    {currentNode.label}
                  </h3>
                </div>

                {currentNode.discipline && (
                  <div>
                    <p className="mb-1 text-xs uppercase text-slate-500">
                      Scientific Domain
                    </p>

                    <p className="text-slate-300">
                      {currentNode.discipline}
                    </p>
                  </div>
                )}

                {currentNode.detail && (
                  <div>
                    <p className="mb-2 text-xs uppercase text-slate-500">
                      Description
                    </p>

                    <p className="whitespace-pre-line break-words leading-6 text-slate-300">
                      {currentNode.detail}
                    </p>
                  </div>
                )}

                {highlightedPath.length > 1 && (
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase text-cyan-300">
                      Path from Problem
                    </p>

                    <p className="break-words text-xs leading-6 text-slate-300">
                      {highlightedPath
                        .map(
                          (id) =>
                            byId[id]?.label ?? id
                        )
                        .join(" → ")}
                    </p>
                  </div>
                )}

                {canFuse(currentNode) && (
                  <button
                    onClick={() =>
                      togglePick(
                        currentNode.label
                      )
                    }
                    className="w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
                  >
                    {picked.has(
                      currentNode.label
                    )
                      ? "Remove from Fusion"
                      : "Select for Fusion"}
                  </button>
                )}
              </div>
            )}

            {currentEdge && (
              <div className="space-y-4">
                <span className="text-xs font-semibold uppercase text-cyan-300">
                  {currentEdge.type}
                </span>

                <h3 className="break-words text-base font-semibold leading-6 text-white">
                  {byId[
                    currentEdge.source
                  ]?.label}
                  {" → "}
                  {byId[
                    currentEdge.target
                  ]?.label}
                </h3>

                <div>
                  <p className="mb-2 text-xs uppercase text-slate-500">
                    Relationship Explanation
                  </p>

                  <p className="leading-6 text-slate-300">
                    {currentEdge.explanation}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="text-xs leading-5 text-slate-500">
                SYNAPSE AI · Conceptual Knowledge Graph
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
