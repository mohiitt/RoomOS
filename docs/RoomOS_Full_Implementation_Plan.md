# RoomOS — Full Implementation Plan

## 1. Project Overview

**RoomOS** is a mobile-first web app for a single apartment shared by five roommates.

It combines:

- Splitwise-style expense tracking
- Food and household inventory management
- Shopping list automation
- Chore rotation and tracking
- Apartment concern / maintenance issue tracking
- Realtime updates
- Notifications
- An AI roommate assistant

The application is intended only for one apartment and five fixed roommates.

The goal is simplicity: roommates should be able to open the app, identify themselves, and immediately see what matters without creating accounts or navigating a complicated setup flow.

---

# 2. Product Goal

The first usable release should allow all five roommates to:

1. See how much money they owe or are owed
2. Manage shared and personal food inventory
3. See food that is low or expiring
4. Maintain a shared shopping list
5. See and complete chores
6. Report and track apartment concerns
7. Receive realtime updates when another roommate makes a change

The app should replace several things currently handled informally through memory, WhatsApp, notes, or Splitwise.

---

# 3. Success Criteria

The MVP is successful when all five roommates can use RoomOS on their phones and independently:

- Add an expense
- Split it correctly
- See their balance
- Settle a debt
- Add inventory
- Consume inventory
- See low-stock food
- See food nearing expiry
- Add or auto-add something to the shopping list
- View their current chores
- Mark chores complete
- Report an apartment issue
- Comment on and resolve an issue
- See changes made by another roommate without refreshing

The AI assistant is a later MVP extension and should not block the first usable version.

---

# 4. Scope

## In Scope

### Money
- Equal split
- Exact/custom split
- Percentage split
- Shares-based split
- Expense categories
- Recurring expenses
- Settle-up transactions
- Expense history
- Per-user balances
- Simplified who-owes-whom view

### Inventory
- Item name
- Quantity
- Unit
- Expiry date
- Category
- Storage location
- Personal/shared ownership
- Item owner
- Minimum stock threshold
- Manual quantity updates
- Consume/add stock actions
- Inventory history
- Low-stock detection
- Expiring-soon detection

### Shopping
- Shared shopping list
- Manual additions
- Auto-add from low inventory
- Mark purchased
- Update inventory after purchase
- Optional expense creation after purchase

### Chores
- Recurring chores
- Automatic weekly rotation
- Current assignee
- Due dates
- Completion history
- Reminders
- Points
- Streaks

### Apartment Concerns
- Title
- Description
- Priority
- Status
- Assignee
- Reporter
- Photos
- Comments
- Resolution tracking

### Realtime
- Inventory updates
- Expense updates
- Shopping updates
- Chore updates
- Concern updates
- Comments

### Notifications
- Expense added
- Payment due / balance change
- Food expiring
- Low stock
- Chore due
- New concern
- Concern assigned
- Concern resolved

### AI Assistant
- Who owes me money?
- What do I owe?
- What food is expiring?
- What is low in stock?
- What should we buy?
- What are my chores?
- Whose turn is it?
- What apartment issues are open?

---

# 5. Out of Scope for Initial Release

Do not build these initially:

- Public registration
- Multiple apartments
- Native iOS app
- Native Android app
- Payment processing
- Venmo / Zelle integration
- Receipt OCR
- Barcode scanning
- Computer vision inventory detection
- Landlord portal
- Complex permissions
- Advanced analytics
- Budget forecasting
- Social features
- Public sharing
- Multi-household support
- Full accounting ledger
- AI-generated balance calculations

---

# 6. Recommended Technology Stack

## Frontend

- **Next.js**
- **TypeScript**
- **React**
- **Tailwind CSS**
- **shadcn/ui**

Why:

- Strong TypeScript support
- Good mobile web performance
- Easy Vercel deployment
- Excellent component ecosystem
- Works well with Supabase
- Easy to extend into a PWA
- Good fit for Codex-assisted development

---

## Backend

Use **Supabase**.

Supabase provides:

- PostgreSQL
- Realtime subscriptions
- Storage
- Row-level security
- Server-side functions
- Database triggers
- Cron support through scheduled functions / external scheduler if needed

---

## Hosting

Use:

- **Vercel** for Next.js
- **Supabase Free Tier** for database/storage/realtime

Target:

**$0/month during development and initial apartment usage**

---

## AI

Use an OpenAI API model only after core data features work.

The AI assistant should call backend functions and receive structured data.

It should not directly calculate balances or modify important data without validated actions.

---

# 7. Application Architecture

Use a layered architecture.

```text
UI
↓
Feature Services
↓
Application Logic
↓
Supabase Client / API
↓
PostgreSQL
```

Avoid embedding business logic inside React components.

For example:

Bad:

```text
ExpensePage.tsx
  calculates debts
  calculates balance
  formats split
  updates DB
```

Better:

```text
ExpensePage.tsx
  ↓
expenseService.ts
  ↓
calculateBalances.ts
  ↓
Supabase
```

---

# 8. Authentication / User Identification

Traditional authentication is unnecessary because:

- Only five users exist
- Everyone belongs to one apartment
- Low security risk
- Simplicity matters more than account management

Recommended flow:

```text
Open RoomOS
    ↓
Enter apartment PIN
    ↓
Choose roommate
    ↓
Save roommate ID in browser
    ↓
Dashboard
```

Store:

