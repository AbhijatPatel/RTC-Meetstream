import { useEffect, useRef, useState } from "react";
import { getSocket } from "../lib/socket.js";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function ChatPanel() {
  const { token } = useAuth();
  const [messages, setMessages] = useState([]); // { kind: 'text'|'file', from, text/url/fileName, at }
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();

    function onChat(msg) {
      setMessages((prev) => [...prev, { kind: "text", ...msg }]);
    }
    function onFile(file) {
      setMessages((prev) => [...prev, { kind: "file", ...file }]);
    }

    socket.on("chat-message", onChat);
    socket.on("file-shared", onFile);
    return () => {
      socket.off("chat-message", onChat);
      socket.off("file-shared", onFile);
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  function sendMessage(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    getSocket().emit("chat-message", draft.trim());
    setDraft("");
  }

  async function handleFilePick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { url, fileName, size } = await api.uploadFile(file, token);
      getSocket().emit("file-shared", { url, fileName, size });
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-list" ref={listRef}>
        {messages.map((m, i) =>
          m.kind === "file" ? (
            <div key={i} className="chat-msg">
              <span className="chat-author">{m.from}</span>
              <a href={m.url} target="_blank" rel="noreferrer">
                📎 {m.fileName}
              </a>
            </div>
          ) : (
            <div key={i} className="chat-msg">
              <span className="chat-author">{m.from}</span>
              <span>{m.text}</span>
            </div>
          )
        )}
      </div>
      <form className="chat-input-row" onSubmit={sendMessage}>
        <button
          type="button"
          className="ctl-btn"
          onClick={() => fileInputRef.current.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "+ File"}
        </button>
        <input type="file" hidden ref={fileInputRef} onChange={handleFilePick} />
        <input
          className="chat-text-input"
          placeholder="Message the room"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="ctl-btn ctl-btn--active" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
