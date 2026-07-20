import { useEffect, useRef, useState } from "react";
import { getSocket } from "../lib/socket.js";

const COLORS = ["#eceef4", "#e8a33d", "#3fb6a8", "#e0575a"];

function drawSegment(ctx, seg) {
  ctx.strokeStyle = seg.color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(seg.x0, seg.y0);
  ctx.lineTo(seg.x1, seg.y1);
  ctx.stroke();
}

export default function Whiteboard() {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    const socket = getSocket();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function onRoomJoined({ whiteboardHistory }) {
      whiteboardHistory?.forEach((seg) => drawSegment(ctx, seg));
    }
    function onDraw(seg) {
      drawSegment(ctx, seg);
    }
    function onClear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    socket.on("room-joined", onRoomJoined);
    socket.on("whiteboard-draw", onDraw);
    socket.on("whiteboard-clear", onClear);

    return () => {
      socket.off("room-joined", onRoomJoined);
      socket.off("whiteboard-draw", onDraw);
      socket.off("whiteboard-clear", onClear);
    };
  }, []);

  function pointFromEvent(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e) {
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(e);
  }

  function handlePointerMove(e) {
    if (!drawingRef.current) return;
    const point = pointFromEvent(e);
    const seg = {
      x0: lastPointRef.current.x,
      y0: lastPointRef.current.y,
      x1: point.x,
      y1: point.y,
      color,
    };
    drawSegment(canvasRef.current.getContext("2d"), seg);
    getSocket().emit("whiteboard-draw", seg);
    lastPointRef.current = point;
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    getSocket().emit("whiteboard-clear");
  }

  return (
    <div className="whiteboard-panel">
      <div className="whiteboard-toolbar">
        {COLORS.map((c) => (
          <button
            key={c}
            className={`swatch ${color === c ? "swatch--active" : ""}`}
            style={{ background: c }}
            aria-label={`Select color ${c}`}
            onClick={() => setColor(c)}
          />
        ))}
        <button className="ctl-btn" onClick={handleClear}>
          Clear board
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={640}
        height={420}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
      />
    </div>
  );
}
