import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "../lib/socket.js";

// Public STUN server for NAT traversal testing. For real-world reliability
// (roughly 15-20% of network pairs can't connect via STUN alone) you need a
// TURN server too — see backend README for coturn setup notes.
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export function useWebRTC(roomId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // socketId -> { stream, name }
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const peersRef = useRef({}); // socketId -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const cameraTrackRef = useRef(null);

  const createPeerConnection = useCallback((peerId, peerName) => {
    const socket = getSocket();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", { to: peerId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [peerId]: { stream: event.streams[0], name: peerName },
      }));
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      }
    };

    peersRef.current[peerId] = pc;
    return pc;
  }, []);

  const handleOffer = useCallback(
    async ({ from, offer }) => {
      const socket = getSocket();
      const pc = peersRef.current[from] || createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", { to: from, answer });
    },
    [createPeerConnection]
  );

  const handleAnswer = useCallback(async ({ from, answer }) => {
    const pc = peersRef.current[from];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  const handleIceCandidate = useCallback(async ({ from, candidate }) => {
    const pc = peersRef.current[from];
    if (pc && candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("Failed to add ICE candidate", err);
      }
    }
  }, []);

  const callPeer = useCallback(
    async (peerId, peerName) => {
      const socket = getSocket();
      const pc = createPeerConnection(peerId, peerName);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", { to: peerId, offer });
    },
    [createPeerConnection]
  );

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !roomId) return;

    let cancelled = false;

    async function setup() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      cameraTrackRef.current = stream.getVideoTracks()[0];
      setLocalStream(stream);

      socket.emit("join-room", roomId);
    }

    function onRoomJoined({ peers }) {
      // We're the newcomer — call everyone who's already here.
      peers.forEach((p) => callPeer(p.socketId, p.name));
    }

    function onPeerJoined() {
      // An existing peer just learned someone new arrived; the newcomer
      // will call us, so we just wait for their offer.
    }

    function onPeerLeft({ socketId }) {
      peersRef.current[socketId]?.close();
      delete peersRef.current[socketId];
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    }

    socket.on("room-joined", onRoomJoined);
    socket.on("peer-joined", onPeerJoined);
    socket.on("peer-left", onPeerLeft);
    socket.on("webrtc-offer", handleOffer);
    socket.on("webrtc-answer", handleAnswer);
    socket.on("webrtc-ice-candidate", handleIceCandidate);

    setup();

    return () => {
      cancelled = true;
      socket.off("room-joined", onRoomJoined);
      socket.off("peer-joined", onPeerJoined);
      socket.off("peer-left", onPeerLeft);
      socket.off("webrtc-offer", handleOffer);
      socket.off("webrtc-answer", handleAnswer);
      socket.off("webrtc-ice-candidate", handleIceCandidate);

      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setRemoteStreams({});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }, []);

  const toggleCam = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  }, []);

  const startScreenShare = useCallback(async () => {
    const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = displayStream.getVideoTracks()[0];

    // Swap the outgoing video track on every existing connection — the
    // remote side sees this as the same video "slot" just changing content.
    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      sender?.replaceTrack(screenTrack);
    });

    // Reflect the screen share locally too.
    localStreamRef.current.removeTrack(cameraTrackRef.current);
    localStreamRef.current.addTrack(screenTrack);
    setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    setIsScreenSharing(true);

    screenTrack.onended = () => stopScreenShare();
  }, []);

  const stopScreenShare = useCallback(() => {
    const camTrack = cameraTrackRef.current;
    if (!camTrack) return;

    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      sender?.replaceTrack(camTrack);
    });

    const current = localStreamRef.current.getVideoTracks()[0];
    if (current && current !== camTrack) {
      localStreamRef.current.removeTrack(current);
      current.stop();
    }
    localStreamRef.current.addTrack(camTrack);
    setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    setIsScreenSharing(false);
  }, []);

  return {
    localStream,
    remoteStreams,
    micOn,
    camOn,
    isScreenSharing,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
  };
}
