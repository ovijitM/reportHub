# UI/UX Design Spec — Jupiter Field Sales App

## 0. Grounding the Brief

This isn't a marketing site — it's a working tool two very different people use daily:

- **The Agent (MPO):** standing in a market in Nasirnagar, phone in one hand, sun
  glare on the screen, spotty signal, trying to log a visit before moving to the
  next stop. Speed and thumb-friendliness matter more than polish.
- **The Manager/Admin:** at a desk, reviewing numbers across several agents,
  comparing target vs. actual, deciding who's behind. Density and scannability
  matter more than speed.

One codebase, two very different interface postures. The design has to serve both
without feeling like two different products bolted together.

The subject world here is the **field ledger** — the actual paper sheets: ruled
grids, hand-filled rows, a signature line at the bottom, a date column that reads
like a tally. That's the visual DNA to draw from, not a generic "SaaS dashboard"
look.

---

## 1. Design Tokens

### Color
| Token | Hex | Use |
|---|---|---|
| `ink` | #1F2A24 | primary text, near-black with a slight green undertone |
| `paper` | #FAF7F0 | app background — warm off-white, evokes the ledger paper |
| `ledger-line` | #D8D2C2 | table rules, dividers, input borders — muted, not stark black |
| `field-green` | #2F6D4F | primary action color — deep clinical green, not generic teal/blue |
| `field-green-dark` | #1F4D37 | pressed/active states |
| `alert-clay` | #B5502F | errors, overdue targets, destructive actions |
| `signal-amber` | #C98A2C | warnings, pending review, unsynced entries |
| `confirm` | #2F6D4F | success (reuse field-green so success doesn't feel like a different app) |

Rationale: green is deliberate, not decorative — it's the color of a pharma/medical
field operation (health cross, prescription pad), and it reads distinctly from the
generic terracotta/near-black AI-design defaults. Paper background reinforces "this
is a digital version of your ledger," not a dashboard product.

### Typography
- **Display / headers:** *Fraunces* (a warm serif with real character) — used
  sparingly, for section titles and the staff's name at the top of a sheet view.
  This nods to the printed letterhead on the original paper forms.
- **Body / UI / forms:** *Inter* — neutral, extremely legible at small sizes on
  cheap Android screens in sunlight, wide language support.
- **Data / tabular / numbers:** *IBM Plex Mono* for all quantity, currency, and date
  values — mono digits align in columns the way a ruled ledger does, and make
  scanning a column of numbers (Daily Order, Daily Collection) much easier for a
  manager doing quick mental math.

Type scale (mobile base 16px):
- Display: 28px / Fraunces SemiBold
- Section header: 18px / Inter SemiBold
- Body: 16px / Inter Regular
- Data/table cells: 15px / Plex Mono Regular
- Caption/helper: 13px / Inter Regular, `ink` at 65% opacity

### Layout
- 8px base spacing unit.
- Mobile-first: single-column forms, full-width tap targets (min 48px height).
- Desktop (admin panel): 12-column grid, max content width 1200px, data tables get
  room to breathe — no need to cram to mobile constraints here.
- Border radius: 6px on cards/inputs (soft, but not bubbly) — 0px on table cells
  (tables should feel like a ledger grid, sharp-edged).

### Signature Element
A single recurring visual motif across every screen: **a thin ruled baseline under
every input field**, like writing on ruled paper, instead of a boxed input. Text
inputs sit directly on a `ledger-line` colored bottom-border rather than in a full
bordered box. This is the one distinctive, memorable touch — it quietly says "you're
filling in a ledger," carried through consistently, and costs nothing in usability.

---

## 2. Agent-Facing App (Mobile, Field Use)

### Principles
- **One task per screen.** Never show all three sheets at once. Home screen is
  three big tappable cards: "Daily Works," "Daily Order/Collection," "Field Visit."
- **Minimize typing.** Market name = autocomplete/select from the manager-assigned
  market list (Admin Panel 7A), not free text. Quantities use a stepper
  (+ / − buttons) alongside a numeric field, since most values are small counts
  (0–10).
- **Today by default.** Opening a form pre-fills today's date; changing the date
  requires an explicit tap, so accidental backdating is unlikely.
- **Offline-tolerant submit.** "Save" button always responds instantly (optimistic
  UI), with a small sync indicator (dot: green = synced, amber = queued, clay = failed,
  tap to retry). Never block the agent from moving to the next form because of a
  bad connection.
- **Confirmation, not congratulation.** After submit: a quiet inline banner —
  "Saved for 07 Jul" — not a modal, not confetti. This is a work tool.

### Home Screen (wireframe)
```
┌─────────────────────────────┐
│  Jupiter Field Sheets        │
│  MD Rakib Sarkar · Nasirnagar│
├─────────────────────────────┤
│  [ Daily Works        →]     │
│  [ Order & Collection →]     │
│  [ Field Visit        →]     │
├─────────────────────────────┤
│  Recent entries               │
│  07 Jul — all 3 submitted ✓   │
│  06 Jul — all 3 submitted ✓   │
│  05 Jul — Field Visit missing⚠│
└─────────────────────────────┘
```
The "missing" flag on the home screen is the single most useful proactive UI
element for an agent — surfaces gaps without them needing to check three separate
histories.

