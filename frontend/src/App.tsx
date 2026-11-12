import { Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import Discover from "./pages/Discover";
import Connections from "./pages/Connections";
import FusionPage from "./pages/Fusion";
import WhatIf from "./pages/WhatIf";
import Reverse from "./pages/Reverse";
import Research from "./pages/Research";
import Workspace from "./pages/Workspace";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="discover" element={<Discover />} />
        <Route path="connections" element={<Connections />} />
        <Route path="fusion" element={<FusionPage />} />
        <Route path="what-if" element={<WhatIf />} />
        <Route path="reverse" element={<Reverse />} />
        <Route path="research" element={<Research />} />
        <Route path="workspace" element={<Workspace />} />
      </Route>
    </Routes>
  );
}
