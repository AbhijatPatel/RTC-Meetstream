# Meetstream — real-time video, screen share & whiteboard

A working scaffold for the project: multi-user video calling, screen sharing,
in-call file sharing, a synced whiteboard, JWT auth, and a Socket.io
signaling server. Built with WebRTC + Socket.io + Express + React.

## What's actually implemented

- **Auth** — register/login with bcrypt-hashed passwords, JWT sessions (REST API)
- **Signaling** — Socket.io server relays WebRTC offer/answer/ICE between peers; never touches media itself
- **Video calling** — mesh WebRTC (every peer connects to every peer directly). Good for small rooms (2-6 people); see "Scaling past mesh" below for larger rooms
- **Screen sharing** — swaps your outgoing video track for `getDisplayMedia()`, no renegotiation needed
- **Whiteboard** — HTML canvas, strokes broadcast over Socket.io, history replayed for anyone who joins late
- **File sharing** — upload via REST (multer, saved to `backend/uploads/`), link broadcast to the room over Socket.io
- **Encryption** — WebRTC media is encrypted by default (DTLS-SRTP); signaling should run over WSS in production (see below)

## Project layout

```
rtc-app/
  backend/     Express + Socket.io + JWT auth + file upload
  frontend/    React (Vite) — login, lobby, call room
```

## Running it locally

**1. Backend**

```bash
cd backend
cp .env.example .env      # edit JWT_SECRET before doing anything real with this
npm install
npm run dev                # http://localhost:4000
```

**2. Frontend** (separate terminal)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```

Open `http://localhost:5173` in two different browser windows (or two
devices), register two accounts, and join the same room code to test a call
with yourself.

## How the pieces fit together

- `backend/server.js` — Express app + HTTP server + Socket.io, wired together
- `backend/src/routes/auth.js` — register/login, issues JWTs
- `backend/src/routes/upload.js` — multer file upload endpoint (JWT-protected)
- `backend/src/socket/index.js` — the actual signaling logic: rooms, offer/answer/ICE relay, whiteboard state, chat
- `frontend/src/hooks/useWebRTC.js` — the core of the video calling feature: creates `RTCPeerConnection`s, handles the offer/answer dance, screen share track swapping
- `frontend/src/components/Whiteboard.jsx` — canvas drawing + sync
- `frontend/src/components/ChatPanel.jsx` — chat + file sharing UI

## Before you'd trust this with real traffic

This is a scaffold meant to be extended, not a production deployment. Known gaps:

- **TURN server** — only a public STUN server is configured (`useWebRTC.js`). Without TURN, calls fail for users behind symmetric NAT/restrictive firewalls (roughly 15-20% of real-world network pairs). Run [coturn](https://github.com/coturn/coturn) yourself or use a managed option (Twilio, Xirsys, Cloudflare Calls) and add it to `ICE_SERVERS`.
- **User store** — `backend/src/utils/store.js` is a flat JSON file. Fine for local dev, not safe for concurrent writes at scale. Swap in Postgres/MongoDB — the function signatures (`findUserByEmail`, `createUser`, etc.) are the only thing that needs to change.
- **WSS in production** — Socket.io needs to run behind TLS (nginx/Caddy terminating HTTPS, or a platform that does it for you) so signaling isn't sent in plaintext.
- **Mesh scaling** — mesh P2P gets expensive past ~6 participants (bandwidth scales O(n²) per client). For larger rooms, introduce an SFU (mediasoup, LiveKit, Janus) that each client sends one stream to instead of connecting to every peer.
- **Rate limiting** — none of the REST or socket endpoints are rate-limited; add it before exposing this publicly.
- **File size/type validation** — uploads are capped at 50MB but not type-checked; add validation before accepting arbitrary uploads in production.