```text
roommate_id
```

in localStorage.

Optionally store:

```text
apartment_access_verified = true
```

for a limited duration.

---

## Security Note

This is appropriate for a private apartment tool, but it is not strong authentication.

If RoomOS is later made public, replace this with Supabase Auth.

---

# 9. Main Navigation

Mobile-first bottom navigation:

```text
Home
Money
Food
Chores
More
```

`More` opens:

- Shopping
- Issues
- Notifications
- Assistant
- Activity
- Settings

Optional floating action button:

```text
+
```

Tap:

```text
Add Expense
Add Inventory
Add Shopping Item
Add Chore
Report Concern
```

---

# 10. Dashboard

The dashboard should prioritize:

1. Money owed
2. Food expiring
3. Low-stock items
4. Chores

Suggested layout:

```text
Good morning, Mohit

BALANCE
You owe $42.50

FOOD
2 items expiring
3 low-stock items

CHORES
2 due

SHOPPING
6 items needed

APARTMENT
1 open issue

RECENT ACTIVITY
...
```

---

# 11. Database Design

## 11.1 roommates

```sql
roommates
---------
id uuid primary key
name text not null
avatar_url text
is_active boolean default true
created_at timestamptz default now()
```

Seed exactly five roommates.

---

# 12. Expense System

Expense functionality should approximate Splitwise behavior.

---

## 12.1 expenses

```sql
expenses
--------
id uuid primary key
title text not null
description text
amount numeric(12,2) not null
currency text default 'USD'
paid_by uuid references roommates(id)
category text
split_type text
expense_date date
is_recurring boolean default false
recurring_rule_id uuid null
created_by uuid references roommates(id)
created_at timestamptz default now()
updated_at timestamptz default now()
```

Possible split types:

```text
equal
exact
percentage
shares
```

---

## 12.2 expense_splits

```sql
expense_splits
--------------
id uuid primary key
expense_id uuid references expenses(id) on delete cascade
roommate_id uuid references roommates(id)
owed_amount numeric(12,2)
percentage numeric(6,3)
shares numeric(10,2)
created_at timestamptz default now()
```

Always store the final calculated `owed_amount`.

This prevents later recalculation inconsistencies.

---

## 12.3 settlements

```sql
settlements
-----------
id uuid primary key
payer_id uuid references roommates(id)
receiver_id uuid references roommates(id)
amount numeric(12,2)
settled_at timestamptz
note text
created_by uuid references roommates(id)
created_at timestamptz default now()
```

---

## 12.4 recurring_expenses

```sql
recurring_expenses
------------------
id uuid primary key
title text
amount numeric(12,2)
paid_by uuid references roommates(id)
category text
split_type text
frequency text
next_run_at date
is_active boolean default true
created_at timestamptz default now()
```

Possible frequencies:

```text
weekly
monthly
custom
```

---

# 13. Expense Calculation Logic

For every expense:

```text
payer credit = total amount - payer's own share
```

Each participant:

```text
debt = owed amount - amount personally paid
```

The system should derive net balances from:

```text
expenses
+ expense_splits
+ settlements
```

Do not store a mutable "current balance" as the authoritative source.

Calculate balances from ledger records.

---

# 14. Debt Simplification

Example raw debts:

```text
A owes B $20
B owes C $15
```

Simplified:

```text
A owes B $5
A owes C $15
```

Implement simplification as a separate service.

Suggested location:

```text
lib/expenses/simplifyDebts.ts
```

This should be heavily unit tested.

---

# 15. Expense UI

Money page:

```text
Your balance

You owe       $42.50
You are owed  $18.00
Net          -$24.50
```

Below:

```text
You owe:
Urmi      $20
Jainil    $22.50
```

Recent expenses:

```text
Costco groceries
$86
Paid by Mohit
You owe $17.20
```

---

# 16. Add Expense Flow

```text
Add Expense
    ↓
Title
Amount
Date
Category
Paid By
Participants
    ↓
Choose Split
    ↓
Equal / Exact / % / Shares
    ↓
Validate total
    ↓
Save Expense
    ↓
Generate expense_splits
    ↓
Realtime update
    ↓
Notify participants
```

---

# 17. Inventory System

Inventory is the highest-priority module.

---

## 17.1 inventory_items

```sql
inventory_items
---------------
id uuid primary key
name text not null
quantity numeric(12,3) not null
unit text not null
category text
storage_location text
ownership_type text
owner_id uuid references roommates(id)
expiry_date date
minimum_quantity numeric(12,3)
auto_add_to_shopping boolean default true
notes text
created_by uuid references roommates(id)
created_at timestamptz default now()
updated_at timestamptz default now()
```

Ownership types:

```text
shared
personal
```

Storage locations:

```text
fridge
freezer
pantry
kitchen
other
```

Suggested categories:

```text
vegetables
fruits
dairy
meat
frozen
snacks
grains
spices
beverages
household
other
```

---

# 18. Inventory Transactions

Never update quantity without recording the change.

---

## 18.1 inventory_transactions

```sql
inventory_transactions
----------------------
id uuid primary key
inventory_item_id uuid references inventory_items(id) on delete cascade
roommate_id uuid references roommates(id)
transaction_type text
quantity_change numeric(12,3)
quantity_before numeric(12,3)
quantity_after numeric(12,3)
note text
created_at timestamptz default now()
```

Transaction types:

