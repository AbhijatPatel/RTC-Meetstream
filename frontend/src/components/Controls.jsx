export default function Controls({
  micOn,
  camOn,
  isScreenSharing,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onLeave,
  roomId,
}) {
  return (
    <div className="controls-bar">
      <div className="room-code mono">room: {roomId}</div>
      <div className="controls-group">
        <button
          className={`ctl-btn ${micOn ? "" : "ctl-btn--off"}`}
          onClick={onToggleMic}
          aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
        >
          {micOn ? "Mic on" : "Mic off"}
        </button>
        <button
          className={`ctl-btn ${camOn ? "" : "ctl-btn--off"}`}
          onClick={onToggleCam}
          aria-label={camOn ? "Turn camera off" : "Turn camera on"}
        >
          {camOn ? "Camera on" : "Camera off"}
        </button>
        <button
          className={`ctl-btn ${isScreenSharing ? "ctl-btn--active" : ""}`}
          onClick={onToggleScreenShare}
        >
          {isScreenSharing ? "Stop sharing" : "Share screen"}
        </button>
      </div>
      <button className="ctl-btn ctl-btn--danger" onClick={onLeave}>
        Leave
      </button>
    </div>
  );
}
