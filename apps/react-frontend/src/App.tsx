import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LandingPage, Dashboard } from "@/components/pages";
import { ThemeProvider } from "@/components/providers";

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