```text
consume
add
adjust
purchase
discard
expired
```

---

# 19. Inventory Actions

Item page:

```text
Eggs

12 eggs

Shared
Fridge
Expires Sep 20

[- Consume]
[+ Add Stock]

Minimum: 4
```

Consume flow:

```text
Consume
↓
Amount
↓
User
↓
Create inventory transaction
↓
Update quantity
↓
Check low-stock threshold
↓
Possibly add shopping item
```

---

# 20. Expiry Logic

Recommended rules:

```text
expired:
expiry_date < today

critical:
expiry_date <= today + 1 day

expiring soon:
expiry_date <= today + 3 days

normal:
expiry_date > today + 3 days
```

For pantry goods with long expiry, users can leave expiry blank.

---

# 21. Low-Stock Logic

An item is low-stock when:

```text
quantity <= minimum_quantity
```

If:

```text
auto_add_to_shopping = true
```

then create or reactivate the related shopping item.

Prevent duplicates.

---

# 22. Shopping List

## 22.1 shopping_items

```sql
shopping_items
--------------
id uuid primary key
name text not null
inventory_item_id uuid references inventory_items(id)
requested_quantity numeric(12,3)
unit text
reason text
status text
added_by uuid references roommates(id)
purchased_by uuid references roommates(id)
created_at timestamptz default now()
purchased_at timestamptz
```

Possible reasons:

```text
manual
low_stock
expired
planned
```

Statuses:

```text
needed
purchased
removed
```

---

# 23. Shopping Workflow

```text
Inventory becomes low
↓
Shopping item created
↓
Roommate sees item
↓
Marks item purchased
↓
Enters quantity purchased
↓
Inventory stock increases
↓
Shopping item marked purchased
```

Optional prompt:

```text
Create an expense for this purchase?
```

Implement expense connection only after shopping and expenses are independently stable.

---

# 24. Chore System

---

## 24.1 chore_templates

```sql
chore_templates
---------------
id uuid primary key
name text not null
description text
frequency text
points integer default 10
is_active boolean default true
created_by uuid references roommates(id)
created_at timestamptz default now()
```

Example:

```text
Take trash out
Clean kitchen
Vacuum
Clean bathroom
Mop floor
```

---

## 24.2 chore_rotations

```sql
chore_rotations
---------------
id uuid primary key
chore_template_id uuid references chore_templates(id)
roommate_id uuid references roommates(id)
rotation_position integer
```

---

## 24.3 chore_assignments

```sql
chore_assignments
-----------------
id uuid primary key
chore_template_id uuid references chore_templates(id)
assigned_to uuid references roommates(id)
due_date date
status text
completed_at timestamptz
completed_by uuid references roommates(id)
points_awarded integer
created_at timestamptz default now()
```

Statuses:

```text
pending
completed
missed
skipped
```

---

# 25. Chore Rotation Logic

Every week:

```text
current assignee
↓
find next rotation_position
↓
create next assignment
↓
set due date
↓
notify roommate
```

Example:

```text
Week 1 Mohit
Week 2 Urmi
Week 3 Jainil
Week 4 Rahul
Week 5 Roommate 5
Week 6 Mohit
```

Do not overwrite previous assignments.

History must remain immutable.

---

# 26. Chore Points

Keep points simple.

Recommended:

```text
Completed chore       +10
Completed early       +2 optional
Missed                 0
```

Do not introduce penalties initially.

---

# 27. Chore Streak

A streak is the number of consecutive assigned chore cycles completed successfully.

Calculate from assignment history rather than storing an authoritative streak field.

---

# 28. Apartment Concerns

Treat concerns similarly to lightweight issue tickets.

---

## 28.1 concerns

```sql
concerns
--------
id uuid primary key
title text not null
description text
priority text
status text
reported_by uuid references roommates(id)
assigned_to uuid references roommates(id)
created_at timestamptz default now()
updated_at timestamptz default now()
resolved_at timestamptz
```

Priorities:

```text
low
medium
high
urgent
```

Statuses:

```text
open
assigned
in_progress
resolved
```

---

## 28.2 concern_comments

```sql
concern_comments
----------------
id uuid primary key
concern_id uuid references concerns(id) on delete cascade
roommate_id uuid references roommates(id)
comment text
created_at timestamptz default now()
```

---

## 28.3 concern_attachments

```sql
concern_attachments
-------------------
id uuid primary key
concern_id uuid references concerns(id) on delete cascade
storage_path text
uploaded_by uuid references roommates(id)
created_at timestamptz default now()
```

Images live in Supabase Storage.

---

# 29. Notification System

---

## 29.1 notifications

```sql
notifications
-------------
id uuid primary key
roommate_id uuid references roommates(id)
type text
title text
message text
entity_type text
entity_id uuid
is_read boolean default false
created_at timestamptz default now()
```

Notification types:

```text
expense_added
balance_changed
settlement_added
inventory_low
inventory_expiring
chore_due
chore_assigned
concern_created
concern_assigned
concern_resolved
shopping_added
```

---

# 30. In-App Notifications First

Start with an in-app notification center.

Do not begin with browser push notifications.

Flow:

```text
event
↓
database action
↓
create notification
↓
realtime notification subscription
↓
bell counter updates
```

---

# 31. Push Notifications Later

Once RoomOS becomes a PWA, add browser push notifications for:

- Chore due
- Food expires tomorrow
- New expense
- New urgent apartment issue

