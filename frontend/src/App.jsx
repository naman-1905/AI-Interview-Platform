import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import WaitingRoom from "./pages/WaitingRoom";
import ChatRoom from "./pages/ChatRoom";
import Result from "./pages/Result";
import AdminDashboard from "./pages/AdminDashboard";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/queue" element={<WaitingRoom />} />
      <Route path="/interview" element={<ChatRoom />} />
      <Route path="/result" element={<Result />} />

      {/* Admin */}
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}
