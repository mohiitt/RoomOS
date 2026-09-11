<h1 align="center">RoomOS</h1>

<p align="center">
  <strong>Five roommates. One fridge. Zero group-chat math.</strong>
</p>

<p align="center">
  Pick your name. Enter the PIN. See what actually needs doing.
</p>

<p align="center">
  <a href="https://306.insforge.site"><img alt="Live" src="https://img.shields.io/badge/live-306.insforge.site-C45C26?style=for-the-badge" /></a>
</p>

<p align="center">
  <a href="#what-it-does">Features</a>
  ·
  <a href="#how-to-use">How to use</a>
  ·
  <a href="#stack">Stack</a>
  ·
  <a href="#run-it-locally">Run locally</a>
</p>

<p align="center">
  <img src="./public/landing-kitchen.png" alt="RoomOS kitchen" width="720" />
</p>

---

RoomOS is the phone app for **one apartment** — Mohit, Sarvesh, Atharva M, Atharva B, and Prathamesh.

It replaces the group chat, the sticky notes, and the Splitwise tab with one quiet screen:

> What do I owe?  
> What’s about to die in the fridge?  
> Whose turn is the sponge?

No accounts. A shared 4-digit PIN unlocks the apartment. That name owns every write — money included — so switching roommate always asks for the PIN again.

**Live:** [306.insforge.site](https://306.insforge.site)

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
3. Use the bottom tabs. Shopping, issues, alerts, and settings live under **More**.
4. You can browse offline. Saving anything needs a connection.

There’s a short how-to on the More tab in the app as well.

## What it does

<table>
  <tr>
    <td width="50%" valign="top">

**Home**  
Apartment vibe, stats that size to their content, and only the things that actually need a decision. Quiet days get an honest empty state plus jump tiles — not a blank strip above the nav.

**Money**  
Log a spend, split it (equal / exact / % / shares), attach a receipt, settle (including partway), and nudge someone who owes you. Recurring covers rent and internet. Splits are in cents so $10 among three people is still $10.

    </td>
    <td width="50%" valign="top">

**Food**  
Fridge, freezer, pantry. Shared vs personal. Expiring and low-stock float up. Recipes live here — send missing ingredients to shopping.

**Chores**  
Everyone’s assignment this week, mark done, swap, streaks. Weekly or monthly rotations.

    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">

**Shopping**  
The list. Manual adds, plus auto-add when food hits the minimum. Buying restocks inventory.

**Issues**  
Leaky faucet energy. Priority, assignee, comments, photos, resolve.

    </td>
    <td width="50%" valign="top">

**Alerts**  
In-app bell, plus optional lock-screen banners on this phone.

**Settings**  
Switch roommate (PIN again), lock the session, theme, push on this device.

    </td>
  </tr>
</table>

<p align="center">
  <img src="./public/cash-split.png" alt="Money" width="220" />
  &nbsp;
  <img src="./public/food-bowl.png" alt="Food" width="220" />
  &nbsp;
  <img src="./public/recipe-still.png" alt="Recipes" width="220" />
</p>

## How it works

- A signed HttpOnly cookie is apartment access. The browser talks only to same-origin `/api` routes. InsForge admin credentials stay on the server.
- Open screens subscribe to apartment change metadata so another roommate’s save triggers a refetch.
- Expense splits are calculated in **cents**.
- Chores rotate among active roommates. Completing early can award a small bonus. Swap requests are negotiated, not silent overrides.
- Issue photos and expense receipts upload through the server. The `concern-photos` bucket is private.
- Failed PIN attempts are throttled per IP.

## Stack

| Layer | Choice |
| :--- | :--- |
| App | Next.js 16, React 19 |
| UI | Tailwind 4, shadcn, Poppins |
| Hosting | InsForge frontend (Vercel underneath) → [306.insforge.site](https://306.insforge.site) |
| Backend | InsForge Postgres + Storage (admin client on the server) |
| Tests | Node’s test runner (`npm test`), TypeScript (`npm run typecheck`) |

Daily job: InsForge schedule `roomos-daily-maintenance` at 08:00 `America/Los_Angeles` POSTs `/functions/dispatch-push`. It generates recurring expenses, chores, time-based alerts, and retries pending web push.

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

Hash a PIN:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('1234').digest('hex'))"
```

Then:

```bash
npm run dev
# On a phone, HTTPS so lock-screen alerts work:
npm run dev:https

npm test
npm run typecheck
npm run build
```

Open [http://localhost:3000](http://localhost:3000).

Backups: `npx -y @insforge/cli backups create --name <label>`. Restore overwrites the live database — only with explicit confirmation.

## Project layout

```text
src/app/            screens + /api session routes
src/components/     mobile UI
src/lib/            domain logic, browser API clients, server helpers
migrations/         Postgres schema
functions/          InsForge edge functions
```

The long product plan is [`RoomOS_Full_Implementation_Plan.md`](./RoomOS_Full_Implementation_Plan.md). Day-to-day architecture is [`PROJECT.md`](./PROJECT.md).

---

<p align="center">
  <sub>Built for one apartment. Kept small on purpose.</sub>
</p>