Do not send excessive notifications.

---

# 32. Activity Feed

---

## 32.1 activity_log

```sql
activity_log
------------
id uuid primary key
roommate_id uuid references roommates(id)
action_type text
entity_type text
entity_id uuid
summary text
created_at timestamptz default now()
```

Examples:

```text
Mohit added Milk
Urmi completed Kitchen Cleaning
Jainil added a $42 Costco expense
Rahul reported Sink leaking
```

The dashboard should show the most recent 10–20 events.

---

# 33. Realtime Architecture

Use Supabase Realtime subscriptions.

Subscribe to:

```text
expenses
expense_splits
settlements
inventory_items
inventory_transactions
shopping_items
chore_assignments
concerns
concern_comments
notifications
```

Avoid subscribing globally from every component.

Use feature-level hooks.

Example:

```text
hooks/useRealtimeInventory.ts
hooks/useRealtimeExpenses.ts
hooks/useRealtimeChores.ts
```

---

# 34. AI Assistant Architecture

AI is a read-oriented interface over RoomOS data.

Do not send the full raw database to the model.

Provide structured tools.

Suggested tools:

```text
get_user_balance
get_all_balances
get_recent_expenses
get_inventory
get_expiring_items
get_low_stock_items
get_shopping_list
get_user_chores
get_chore_rotation
get_open_concerns
get_recent_activity
```

---

# 35. AI Assistant Rules

The LLM must not:

- Recalculate balances independently
- Guess inventory
- Guess chore rotation
- Invent expense data
- Directly mutate database tables
- Settle debts without confirmation

Instead:

```text
User
↓
AI determines requested data
↓
Backend function
↓
Structured response
↓
AI explains result
```

---

# 36. Example AI Flow

User:

```text
What should we buy?
```

Backend returns:

```json
{
  "low_stock": [
    {"name": "Milk", "quantity": 0.5, "unit": "gallon"},
    {"name": "Eggs", "quantity": 2, "unit": "count"}
  ],
  "expiring": [
    {"name": "Chicken", "days_remaining": 1}
  ]
}
```

AI:

```text
You are low on milk and eggs. Chicken expires tomorrow, so I would use that before buying more chicken.
```

---

# 37. Frontend Folder Structure

Recommended:

```text
src/

  app/
    page.tsx

    money/
      page.tsx
      new/
        page.tsx
      expense/
        [id]/
          page.tsx

    inventory/
      page.tsx
      new/
        page.tsx
      [id]/
        page.tsx

    shopping/
      page.tsx

    chores/
      page.tsx

    issues/
      page.tsx
      new/
        page.tsx
      [id]/
        page.tsx

    notifications/
      page.tsx

    assistant/
      page.tsx

    settings/
      page.tsx

  components/
    dashboard/
    money/
    inventory/
    shopping/
    chores/
    issues/
    notifications/
    layout/
    ui/

  lib/
    supabase/
    expenses/
    inventory/
    shopping/
    chores/
    issues/
    notifications/
    assistant/

  hooks/

  types/

  utils/
```

---

# 38. Important Service Files

Suggested business logic:

```text
lib/expenses/calculateBalances.ts
lib/expenses/simplifyDebts.ts
lib/expenses/validateSplit.ts

lib/inventory/checkLowStock.ts
lib/inventory/checkExpiry.ts
lib/inventory/updateQuantity.ts

lib/shopping/syncLowStock.ts

lib/chores/getNextAssignee.ts
lib/chores/generateAssignments.ts
lib/chores/calculateStreak.ts

lib/notifications/createNotification.ts
```

---

# 39. UI Principles

RoomOS should feel like a mobile application.

Design for phones first.

Guidelines:

- Large touch targets
- Bottom navigation
- Minimal text entry
- Fast add actions
- Cards instead of dense tables
- Important data visible immediately
- Avoid nested menus
- Avoid desktop-first dashboards
- Use meaningful icons
- Consistent status badges
- Strong empty states

---

# 40. Responsive Design

Primary target:

```text
375px–430px phone width
```

Secondary:

```text
tablet
desktop
```

Desktop can use a centered max-width layout.

Do not optimize desktop first.

---

# 41. PWA Plan

After the base app works:

Add:

- Web manifest
- App icons
- Theme color
- Installable behavior
- Offline shell
- Cached static assets
- Home screen launch

Goal:

Roommates should be able to install RoomOS like a normal app.

---

# 42. Development Phases

# Phase 0 — Foundation

Goal:

Get a functional shell deployed.

Tasks:

- Initialize Next.js
- Enable TypeScript
- Configure Tailwind
- Add shadcn/ui
- Create Supabase project
- Add Supabase client
- Add environment variables
- Create roommate seed data
- Create apartment PIN screen
- Create roommate selector
- Store current roommate locally
- Create mobile navigation
- Add placeholder pages
- Deploy to Vercel

Deliverable:

A roommate can open the hosted app, enter the PIN, select their name, and navigate through empty modules.

---

# Phase 1 — Inventory

This is the first real feature.

Tasks:

- Create inventory_items table
- Create inventory_transactions table
- Build inventory list
- Build inventory item card
- Build add-item form
- Build edit item
- Build delete item
- Build quantity adjustment
- Build Consume flow
- Build Add Stock flow
- Record every transaction
- Add categories
- Add storage locations
- Add personal/shared ownership
- Add owner labels
- Add expiry logic
- Add low-stock logic
- Add filters
- Add search

