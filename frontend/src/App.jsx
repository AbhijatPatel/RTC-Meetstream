import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Lobby from "./pages/Lobby.jsx";
import Room from "./pages/Room.jsx";

function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/lobby"
        element={
          <ProtectedRoute>
            <Lobby />
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/:roomId"
        element={
          <ProtectedRoute>
            <Room />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
