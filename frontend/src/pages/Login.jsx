import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate("/lobby");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Meetstream</h1>
        <p className="auth-sub">Video, screen share, and a whiteboard — in one room.</p>

        <div className="auth-tabs">
          <button
            className={mode === "login" ? "auth-tab auth-tab--active" : "auth-tab"}
            onClick={() => setMode("login")}
            type="button"
          >
            Log in
          </button>
          <button
            className={mode === "register" ? "auth-tab auth-tab--active" : "auth-tab"}
            onClick={() => setMode("register")}
            type="button"
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          {error && <div className="auth-error">{error}</div>}
          <button className="ctl-btn ctl-btn--active" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