Filters:

```text
All
Shared
Mine
Fridge
Freezer
Pantry
Low Stock
Expiring
```

Deliverable:

All roommates can manage real apartment inventory.

---

# Phase 2 — Shopping List

Tasks:

- Create shopping_items table
- Build shopping page
- Manual item creation
- Mark purchased
- Remove item
- Connect low-stock inventory
- Prevent duplicate low-stock entries
- Update inventory after purchase
- Add purchase history

Deliverable:

Low inventory can become a shared shopping list.

---

# Phase 3 — Money

Build incrementally.

## 3A Basic Expenses

- expenses table
- expense_splits table
- Equal split
- Expense list
- Expense details
- Delete expense
- Edit expense

## 3B Advanced Splits

- Exact amount
- Percentage
- Shares
- Validation logic

## 3C Balances

- Balance service
- Per-user net balance
- Owed-by / owed-to display
- Simplified debts

## 3D Settlements

- settlements table
- Settle up UI
- Settlement history

## 3E Recurring Expenses

- recurring_expenses table
- Monthly rent
- Internet
- Utilities
- Generate recurring entries

Deliverable:

RoomOS supports the important Splitwise workflows.

---

# Phase 4 — Chores

Tasks:

- Create chore_templates
- Create chore_rotations
- Create chore_assignments
- Build chore list
- Create chore
- Configure weekly rotation
- Current assignee calculation
- Due dates
- Mark complete
- Completion history
- Points
- Streaks
- Generate future assignments

Deliverable:

Roommates no longer need to remember chore turns manually.

---

# Phase 5 — Apartment Concerns

Tasks:

- concerns table
- concern_comments table
- concern_attachments table
- Supabase Storage bucket
- Create concern
- Upload photo
- Set priority
- Assign roommate
- Change status
- Add comments
- Resolve issue
- View issue history

Deliverable:

Apartment problems are visible and trackable.

---

# Phase 6 — Dashboard

Only build the real dashboard after core modules exist.

Widgets:

- Personal balance
- Food expiring
- Low stock
- Current chores
- Shopping count
- Open concerns
- Recent activity

Deliverable:

Opening RoomOS immediately answers:

```text
What do I owe?
What food needs attention?
What do I need to do?
```

---

# Phase 7 — Realtime

Tasks:

- Realtime inventory
- Realtime shopping
- Realtime expense list
- Realtime balances
- Realtime chores
- Realtime concerns
- Realtime comments
- Realtime notification count

Test with two browser windows.

Deliverable:

Changes appear on roommates' devices immediately.

---

# Phase 8 — Notifications

Tasks:

- notifications table
- Notification creation service
- Bell icon
- Unread count
- Notification center
- Mark read
- Mark all read

Triggers:

```text
new expense
low inventory
expiring food
chore assigned
chore due
new issue
issue assigned
issue resolved
```

Deliverable:

Important changes are surfaced automatically.

---

# Phase 9 — PWA

Tasks:

- Manifest
- Icons
- Install prompt
- Service worker
- Offline shell
- Mobile home screen testing

Deliverable:

RoomOS behaves like an installed mobile app.

---

# Phase 10 — AI Assistant

Tasks:

- Assistant page
- Server-side AI route
- Define tool functions
- Implement balance query
- Implement inventory query
- Implement chore query
- Implement issue query
- Implement shopping query
- Add conversation UI
- Validate responses
- Add rate limiting

Deliverable:

Users can ask natural-language questions about the apartment.

---

# Phase 11 — Push Notifications

Only after PWA stability.

Possible notifications:

- Chore due today
- Food expires tomorrow
- New expense
- Urgent apartment concern

Deliverable:

Roommates can receive useful reminders outside the app.

---

# 43. Recommended Implementation Order

Exact order:

```text
1. Project foundation
2. Roommate selection
3. Inventory schema
4. Inventory CRUD
5. Inventory transactions
6. Low-stock / expiry
7. Shopping list
8. Expenses
9. Split calculations
10. Balances
11. Settlements
12. Recurring expenses
13. Chores
14. Rotation
15. Concerns
16. Comments/photos
17. Dashboard
18. Activity feed
19. Realtime
20. Notifications
21. PWA
22. AI
23. Push notifications
```

Do not change this order unless a real usage need appears.

---

# 44. Codex Development Strategy

Do not ask Codex to create the entire app in one prompt.

Use small, reviewable tasks.

Each task should specify:

- Goal
- Existing files
- Files allowed to change
- Requirements
- Non-goals
- Validation
- Expected output

---

# 45. Example Codex Task 1

```text
Create the initial mobile-first RoomOS application shell.

Stack:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase

Requirements:
- Bottom navigation: Home, Money, Food, Chores, More
- Mobile-first layout
- Placeholder page for each section
- Reusable app shell component
- No feature implementation yet
- No authentication yet

Keep business logic separate from UI.
```

---

# 46. Example Codex Task 2

```text
Implement RoomOS roommate selection.

There are exactly five fixed roommates.

Flow:
1. User enters apartment PIN.
2. User selects their name.
3. Selected roommate ID is stored locally.
4. User is redirected to Home.
5. Returning users should not need to choose again unless they switch user.

Do not add Supabase Auth.
```

---

# 47. Example Codex Task 3

