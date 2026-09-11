# RoomOS

RoomOS is a **mobile-first web app for one apartment and five roommates**: Mohit, Sarvesh, Atharva M, Atharva B, and Prathamesh.

It replaces WhatsApp threads, sticky notes, and a Splitwise tab with one phone screen:

- What do I owe?
- What food needs attention?
- What do I need to do?

There are **no user accounts**. A shared 4-digit PIN unlocks the apartment. Then you pick your name. Switching names is an honor-system feature of that model: the cookie is bound to whoever is selected, and writes are recorded as that roommate.

An AI assistant is **out of scope**. Recipes stay. The unused `/assistant` route is a leftover stub.

---

## Who it is for

One household. Five fixed roommates. Daily use on iPhone and Android, installed to the home screen.

It is not a multi-tenant product, not a signup flow, and not a generic “coliving platform.”

---

## How you use it

```text
Pick your name  →  enter the shared PIN  →  Home
                                              │
                    ┌────────────┬────────────┼────────────┬────────────┐
                    │            │            │            │            │
                  Money        Food        Chores        More
                                                          │
                                          Shopping · Issues · Alerts · Activity · Settings
```

Bottom tabs: **Home**, **Money**, **Food**, **Chores**, **More**.

**Food** has two inner tabs: Fridge and Recipes. Shopping, issues, notifications, activity, and settings live under More so the tab bar stays five items.

---

## Features

### Unlock and identity

- Name-first, then PIN.
- Signed HttpOnly cookie (`roomos_access`) is the source of access, not `localStorage`.
- Failed PIN attempts are throttled in the database (per IP).
- Switch roommate without re-entering the PIN (honor system).
- Lock this phone: clears the session cookie and returns to the PIN screen.
- Dark / light appearance (terracotta night palette). Toggle on Home and in Settings.

### Home

The dashboard answers “what matters right now”:

- Your money net (owe / owed)
- Food that is low or expiring
- Shopping count
- Your chores this cycle
- Open issues assigned to you
- Latest expense
- Needs-attention list
- Recent apartment activity

Failed widgets show as unavailable instead of fake zeros. Stale network responses cannot overwrite a newer load.

### Money

Splitwise-style ledger for the five people.

- Add / edit / delete expenses (delete is soft-delete so history stays consistent)
- Split modes: **equal**, **exact amounts**, **percentage**, **shares**
- Splits are computed in **cents** so $10 among three people always sums to $10
- Categories and dates
- Authoritative balances from a full-ledger database function (`apartment_balances()`), not a capped list
- Simplified “you owe / you are owed” pairs
- Settle up: record a payment between two roommates
- Recurring bills (weekly or monthly): rent, internet, utilities
- Recurring posting is idempotent (one expense per rule per date)

### Food (inventory)

Fridge, freezer, pantry, kitchen, other.

- Add items with quantity, unit, category, expiry, notes
- Shared vs personal (personal items have an owner)
- Consume, restock, adjust, discard
- Quantity history (transactions)
- Low-stock threshold and auto-add to shopping
- Filters: all, shared, mine, fridge, freezer, pantry, low, expiring
- Search by name

### Recipes

Kept as a real feature, not as an AI demo.

- Name, ingredients (quantity + unit), how to cook
- Lives under Food → Recipes
- Create and delete

### Shopping

The list everyone can see.

- Manual add
- Auto-add when inventory hits the minimum
- Purchase restocks the linked inventory item
- Remove / reactivate

### Chores

Weekly rotation among the people on each chore. Monthly frequency exists in the schema and generator.

- Templates with a rotation order
- One current assignment per template per due date
- Sunday due dates in `America/Los_Angeles` for weekly chores
- Complete as the assignee, or explicitly complete for someone else (audited)
- Early completion can award a small points bonus
- Missed assignments are marked when the due date has passed
- Points and streaks
- Seed the default apartment chore set

### Issues (concerns)

Apartment tickets: leaky faucet, broken light, weird smell.

- Priority: low, medium, high, urgent
- Status: open, assigned, in progress, resolved (validated transitions)
- Assignee, comments
- Photos (private bucket, served through the app after PIN unlock)
- Append-only event history (`concern_events`)
- Reopen a resolved issue

### Notifications and phone alerts

