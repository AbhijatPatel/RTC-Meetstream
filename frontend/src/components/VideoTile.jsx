import { useEffect, useRef } from "react";

export default function VideoTile({ stream, name, muted = false, isSelf = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream]);

  return (
    <div className="video-tile">
      <video ref={videoRef} autoPlay playsInline muted={muted} />
      <span className="video-label">
        {name || "Guest"} {isSelf ? "(you)" : ""}
      </span>
    </div>
  );
}
