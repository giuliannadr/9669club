# 9669 Club

Real-time streaming and management ecosystem for live events — parties, shows, concerts.

**Live:** [av-admin-dashboard.vercel.app](https://av-admin-dashboard.vercel.app) · *In active development*

## What it does

Guests scan a QR code and start broadcasting from their phone camera over WebRTC — no app to install. An admin sees every connected camera in real time, picks up to four simultaneous feeds for the projector, and controls the visual treatment. The projector view renders those feeds fullscreen with a retro film look: black and white, film grain, VHS glitches and an old-camera HUD with timecode and event name.

The effects are applied only in the projector view — guests always stream at original quality — and the QR is never shown on the projector.

## Structure

pnpm workspaces monorepo with three applications:

| App | What it is | Stack |
|---|---|---|
| `apps/admin-dashboard` | Control panel: live camera grid, feed selection, effects, QR generation, event management and reporting | React, Vite, Drizzle ORM, Clerk, LiveKit client, Recharts, dnd-kit, ExcelJS, Zustand |
| `apps/live-engine` | Token and room service for the WebRTC layer | Express, LiveKit Server SDK |
| `apps/web-portfolio` | Public-facing site | Next.js, Framer Motion |
| `packages/shared` | Types shared across the three apps | TypeScript |

WebRTC transport runs on **LiveKit Cloud**. Authentication is handled by **Clerk**, persistence by **Drizzle ORM** over PostgreSQL.

## Running it

```bash
pnpm install
pnpm dev
```

Each app reads its own environment variables — see `.env.example` for the required keys (LiveKit credentials, Clerk keys and the database URL).

```bash
pnpm build          # build every workspace
docker compose up   # local services
```

## Status

In active development. The admin dashboard and the live engine are the most complete pieces; the public site is still being built out.