In-app bell (unread count, cap 9+) plus optional lock-screen Web Push.

Alerts for:

- New expenses
- Food expiring
- Low stock (when it first crosses the minimum)
- Chore due / assigned
- High/urgent issues created or assigned

Time-based alerts use a dedupe key so marking one read does not immediately recreate and re-push it. Push delivery uses claim / lease / ack with retries. Stale subscriptions (404/410) are dropped. Switching roommate rebinds this phone’s subscription to the new person.

### Activity

A running log of apartment changes (expenses, settlements, inventory, shopping, chores, issues). Not a 12-row fake “full history.”

### Offline and PWA

- Add to Home Screen (iPhone: Safari → Share → Add to Home Screen)
- Offline shell: you can look around; **changes need a connection**. Mutations are not queued.
- Forms fail clearly when offline instead of pretending they will catch up

### Daily maintenance

InsForge schedule `roomos-daily-maintenance` (08:00 America/Los_Angeles / 15:00 UTC during PDT) POSTs the `dispatch-push` function:

1. Generate due recurring expenses
2. Generate due chore assignments
3. Generate time-based notifications
4. Claim and send pending Web Push (skipped if VAPID secrets are not set on InsForge)

---

## Technologies

### App

| Piece | Choice |
| :--- | :--- |
| Framework | Next.js 16.3 (App Router, Turbopack in `next dev`) |
| UI | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4, shadcn / Base UI, Poppins |
| Icons | Lucide |
| Toasts | Sonner |
| Theme | next-themes (light / dark) |
| Validation | Zod on API inputs |
| Runtime | Node 20.9+ and npm 10+ |

### Backend (InsForge)

There is **no separate Express server**. InsForge is the backend.

| Piece | Role |
| :--- | :--- |
| PostgreSQL | All apartment data, RPCs, RLS lockdown |
| Storage | Private `concern-photos` bucket |
| Realtime | Channel `roomos:apartment`, event `roomos_changed` (metadata only; clients refetch) |
| Edge functions | `dispatch-push` (Deno, `@insforge/sdk` admin client, `web-push`) |
| Schedules | Daily cron hitting that function with `Bearer ${{secrets.API_KEY}}` |
| SDK | `@insforge/sdk` 1.5 |

The **browser never does database CRUD**. After PIN unlock it calls same-origin `/api/*` with the session cookie. The server uses `getAdminInsforge()` (`server-only` + `INSFORGE_API_KEY`). The public anon key is only for realtime subscribe.

Anonymous table, RPC, and storage access is revoked. Advisor “no RLS policy” findings on app tables are expected: anon has no policies on purpose.

### Auth and security

- Shared PIN stored as SHA-256 hex (`ROOMOS_PIN_HASH`), compared timing-safe
- Session: `base64url(JSON).hmac`, 30 days, HttpOnly, SameSite=lax, Secure in production
- Mutations check same-origin (`Origin` / `Sec-Fetch-Site`)
- Writes bind the actor to `session.rid` (client-supplied `createdBy` is ignored)
- CSP, `X-Frame-Options: DENY`, Permissions-Policy, HSTS in production
- Private photos: upload/download through authenticated routes; blob deleted if metadata insert fails

### Push

- Web Push + VAPID (`web-push`)
- Next.js can dispatch on in-app actions
- InsForge function dispatches on the daily schedule

### Time

Apartment calendar is **`America/Los_Angeles`** (`apartment_today()` in SQL, `todayISO()` in the app) so chore due dates, recurrence, and expiry alerts match the household.

### Tests and quality

- Node’s built-in test runner (`npm test`): money splits, balances, chores rotation, issues, dashboard copy, realtime tables, recipes, PIN session, cookies, origin checks, pagination
- `npm run typecheck` (`tsc --noEmit`)
- `npm run lint` (ESLint 9 + eslint-config-next)
- GitHub Actions workflow exists locally at `.github/workflows/ci.yml` (typecheck, test, lint, build)

---

## Architecture

```text
Phone (PWA)
  │  pick name + PIN
  ▼
Next.js  (/api/* + screens)
  │  signed cookie
  │  Zod + origin check
  ▼
InsForge admin client
  │
  ├─ PostgreSQL  (tables + transactional RPCs)
  ├─ Storage     (issue photos)
  ├─ Realtime    (invalidate → refetch)
  └─ Function    (daily generate + push)
```