```text
Design and implement the RoomOS inventory database layer.

Tables:
- inventory_items
- inventory_transactions

Requirements:
- shared or personal ownership
- quantity
- unit
- expiry date
- category
- storage location
- minimum quantity
- transaction history
- created_by
- timestamps

Add SQL migration and TypeScript types.

Do not build the frontend yet.
```

---

# 48. Example Codex Task 4

```text
Implement RoomOS inventory CRUD.

Requirements:
- list inventory
- add item
- edit item
- delete item
- mobile-first cards
- Supabase persistence
- loading state
- error state
- empty state
- search
- storage location filter
- ownership filter

Do not implement shopping-list automation yet.
```

---

# 49. Example Codex Task 5

```text
Implement inventory consumption.

When a roommate consumes inventory:
- ask for quantity
- validate quantity
- prevent negative stock
- create an inventory_transaction
- update inventory_items.quantity atomically
- show success feedback

Business logic must not live directly in React components.
```

---

# 50. Git Strategy

Use feature branches.

Examples:

```text
main
develop

feature/inventory
feature/shopping
feature/expenses
feature/chores
feature/issues
feature/realtime
feature/assistant
```

For a small personal project, `develop` is optional.

At minimum:

```text
main
feature/*
```

---

# 51. Commit Style

Use small commits.

Examples:

```text
feat: add inventory schema
feat: implement inventory item creation
feat: add consume inventory transaction
fix: prevent inventory quantity below zero
feat: add low-stock detection
```

Avoid commits such as:

```text
updates
changes
final
stuff
```

---

# 52. Environment Variables

Example:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=
ROOMOS_PIN_HASH=
```

Never expose:

```text
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
```

to the browser.

---

# 53. Database Migrations

Store migrations in source control.

Example:

```text
supabase/
  migrations/
    001_roommates.sql
    002_inventory.sql
    003_shopping.sql
    004_expenses.sql
    005_chores.sql
    006_concerns.sql
    007_notifications.sql
```

Never rely only on manual Supabase dashboard changes.

---

# 54. Testing Strategy

Use three levels.

---

## Unit Tests

Test business logic.

High priority:

```text
expense split validation
balance calculation
debt simplification
low-stock detection
expiry calculation
chore rotation
streak calculation
```

---

## Integration Tests

Test:

```text
create expense → splits saved
consume food → quantity updates + transaction saved
low stock → shopping item created
complete chore → history saved
resolve concern → state updated
```

---

## End-to-End Tests

Critical user paths:

```text
Choose roommate
Add inventory
Consume inventory
Add expense
View balance
Settle debt
Complete chore
Report concern
```

Playwright is a good option.

---

# 55. Expense Testing Cases

You should explicitly test:

### Equal Split

```text
$100 / 5 = $20 each
```

### Unequal Exact

```text
$100
A = 50
B = 30
C = 20
```

### Percentage

```text
A = 50%
B = 30%
C = 20%
```

### Shares

```text
A = 2 shares
B = 1 share
C = 1 share
```

### Rounding

Example:

```text
$10 / 3
```

Must total exactly $10 after rounding.

Never allow:

```text
$9.99
$10.01
```

total discrepancies.

---

# 56. Inventory Testing Cases

Test:

- zero quantity
- fractional quantities
- quantity below threshold
- missing expiry
- expired yesterday
- expires today
- expires tomorrow
- personal food
- shared food
- deleting item
- concurrent consumption
- preventing negative inventory

---

# 57. Chore Testing Cases

Test:

- five-person rotation
- inactive roommate
- completed assignment
- missed assignment
- next-cycle generation
- multiple chores
- same roommate assigned to different chores
- weekly reset

---

# 58. Realtime Testing

Open RoomOS in:

```text
Browser A → Mohit
Browser B → Urmi
```

Test:

```text
A adds inventory
B sees inventory

B completes chore
A sees updated status

A reports issue
B sees issue

