<h1 align="center">RoomOS</h1>

<p align="center"><strong>Five roommates. One fridge. Zero group-chat math.</strong></p>

<p align="center">Pick your name. Enter the PIN. See what actually needs doing.</p>

<p align="center">
  <a href="#how-to-use">How to use</a>
  ·
  <a href="#what-it-does">Features</a>
  ·
  <a href="#stack">Stack</a>
  ·
  <a href="#run-it-locally">Run locally</a>
</p>

<p align="center">
  <img src="./public/landing-kitchen.png" alt="RoomOS" width="560" />
</p>

---

RoomOS is the phone app for **one apartment** — Mohit, Sarvesh, Atharva M, Atharva B, and Prathamesh.

It replaces the group chat, the sticky notes, and the Splitwise tab:

> What do I owe?  
> What’s about to die in the fridge?  
> Whose turn is the sponge?

No accounts. A shared 4-digit PIN unlocks the apartment. That name owns every write — money included — so switching roommate always asks for the PIN again.

## How to use

```text
Pick your name  →  shared PIN  →  Home
                                    │
              ┌──────────┬──────────┼──────────┬──────────┐
              │          │          │          │          │
            Money      Food      Chores      More
                         │                     │
                   Fridge · Recipes     Shopping · Issues
                                        Alerts · Activity · Settings
```

1. Add it to your Home Screen (Safari → Share → Add to Home Screen on iPhone).
2. Tap **your** name. Enter the PIN from the fridge.
3. Bottom tabs are Home, Money, Food, Chores, and More. Shopping, issues, alerts, and settings live under More.
4. You can browse offline. Saving anything needs a connection.

The More tab also has a short in-app how-to.

## What it does

| | |
| :--- | :--- |
| **Home** | Vibe, compact stats, and only the things that need a decision. Quiet days get jump tiles instead of a blank strip. |
| **Money** | Split a spend (equal / exact / % / shares), attach a receipt, settle (including partway), nudge, recurring rent and internet. Cents, so $10 among three is still $10. |
| **Food** | Fridge, freezer, pantry. Shared vs personal. Expiring and low-stock float up. Recipes can send missing ingredients to shopping. |
| **Chores** | Everyone’s assignment this week. Mark done, swap, streaks. Weekly or monthly. |
| **Shopping** | The list. Manual adds, plus auto-add when food hits the minimum. Buying restocks inventory. |
| **Issues** | Leaky faucet energy. Priority, assignee, comments, photos, resolve. |
| **Alerts** | In-app bell, plus optional lock-screen banners on this phone. |
| **Settings** | Switch roommate (PIN again), lock the session, theme, push on this device. |

## How it works

- A signed HttpOnly cookie is apartment access. The browser talks only to same-origin `/api` routes. Admin credentials stay on the server.
- Open screens subscribe to apartment change metadata so another roommate’s save triggers a refetch.
- Chores rotate among active roommates. Completing early can award a small bonus. Swaps are negotiated, not silent overrides.
- Issue photos and expense receipts go through the server. The storage bucket is private.
- Failed PIN attempts are throttled per IP.

## Stack

| Layer | Choice |
| :--- | :--- |
| App | Next.js 16, React 19 |
| UI | Tailwind 4, shadcn, Poppins |
| Hosting | InsForge frontend hosting |
| Backend | InsForge Postgres + Storage |
| Tests | `npm test`, `npm run typecheck` |

A daily InsForge schedule (`roomos-daily-maintenance`, 08:00 `America/Los_Angeles`) generates recurring expenses, chores, time-based alerts, and retries web push.

## Run it locally

Node **20.9+** and npm **10+**.

```bash
npm install
cp .env.example .env.local
```

| Variable | What it is |
| :--- | :--- |
| `NEXT_PUBLIC_INSFORGE_URL` | InsForge project URL |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Anon key from the InsForge CLI |
| `INSFORGE_URL` / `INSFORGE_API_KEY` | Server-side project credentials |
| `ROOMOS_PIN_HASH` | SHA-256 hex of the 4-digit apartment PIN |
| `ROOMOS_SESSION_SECRET` | Long random string for the access cookie |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push (`npx web-push generate-vapid-keys`) |
| `PUSH_DISPATCH_SECRET` | Optional bearer for the push dispatcher |

```bash
node -e "console.log(require('crypto').createHash('sha256').update('1234').digest('hex'))"

npm run dev          # http://localhost:3000
npm run dev:https    # phones / lock-screen alerts
npm test
npm run typecheck
npm run build
```

Backups: `npx -y @insforge/cli backups create --name <label>`. Restore overwrites the live database — only with explicit confirmation.

## Layout

```text
src/app/         screens and /api routes
src/components/  mobile UI
src/lib/         domain logic and server helpers
migrations/      Postgres schema
functions/       InsForge edge functions
docs/            architecture, plan, leftover notes
e2e/             Playwright
scripts/         one-off tooling
public/          PWA icons and images
```

---

<p align="center"><sub>Built for one apartment. Kept small on purpose.</sub></p>
