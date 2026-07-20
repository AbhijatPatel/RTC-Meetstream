import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useWebRTC } from "../hooks/useWebRTC.js";
import VideoTile from "../components/VideoTile.jsx";
import Controls from "../components/Controls.jsx";
import Whiteboard from "../components/Whiteboard.jsx";
import ChatPanel from "../components/ChatPanel.jsx";

export default function Room() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [panel, setPanel] = useState("chat"); // 'chat' | 'whiteboard' | null

  const {
    localStream,
    remoteStreams,
    micOn,
    camOn,
    isScreenSharing,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC(roomId);

  function handleLeave() {
    navigate("/lobby");
  }

  return (
    <div className="room-screen">
      <div className="room-main">
        <div className="video-grid">
          <VideoTile stream={localStream} name={user?.name} muted isSelf />
          {Object.entries(remoteStreams).map(([id, { stream, name }]) => (
            <VideoTile key={id} stream={stream} name={name} />
          ))}
        </div>

        <Controls
          roomId={roomId}
          micOn={micOn}
          camOn={camOn}
          isScreenSharing={isScreenSharing}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
          onToggleScreenShare={isScreenSharing ? stopScreenShare : startScreenShare}
          onLeave={handleLeave}
        />
      </div>

      <aside className="room-side">
        <div className="side-tabs">
          <button
            className={panel === "chat" ? "side-tab side-tab--active" : "side-tab"}
            onClick={() => setPanel("chat")}
          >
            Chat & files
          </button>
          <button
            className={panel === "whiteboard" ? "side-tab side-tab--active" : "side-tab"}
            onClick={() => setPanel("whiteboard")}
          >
            Whiteboard
          </button>
        </div>
        {panel === "chat" ? <ChatPanel /> : <Whiteboard />}
      </aside>
    </div>
  );
}
