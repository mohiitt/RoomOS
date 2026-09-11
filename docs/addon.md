# RoomOS — Feedback & Gap List

## Home screen: cut the repetition, add personality

**The redundancy problem:** "Needs Attention" currently just restates cards you already saw above it, word for word ("You're owed $40.00" appears twice, "Kitchen Cleaning due this week" appears twice). Pick one job per section:

- **Stat cards up top** → pure state, no call-to-action copy. "Balance: +$40.00", "Food: 0 expiring", etc.
- **Needs Attention** → the _only_ place with actionable items, and only things that actually need a decision (someone owes you money and hasn't paid in N days, a chore is overdue — not just "due this week"). If nothing genuinely needs attention, hide the section entirely instead of always rendering it.
- **Recent Activity** → history, not action. Leave as is.

This alone removes ~30% of what's currently on screen without losing information.

**Making it fun, without abandoning what's already working:** the joke subtitles ("The fridge is judging you. Affectionately." / "The sponge has a union now.") are the best thing about the current design — lean further into that instead of adding generic gamification chrome.

Ideas in that spirit:

- **Apartment vibe / mood score**: one line combining balances + open issues + overdue chores into a single playful status — "Apartment vibe: chill" vs "Apartment vibe: sponge drama" — sitting right under the greeting where the subtitle already lives. Gives people a reason to open the app even when nothing's due.
- **Streak flames, not just numbers**: "0 week streak" reads as a failure state. A visual streak (flame icon that fills in, resets with a shrug emoji rather than a bare "0") turns chores into something people want to keep going, the way Duolingo/GitHub streaks work.
- **Roommate of the week**: surface whoever has the most chore points or earliest completions on Home, not buried in the Chores tab's points table. Small social nudge, zero extra backend work — you already track points and streaks.
- **Vary the photography**: the Food and Money hero images are nice but static/stock. Consider letting roommates attach their own photo when logging a big expense or adding food ("Costco run" photo instead of a generic bowl-of-money image) — personal photos will always beat stock photography for a 5-person app that already knows everyone by name.
- **Action-first ordering**: reorder Home so cards needing a tap (mark chore done, settle up) sit above cards that are just informational (recent activity, latest expense).
- **Small motion on completion**: a brief confetti/checkmark animation on "Mark done" or "Settle up" — cheap to build, makes the mundane parts (dishes, rent) feel less like a chore app and more like a shared inside joke.

---

## Full gap list

### Trust & identity

- Honor-system name switching has no re-auth step, and that identity owns every write — including money. Impersonation is the main practical risk in the whole system.
- No receipt/photo attachment on expenses. Issues already have a private photo pipeline (upload → private bucket → served after PIN unlock) — reuse it for expenses, since money is exactly where disputes will happen.
- Activity log records _what_ changed but not enough of _why/by what evidence_ for financial entries specifically.

### Money

- "Split with" toggle buttons show no visible difference between selected and deselected states in the current design — can't confirm from the UI whether removing someone is even legible.
- No per-person amount preview before saving an expense (unclear if you see "$X each" before hitting Save).
- No monthly or category spend summary/chart.
- No CSV/export option.
- Unclear whether Settle Up supports partial payments or only full settlement.
- Unclear whether recurring bills (rent, utilities) support non-equal splits — rent is the one recurring cost most likely to _not_ be equal.
- No nudge/reminder action next to "you're owed" — currently just a static fact.

### Food & Recipes

- Recipes can only be deleted, not edited — any typo means delete-and-recreate.
- The "Owner" field label doesn't adapt when Ownership = Shared, where it actually means "who bought it." Worth a conditional label.
- No Recipe → Shopping List integration — missing ingredients for a recipe don't auto-populate the shopping list even though both features exist independently.
- No sorting/surfacing of "use this soon" beyond the raw expiring/low-stock counts on Home.

### Chores

- The Chores tab only shows _your_ assignment — no apartment-wide view of who has what due this week. For a rotation system, that visibility is most of the value.
- No swap-request flow between roommates — only "complete for someone else" (which is really an override, not a negotiated swap).
- The Add Chore screen doesn't expose a weekly/monthly frequency choice in the UI even though the schema/generator support monthly chores.
- No edit path for an existing chore template (name, points, rotation) once created.

### Issues

- Unclear whether issue title/priority can be edited after creation, or only status/comments.

### Home screen / dashboard

- Duplicate information between top stat cards and "Needs Attention" (see above).
- No visible unread badge count on the notification bell in the screenshots.
- No "view all" / pagination affordance visible on Recent Activity.
- Visual sameness across cards — mostly flat cream blocks with little hierarchy beyond the two photo cards.

### Notifications & push

- Single push subscription per phone — unclear how a roommate using two devices (phone + laptop) would get alerts on both.
- No visible read/unread indicator in the UI beyond the bell's unread count.

### Technical & ops

- Only unit tests via Node's test runner (money splits, balances, chores logic) — no end-to-end tests (e.g. Playwright) covering the actual click-paths: PIN unlock → switch name → add expense → mark chore done. For daily use by 5 people, a broken submit button is a more likely failure than a math bug in `apartment_balances()`.
- GitHub Actions CI workflow exists in the repo but isn't confirmed to be actively running/green.
- No offline mutation queue (explicit design choice) — real limitation if apartment wifi is spotty and someone tries to log an expense standing in the kitchen.
- The `/assistant` route is dead code left over from a shelved feature — remove it or leave an explicit "intentionally unused" comment so it doesn't get resurrected or flagged as a bug later.

### Accessibility & polish

- Secondary gray-on-cream text (e.g. "0 week streak") may not meet WCAG AA contrast — worth a quick contrast audit.
- Dark mode toggle exists per the spec but isn't demonstrated in the current screenshots, so its actual look is unverified.
