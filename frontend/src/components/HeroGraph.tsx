import { motion } from "framer-motion";

// Two distant concepts, bridged by a shared mechanism. Drawn in once on load.
const N = [
  { id: "p", x: 70, y: 150, label: "Cooling a building", c: "#3B82F6" },
  { id: "m", x: 300, y: 70, label: "Passive airflow", c: "#34D399" },
  { id: "a", x: 530, y: 150, label: "Termite mound", c: "#FB923C" },
  { id: "d", x: 300, y: 250, label: "Biology", c: "#8B5CF6" },
];
const E: [string, string][] = [["p", "m"], ["m", "a"], ["a", "d"], ["d", "p"]];
const at = (id: string) => N.find((n) => n.id === id)!;

export default function HeroGraph() {
  return (
    <svg viewBox="0 0 600 320" className="w-full max-w-2xl" role="img"
         aria-label="A building-cooling problem connected to termite mounds through passive airflow">
      {E.map(([a, b], i) => (
        <motion.line key={i} x1={at(a).x} y1={at(a).y} x2={at(b).x} y2={at(b).y}
          stroke="#22D3EE" strokeOpacity={0.55} strokeWidth={1.5}
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, delay: 0.3 + i * 0.35 }} />
      ))}
      {N.map((n, i) => (
        <motion.g key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.2 }}>
          <circle cx={n.x} cy={n.y} r={16} fill={n.c} fillOpacity={0.18} />
          <circle cx={n.x} cy={n.y} r={7} fill={n.c} />
          <text x={n.x} y={n.y + 34} textAnchor="middle" fontSize="13" fill="#CBD5E1">{n.label}</text>
        </motion.g>
      ))}
    </svg>
  );
}