B adds expense
A balance changes
```

---

# 59. Error Handling

All operations should handle:

- offline state
- Supabase unavailable
- duplicate requests
- stale data
- invalid quantity
- invalid split
- expired session selection
- image upload failure

Display human-readable messages.

Do not expose raw database errors.

---

# 60. Optimistic UI

Use cautiously.

Good candidates:

- Mark notification read
- Mark shopping item purchased
- Mark chore complete

Avoid optimistic updates initially for:

- Expense creation
- Balance settlement
- Inventory transactions

These require stronger data consistency.

---

# 61. Database Consistency

Important operations should be atomic where possible.

Example:

Consume inventory:

```text
check current quantity
↓
create transaction
↓
update quantity
```

This should occur in one database transaction or RPC function.

Otherwise two roommates could consume the same stock simultaneously.

---

# 62. Supabase RPC Candidates

Create database functions for:

```text
consume_inventory_item()
add_inventory_stock()
create_expense_with_splits()
record_settlement()
complete_chore()
purchase_shopping_item()
```

This centralizes important transactional operations.

---

# 63. Row-Level Security

Even without normal authentication, enable sensible restrictions.

Since all five users share access, initial RLS can be simple.

If using only anonymous Supabase access, carefully limit tables and operations.

Prefer routing sensitive writes through server-side Next.js endpoints if necessary.

Never expose service-role credentials.

---

# 64. Performance

Because there are only five roommates, scale is not a concern.

Still follow good practices:

- Paginate activity
- Limit notifications
- Add database indexes
- Avoid unnecessary realtime subscriptions
- Avoid fetching full histories by default

Suggested indexes:

```text
expenses(expense_date)
expense_splits(roommate_id)
inventory_items(expiry_date)
inventory_items(category)
shopping_items(status)
chore_assignments(assigned_to, due_date)
concerns(status)
notifications(roommate_id, is_read)
activity_log(created_at)
```

---

# 65. Accessibility

Implement:

- Visible labels
- Keyboard support
- High contrast
- Large tap targets
- Clear focus states
- Accessible modals
- Semantic buttons
- Avoid color-only status indicators

---

# 66. Data Backup

For a private apartment app:

- Supabase database is primary
- Periodically export data during development
- Keep migrations in Git
- Avoid deleting important financial history

Expenses and settlements should preferably use soft deletion or restricted deletion later.

---

# 67. Analytics

Do not add product analytics initially.

Useful internal metrics can come from the database:

- Chores completed
- Open concerns
- Inventory usage
- Shared expenses

No need for Google Analytics for a five-person apartment tool.

---

# 68. Deployment Process

## Initial

1. Push Git repository
2. Create Vercel project
3. Connect GitHub
4. Add environment variables
5. Deploy
6. Configure Supabase allowed origins
7. Test mobile layout
8. Share URL with roommates

---

# 69. Production Checklist

Before asking roommates to rely on the app:

- [ ] Database migrations committed
- [ ] All five roommates seeded
- [ ] Apartment PIN works
- [ ] Mobile navigation works
- [ ] Inventory CRUD works
- [ ] Inventory consumption cannot go negative
- [ ] Low-stock works
- [ ] Shopping list works
- [ ] Equal expense split works
- [ ] Exact split works
- [ ] Percentage split works
- [ ] Shares split works
- [ ] Expense rounding tested
- [ ] Balance calculation tested
- [ ] Settle-up tested
- [ ] Chore rotation tested
- [ ] Concerns work
- [ ] Photo uploads work
- [ ] Realtime tested on two devices
- [ ] Error states implemented
- [ ] Environment secrets secure
- [ ] HTTPS active
- [ ] PWA tested before installation

---

# 70. Initial Seed Data

Seed roommates.

Example placeholders:

```text
Mohit
Roommate 2
Roommate 3
Roommate 4
Roommate 5
```

Seed chores:

```text
Kitchen Cleaning
Bathroom Cleaning
Trash
Vacuuming
Mopping
```

Seed categories and locations as constants in code rather than database tables unless customization becomes necessary.

---

# 71. Dashboard Data Query

Create a single dashboard service.

Example:

```text
getDashboardData(roommateId)
```

Returns:

```json
{
  "balance": {},
  "expiringItems": [],
  "lowStockItems": [],
  "chores": [],
  "shoppingCount": 0,
  "openConcernCount": 0,
  "recentActivity": []
}
```

This is preferable to having the dashboard independently query ten services from React.

---

# 72. TypeScript Types

Generate Supabase database types.

Keep domain types separate if necessary.

Example:

```text
types/database.ts
types/expense.ts
types/inventory.ts
types/chore.ts
types/concern.ts
```

Avoid widespread `any`.

---

# 73. State Management

Do not add Redux initially.

Use:

- React state
- Server Components where appropriate
- TanStack Query optionally for client caching
- Context only for current roommate / app session

Recommended global context:

```text
CurrentRoommateContext
```

Avoid a large global store.

---

# 74. Form Handling

Recommended:

- React Hook Form
- Zod

Use Zod schemas for:

```text
expense input
inventory input
shopping input
chore input
concern input
```

Share validation between client and server where possible.

---

# 75. Validation Rules

Examples:

Inventory:

```text
quantity >= 0
minimum_quantity >= 0
expiry optional
name required
unit required
```

Expense:

```text
amount > 0
participants >= 1
split totals match amount
percentage totals = 100
shares > 0
```

Settlement:

```text
payer != receiver
amount > 0
```

---

# 76. UI Components to Build Early

Reusable:

```text
AppShell
BottomNavigation
PageHeader
FloatingActionButton
StatusBadge
UserAvatar
EmptyState
LoadingSkeleton
ConfirmDialog
NumberInput
DatePicker
RoommatePicker
SearchBar
FilterChips
```

Feature:

```text
BalanceCard
InventoryCard
ChoreCard
ConcernCard
ShoppingItem
ExpenseCard
NotificationItem
```

---

# 77. Empty States

Examples:

Inventory:

```text
No inventory yet.
Add your first food or household item.
```

Expenses:

```text
No expenses yet.
Add your first shared expense.
```

Concerns:

```text
No open concerns.
Everything looks good.
```

Good empty states improve perceived quality significantly.

---

# 78. Logging

During development, log:

- Failed Supabase operations
- Invalid split calculations
- Realtime subscription errors
- Failed background jobs

Do not log:

- API keys
- PIN
- sensitive request payloads unnecessarily

---

# 79. Recurring Jobs

Jobs eventually needed:

```text
daily:
- check expiring inventory
- generate notifications

weekly:
- generate chore assignments