### Form Screen Pattern (e.g. Daily Works)
```
┌─────────────────────────────┐
│ ← Daily Works        07 Jul ▾│
├─────────────────────────────┤
│ Morning market                │
│ [ Nasirnagar        ▾ ]       │
│ ───────────────────────       │
│ Afternoon market               │
│ [ Nasirnagar        ▾ ]       │
│ ───────────────────────       │
│ Doctors visited                │
│ [ − ]   7   [ + ]              │
│ ───────────────────────       │
│ Notes (optional)               │
│ [                    ]        │
│ ───────────────────────       │
│                                │
│        [  Save entry  ]       │
└─────────────────────────────┘
```

### Empty / Error States (agent side)
- No entries yet this month: *"Nothing logged yet this month. Your first entry
  takes under a minute."* — invitation, not blame.
- Save failed (offline): *"Not synced yet. We'll save it automatically once you're
  back online — you can keep going."* — never says "error," never blocks work.
- Editing window closed: *"This entry is locked after 7 days. Ask your manager to
  make changes."* — states the rule and the path forward, no apology.

---

## 3. Manager/Admin Panel (Desktop, Office Use)

### Principles
- **Density over delight.** This is a review tool — show more rows, more columns,
  smaller type than the mobile app. A manager scanning ten agents' daily
  collections wants a table, not cards.
- **Target vs. actual is the hero metric everywhere.** Any table showing an
  agent's numbers puts Target Amount and actual (Daily Collection sum-to-date)
  side by side with a simple progress indicator — a thin horizontal bar, not a
  gauge/donut (donuts waste space at table-row height).
- **Drill-down, not dead-ends.** Every agent row in the overview links to that
  agent's full sheet history and PDF export — the panel should always feel like
  it's one click from the underlying paper-equivalent record.

### Admin Overview Screen (wireframe)
```
┌───────────────────────────────────────────────────┐
│ Agents · July 2026                    [+ Add agent]│
├───────────┬────────┬──────────┬──────────┬─────────┤
│ Agent      │ Area   │ Target   │ Collected│ Status   │
├───────────┼────────┼──────────┼──────────┼─────────┤
│ Rakib S.   │ Nasir- │ 180,000  │ 87,000   │ ▓▓▓▓░░░░ │
│            │ nagar  │          │          │  48%     │
│ ...        │ ...    │ ...      │ ...      │ ...      │
└───────────┴────────┴──────────┴──────────┴─────────┘
```

### Agent Detail / Configuration Screen
Tabs: **Profile** · **Monthly Config** (D/A, salary, target — per Admin Panel spec
Section 7A) · **Market List** · **Sheet History** (three sub-tabs matching the three
sheets, each with a "Download PDF" button per month).

### Review / Sign-off
Manager sign-off on a submitted entry is a single tap ("Mark reviewed"), visually
represented as a small checkmark stamp next to the entry row — a deliberate nod to
the "Signature of Manager" cell on the original paper sheet, translated into a
one-tap digital act rather than a drawn signature (unless drawn signatures are
later requested — see open question in agent.md).

### Empty / Error States (admin side)
- New agent, no data yet: *"No entries yet for [name]. They'll appear here once
  logged."*
- Target not set for the month: *"No target set for July — set one to track
  progress."* with a direct link to Monthly Config, not just a warning icon.

---

## 4. Interaction & Motion

Keep motion minimal and functional — no page-load choreography, no decorative
transitions. The two moments worth a deliberate micro-interaction:
1. **Save confirmation** on the agent app — a brief (150ms) checkmark draw-in next
   to the Save button, then settles. Signals completion without demanding attention.
2. **Sync status dot** — a subtle pulse only while actively retrying a queued
   submission, still otherwise. Motion should mean "something is happening," never
   run idle.

Respect `prefers-reduced-motion` — disable both above, fall back to instant state
changes.

---

## 5. Accessibility & Practical Constraints

- Minimum tap target 48×48px throughout the agent app (field conditions, not
  precision pointing).
- Color is never the only signal — sync status dot pairs with a text label on tap/
  focus; progress bars in the admin panel include the percentage as text, not just
  bar length.
- Visible keyboard focus states on all interactive elements (admin panel is
  desktop/keyboard-navigable).
- Test contrast of `field-green` on `paper` background at body-text sizes; if it
  falls short of WCAG AA for small text, reserve it for large text/icons/buttons
  only and use `ink` for body copy (current pairing should be checked against
  actual rendered type, not assumed).
- Support Bangla free-text entry (names, remarks) — ensure Inter/Plex Mono render
  Bangla acceptably, or fall back to a system font stack for those specific fields
  if not.

---

## 6. What This Explicitly Avoids

- No dashboard-template gradient hero, no big vanity stat cards on the agent app —
  agents don't need "you've made 47 visits this year 🎉," they need to log today's
  visit fast.
- No skeuomorphic signature pads or scanned-paper textures — the ledger reference
  is expressed through type, rules, and color, not a literal "looks like paper"
  skin.
- No dark mode as a first-class requirement for v1 — this is a bright-outdoor,
  daytime-use tool; revisit only if agents specifically request it for night use.
