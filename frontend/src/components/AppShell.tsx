import { NavLink, Outlet } from "react-router-dom";
import Logo from "./Logo";
import { NAV } from "../nav";

export default function AppShell() {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-white/10 bg-ink-900 p-4 md:block">
        <NavLink to="/" className="mb-6 block"><Logo /></NavLink>
        <nav className="space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink key={n.path} to={n.path} end={n.path === "/app"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5"}`}>
                <Icon size={16} />{n.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 p-6 md:p-10"><Outlet /></main>
    </div>
  );
}
