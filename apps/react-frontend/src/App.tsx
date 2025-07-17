import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LandingPage } from "@/components/landing-page";
import { Dashboard } from "@/components/dashboard";
import { ThemeProvider } from "./components/theme-provider";

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="aiolos-ui-theme">
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