### Project layout

```text
src/app/              screens and API routes
src/app/api/          session-protected feature APIs
src/components/       mobile UI
src/contexts/         current roommate + PIN session
src/lib/server/       database access (admin client)
src/lib/              domain logic + browser fetch wrappers
src/hooks/            realtime subscriptions
functions/            InsForge edge function source
migrations/           Postgres schema (apply with InsForge CLI)
public/               PWA shell, icons, images
```

Browser query modules such as `src/lib/expenses/queries.ts` are **fetch wrappers** to `/api/...`. They do not talk to InsForge.

### Important APIs (shape)

| Area | Examples |
| :--- | :--- |
| Auth | `POST /api/auth/pin`, `GET /api/auth/session`, `GET /api/auth/roommates`, `POST /api/auth/roommate`, `POST /api/auth/lock` |
| Home | `GET /api/dashboard` |
| Money | `/api/money/balances`, `/api/money/expenses`, `/api/money/settlements`, `/api/money/recurring` |
| Food | `/api/inventory`, `/api/inventory/:id/consume`, `/api/inventory/:id/add` |
| Shopping | `/api/shopping`, purchase / remove / reactivate |
| Chores | `/api/chores`, assignments complete, generate |
| Issues | `/api/issues`, comments, photos |
| Recipes | `/api/recipes` |
| Alerts | `/api/notifications`, `/api/push/subscribe`, `/api/push/dispatch` |
| Health | `GET /api/health` |

---

## Data (InsForge Postgres)

Application tables include:

- `roommates`
- `inventory_items`, `inventory_transactions`
- `shopping_items`
- `expenses`, `expense_splits`, `settlements`, `recurring_expenses`
- `chore_templates`, `chore_rotations`, `chore_assignments`
- `concerns`, `concern_comments`, `concern_attachments`, `concern_events`
- `recipes`, `recipe_ingredients`
- `notifications`, `push_subscriptions`
- `pin_attempts`

Multi-step writes go through SQL functions so they succeed or roll back together, including:

- `save_expense`, `create_settlement`, `generate_due_recurring_expenses`
- `create_inventory_item`, `adjust_inventory`
- `create_chore_with_rotation`, `generate_due_chore_assignments`, `complete_chore_assignment`
- `save_recipe`
- `create_concern`, `update_concern`, `add_concern_comment`
- `apartment_balances`, `apartment_today`
- `claim_push_notifications`, `ack_push_notification`, `generate_time_notifications`

---

## Environment

Copy `.env.example` to `.env.local`. Do not commit `.env.local`.

| Variable | Where | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_INSFORGE_URL` | Browser | Realtime only |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Browser | Realtime subscribe |
| `INSFORGE_URL` | Server | Admin API base |
| `INSFORGE_API_KEY` | Server | Admin CRUD |
| `ROOMOS_PIN_HASH` | Server | SHA-256 of the 4-digit PIN |
| `ROOMOS_SESSION_SECRET` | Server | Cookie HMAC |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Browser + server | Web Push |
| `VAPID_PRIVATE_KEY` | Server / InsForge secrets | Web Push |
| `VAPID_MAILTO` | Server | VAPID contact |
| `PUSH_DISPATCH_SECRET` | Server | Optional bearer for the dispatcher |

Hash a PIN:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('1234').digest('hex'))"
```

---

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill values
npm run dev                  # http://localhost:3000
npm run dev:https            # needed on iPhone for lock-screen alerts
```

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Migrations:

```bash
npx -y @insforge/cli db migrations up --all
```

Backups: `npx -y @insforge/cli backups create --name <label>`. Restore overwrites the live database — only with explicit confirmation.

---

## What is intentionally not in the product

- User accounts, email, OAuth
- Multi-apartment / multi-tenant
- An AI roommate assistant
- Offline mutation queue (the offline banner tells the truth)
- A heavy observability stack

---

## Related docs

- [`README.md`](../README.md) — short product intro and run steps
- [`RoomOS_Full_Implementation_Plan.md`](./RoomOS_Full_Implementation_Plan.md) — original long product plan (includes a deferred assistant; that part is not being built)
- [`.env.example`](../.env.example) — required environment variables
