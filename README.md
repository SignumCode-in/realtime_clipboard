# Realtime Clipboard

A monorepo (PNPM + Turborepo) app that allows you to instantly share and sync text/clipboard contents across multiple devices in real-time.

Built with React (Vite) for the frontend and Node.js (Socket.IO) for the backend.

## 🚀 Features

- **Realtime Sync**: Type or paste on one device, see it instantly on others.
- **Cross-device**: Simple URL-based or QR Code joining.
- **PWA support**: Installable on mobile/desktop devices with minimal offline fallback.
- **Single Service Deployment**: The Node server statically serves the React app and handles WebSocket connections on the same port.
- **Modern UI**: Clean glassmorphism design with Tailwind CSS.

## 📦 Project Structure

```
realtime-clipboard/
├── apps/
│   ├── web/      # React + Vite + Tailwind frontend
│   └── server/   # Node.js + Express + Socket.IO backend
├── packages/
│   └── shared/   # Shared TypeScript definitions and constants (sockets events, types)
├── package.json  # Root package for workspace and deployment commands
├── turbo.json    # Turborepo configuration
└── pnpm-workspace.yaml
```

## 🛠 Setup & Development

### 1. Install dependencies
```bash
pnpm install
```

### 2. Run local development
```bash
pnpm dev
```
- Frontend will run on `http://localhost:3000`
- Backend will run on `http://localhost:3001`

*(Frontend is configured to proxy/connect to `http://localhost:3001` in dev mode automatically).*

### 3. Build for Production
```bash
pnpm build
```

---

## 🚀 Deployment (e.g., Render)

This project is tailored to be deployed as a **Single Web Service** on platforms like Render.

**Render Configuration:**
- **Environment**: Node
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `pnpm start`
- **Environment Variables**:
  - `NODE_ENV` = `production`
  - `PORT` = `10000` (Render sets this automatically)

In production mode, the Express server statically serves the Vite build located in `apps/web/dist`.

## 🧪 Testing it Setup
1. Deploy or run `pnpm start` locally (after building).
2. Open the URL in two separate browsers or devices.
3. Click **Create a new clipboard**.
4. Scan the QR code with your phone to join the room.
5. Paste text on your laptop – see it instantly appear on the phone. Click "Copy" on the phone!

Enjoy your Realtime Clipboard!