monthly / schedule-based:
- generate recurring expenses
```

Possible implementation:

- Supabase scheduled functions
- Vercel Cron
- GitHub Actions for low-frequency tasks

Choose one approach rather than mixing schedulers.

---

# 80. Recommended Scheduler

For simplicity:

Use **Vercel Cron** calling protected API routes if available under the free plan you are using.

If limits are problematic, use Supabase scheduled functions.

Jobs:

```text
/api/jobs/check-expiry
/api/jobs/generate-chores
/api/jobs/generate-recurring-expenses
```

Protect them with a secret.

---

# 81. AI Cost Control

Because AI is optional:

- Call AI only when user submits a question
- Do not run AI automatically
- Use structured tool calls
- Limit conversation history
- Cache simple data retrieval where useful
- Add per-user daily rate limit if needed

Most apartment questions can be answered cheaply.

---

# 82. Privacy

Keep AI context minimal.

Do not unnecessarily send:

- all historical expenses
- all comments
- complete activity history

Only send what is required for the current question.

---

# 83. Future Enhancements

After successful apartment use:

### Money
- Monthly spending summaries
- Category spending charts
- Suggested settlements
- Export CSV

### Inventory
- Barcode scanner
- Receipt parsing
- Smart consumption predictions
- Recipe recommendations
- Pantry analytics

### Shopping
- Store grouping
- Costco/Walmart list mode
- Assigned shopper

### Chores
- Chore swaps
- Vacation mode
- Penalties / rewards
- Leaderboards

### Issues
- Landlord contact
- Maintenance history
- Cost tracking

### AI
- "Plan dinner using what we have"
- "What will expire this week?"
- "Summarize apartment activity"
- "Who has the lightest chore load?"
- "Why did our grocery cost increase?"

---

# 84. Suggested MVP Boundary

Do not wait for every planned feature before letting roommates use RoomOS.

Release internally after:

```text
Roommate selection
Inventory
Shopping
Basic expenses
Balances
Chores
Basic issues
Realtime
```

Then collect real feedback.

Add:

```text
advanced expense splits
notifications
PWA
AI
points/streaks
```

afterward if necessary.

---

# 85. Suggested Milestones

## Milestone 1 — Functional Shell

Complete when:

- App deployed
- PIN works
- Roommate selection works
- Navigation works

---

## Milestone 2 — Food System

Complete when:

- Inventory works
- Consumption works
- Expiry works
- Low stock works
- Shopping list works

---

## Milestone 3 — Money System

Complete when:

- Expense creation works
- All split modes work
- Balances are correct
- Settlements work
- Recurring expenses work

---

## Milestone 4 — Apartment Operations

Complete when:

- Chore rotation works
- Concern tracking works
- Photo/comments work

---

## Milestone 5 — Shared Experience

Complete when:

- Dashboard works
- Activity feed works
- Realtime works
- Notifications work

---

## Milestone 6 — App Experience

Complete when:

- PWA works
- Mobile install works
- Push notifications work if desired

---

## Milestone 7 — Intelligence

Complete when:

- AI assistant answers apartment questions using live RoomOS data

---

# 86. Final MVP Architecture

```text
                          RoomOS

                            │
                    Apartment PIN
                            │
                    Roommate Selector
                            │
                         Dashboard
                            │
        ┌───────────────────┼────────────────────┐
        │                   │                    │
      Money               Food                 Chores
        │                   │                    │
   Expenses             Inventory          Weekly Rotation
   Splits               Consumption        Completion
   Balances             Expiry             History
   Settlements           Low Stock          Points
        │                   │
        │              Shopping List
        │
        └───────────────────┬────────────────────┘
                            │
                         Issues
                            │
                   Reports / Comments
                            │
                         Realtime
                            │
                      Notifications
                            │
                       AI Assistant
```

---

# 87. Recommended First Development Sprint

Start with only these tasks:

1. Create Git repository
2. Initialize Next.js TypeScript
3. Add Tailwind + shadcn
4. Create Supabase project
5. Add environment variables
6. Create roommates table
7. Seed five roommates
8. Implement apartment PIN
9. Implement roommate selector
10. Add current roommate context
11. Build bottom navigation
12. Create Inventory page
13. Add inventory migration
14. Build inventory list
15. Build add inventory form
16. Deploy to Vercel

At the end of this sprint, share the URL with roommates even though most sections are placeholders.

---

# 88. First Real Feature Sprint

After foundation:

1. Edit inventory
2. Delete inventory
3. Consume inventory
4. Add stock
5. Transaction history
6. Expiry states
7. Low-stock states
8. Filters
9. Search
10. Shared/personal ownership

Then actually start using the inventory feature at home.

Real usage will expose assumptions before the more complicated money system is built.

---

# 89. Key Engineering Principles

Throughout development:

1. Keep business logic outside React components.
2. Keep financial history immutable wherever possible.
3. Store inventory transactions, not only quantities.
4. Use database transactions for consistency-sensitive operations.
5. Let the backend calculate balances.
6. Let the AI explain data, not invent it.
7. Build mobile-first.
8. Implement one feature at a time.
9. Test financial calculations thoroughly.
10. Ship to the five roommates early.
11. Use real feedback before adding complexity.
12. Keep the system optimized for one apartment rather than premature generalization.

---

# 90. Final Product Definition

RoomOS should eventually answer four questions immediately:

```text
What do I owe?

What food do we have or need?

What am I supposed to do?

Is anything wrong with the apartment?
```

Everything else should support those four questions.

That focus should guide architecture, UI decisions, AI functionality, and future feature requests.
