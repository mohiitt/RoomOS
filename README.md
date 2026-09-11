<h1 align="center">RoomOS</h1>

<p align="center">
  <strong>The apartment operating system for five roommates.</strong>
</p>

<p align="center">
  Open it. Pick who you are. See what matters.
</p>

<p align="center">
  <a href="#what-it-does">Features</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#stack">Stack</a> ·
  <a href="#run-it-locally">Run locally</a>
</p>

---

RoomOS is a **mobile-first** web app for one apartment — Mohit, Sarvesh, Atharva M, Atharva B, and Prathamesh.

It replaces the group chat, the sticky notes, and the Splitwise tab with one quiet screen:

> What do I owe?  
> What food needs attention?  
> What do I need to do?

No user accounts. A shared 4-digit PIN unlocks the apartment. Then you choose your name.

## What it does

| | | |
| :--- | :--- | :--- |
| **Home** | The live dashboard | Balances, expiring food, your chores, shopping, open issues, recent activity |
| **Money** | Splitwise, without Splitwise | Equal / exact / % / shares splits, settle-up, recurring bills |
| **Food** | Fridge and pantry | Consume, restock, expiry, low-stock, personal vs shared |
| **Shopping** | The list everyone can see | Manual adds, auto-add from low stock, purchase restocks inventory |
| **Chores** | Weekly rotation | Five chores, staggered turns, points, streaks, Sunday due dates |
| **Issues** | Apartment tickets | Priority, assignee, comments, photos, resolve / reopen |

Later phases in the plan: an AI roommate assistant.

## How it works

```text
  PIN  →  pick roommate  →  Home
                               │
           ┌─────────┬─────────┼─────────┬─────────┐
           │         │         │         │         │
         Money     Food     Chores   Shopping   Issues
```

- A signed HttpOnly cookie is the source of apartment access. The browser talks only to same-origin `/api` routes; InsForge admin credentials stay on the server.
- Open screens subscribe to apartment change *metadata* so another roommate's save triggers a refetch.
- In-app notifications cover new expenses, low or expiring food, chores, and issues. The bell on Home shows unread count.
- Install RoomOS on the phone home screen, then allow phone alerts in Settings. iPhone needs Safari → Share → Add to Home Screen, then open from that icon.
- Expense splits are calculated in **cents** so $10 split three ways always equals $10.
- Chores rotate weekly among active roommates. Completing early can award a small bonus.
- Issue photos upload through the server. The `concern-photos` bucket is private.

## Stack

| Layer | Choice |
| :--- | :--- |
| App | Next.js 16, React 19 |
| UI | Tailwind 4, shadcn, Poppins |
| Backend | InsForge Postgres + Storage (admin client on the server) |
| Tests | Node's built-in test runner (`npm test`), TypeScript (`npm run typecheck`) |

## Run it locally

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | What it is |
| :--- | :--- |
| `NEXT_PUBLIC_INSFORGE_URL` | Your InsForge project URL |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Anon key from the InsForge CLI |
| `INSFORGE_URL` / `INSFORGE_API_KEY` | Server-side project credentials |
| `ROOMOS_PIN_HASH` | SHA-256 hex of the 4-digit apartment PIN |
| `ROOMOS_SESSION_SECRET` | A long random string for the access cookie |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push keys (`npx web-push generate-vapid-keys`) |
| `PUSH_DISPATCH_SECRET` | Shared secret for the maintenance job / push dispatcher |

Node 20.9+ and npm 10+ are required.

The daily InsForge schedule (`roomos-daily-maintenance`) POSTs `/functions/dispatch-push` at 08:00 America/Los_Angeles (15:00 UTC during PDT). It generates recurring expenses, chores, time-based alerts, and retries pending web push. Add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` as InsForge secrets so the job can send lock-screen alerts; without them the job still generates data and skips push.

Backups: `npx -y @insforge/cli backups create --name <label>`. Restore overwrites the live database — only with explicit confirmation.

Issue photos are private. The app serves them through `/api/issues/:id/photos/:photoId` after PIN unlock.

Hash a PIN:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('1234').digest('hex'))"
```

Apply migrations, seed the five roommates in InsForge, then:

```bash
npm run dev
# On a phone, use HTTPS so lock-screen alerts work:
npm run dev:https
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test    # money, chores, issues, dashboard
npm run build
```

## Project layout

```text
src/app/            screens (home, money, food, chores, issues…)
src/components/     mobile UI
src/app/api/        signed-session feature APIs
src/lib/server/     database access (admin client)
src/lib/            domain logic + browser API clients
migrations/         Postgres schema
```

The full product plan is in [`RoomOS_Full_Implementation_Plan.md`](./RoomOS_Full_Implementation_Plan.md).

---

<p align="center">
  <sub>Built for one apartment. Kept small on purpose.</sub>
</p>
