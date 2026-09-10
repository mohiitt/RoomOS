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

RoomOS is a **mobile-first** web app for one apartment — Mohit, Urmi, Jainil, Rahul, and Aditi.

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

Later phases in the plan: notifications, PWA, and an AI roommate assistant.

## How it works

```text
  PIN  →  pick roommate  →  Home
                               │
           ┌─────────┬─────────┼─────────┬─────────┐
           │         │         │         │         │
         Money     Food     Chores   Shopping   Issues
```

- Identity lives in the browser after PIN. There are no logins, emails, or passwords.
- Postgres on [InsForge](https://insforge.app) is the source of truth. Migrations live in `migrations/`.
- Open screens subscribe to apartment changes so another roommate's save shows up without a refresh.
- Expense splits are calculated in **cents** so $10 split three ways always equals $10.
- Chores rotate weekly among active roommates. Completing early can award a small bonus.
- Issue photos go in a public `concern-photos` bucket so everyone in the apartment can see them.

## Stack

| Layer | Choice |
| :--- | :--- |
| App | Next.js 16, React 19 |
| UI | Tailwind 4, shadcn, Fraunces + Nunito Sans |
| Backend | InsForge Postgres + Storage |
| Tests | Node's built-in test runner |

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

Hash a PIN:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('1234').digest('hex'))"
```

Apply migrations, seed the five roommates in InsForge, then:

```bash
npm run dev
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
src/lib/            domain logic + InsForge queries
migrations/         Postgres schema
```

The full product plan is in [`RoomOS_Full_Implementation_Plan.md`](./RoomOS_Full_Implementation_Plan.md).

---

<p align="center">
  <sub>Built for one apartment. Kept small on purpose.</sub>
</p>
