import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function randomRoomCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

export default function Lobby() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Hi, {user?.name?.split(" ")[0]}</h1>
        <p className="auth-sub">Start a new room or join one with a code.</p>

        <button
          className="ctl-btn ctl-btn--active"
          style={{ width: "100%", marginBottom: 12 }}
          onClick={() => navigate(`/room/${randomRoomCode()}`)}
        >
          Start new room
        </button>

        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (joinCode.trim()) navigate(`/room/${joinCode.trim().toUpperCase()}`);
          }}
        >
          <input
            placeholder="Room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button className="ctl-btn" type="submit">
            Join room
          </button>
        </form>

        <button
          className="ctl-btn ctl-btn--danger"
          style={{ marginTop: 20, width: "100%" }}
          onClick={logout}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
