import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import QueuePage from "./pages/QueuePage";
import InterviewPage from "./pages/InterviewPage";
import ResultPage from "./pages/ResultPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/queue" element={<QueuePage />} />
      <Route path="/interview" element={<InterviewPage />} />
      <Route path="/result" element={<ResultPage />} />

      {/* Admin */}
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
