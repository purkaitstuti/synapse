import { BookOpen, Combine, Compass, FolderKanban, LayoutDashboard, Network, SlidersHorizontal, Undo2 } from "lucide-react";

export const NAV = [
  { path: "/app", label: "Dashboard", icon: LayoutDashboard, phase: 1 },
  { path: "/app/discover", label: "Discover", icon: Compass, phase: 3 },
  { path: "/app/connections", label: "Connections", icon: Network, phase: 5 },
  { path: "/app/fusion", label: "Idea Fusion", icon: Combine, phase: 6 },
  { path: "/app/what-if", label: "What-If Simulator", icon: SlidersHorizontal, phase: 8 },
  { path: "/app/reverse", label: "Reverse Innovation", icon: Undo2, phase: 8 },
  { path: "/app/research", label: "Research Library", icon: BookOpen, phase: 7 },
  { path: "/app/workspace", label: "My Workspace", icon: FolderKanban, phase: 8 },
];
