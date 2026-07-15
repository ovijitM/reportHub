# AGENT.md — Jupiter Health Care & Allen Pharma: Field Sales Digitalization

## 1. Project Summary

Digitalize three paper-based field sales tracking sheets currently filled by hand by
field staff (Medical Promotion Officers / MPOs) at Jupiter Health Care & Allen Pharma.
Staff currently fill these daily on paper and hand them to a manager at month-end.

Build a mobile-friendly web app where:
- Field staff log in and fill daily entries via simple forms (one per sheet type).
- Data is saved to MongoDB.
- Managers can view/filter records by staff, area, and date range.
- Any user with access can download an exact PDF replica of the original paper
  sheet, auto-populated with the stored data, for a given staff member + month.

Deployment target: existing self-hosted VPS, joining the existing Traefik reverse
proxy network (pattern already established for other services — see Section 8).

---

## 2. The Three Sheets (source of truth for data model)

### Sheet 1 — Daily Works Sheet
Header fields: Name of Staff, Area, Region, Month/Year.
Row fields (one row per date):
| Field | Type | Notes |
|---|---|---|
| Date | Date | |
| Morning Visit — Market | string | market/village name |
| Afternoon Visit — Market | string | market/village name |
| Doctor Visit Quantity | number | count of doctors visited that day |
| Rx-Product Survey | string | free text, often blank |
| Signature of MPO | signature/checkbox or name | |
| Signature of Manager | signature/checkbox or name | |

### Sheet 2 — Daily Order / Collection Sheet ("Field Works Sheet")
Header fields: Name of Staff.
Static/monthly fields (entered once per staff per month, not per day):
- Head Quarter D/A (number)
- Excert (Ex-Quarter) D/A (number)
- Per Month Salary (number)
- Target Amount (number)

Row fields (one row per date):
| Field | Type | Notes |
|---|---|---|
| Date | Date | |
| Name of Market | string | can be multiple markets, e.g. "Nasirnagar+Choin" |
| Doctors Cost | number | irregular, only some days |
| Other Cost | number | irregular, only some days |
| Daily Order | number (currency) | |
| Daily Collection | number (currency) | |
| Remarks | string | free text |

Computed: Total Amount (sum of Daily Order or Daily Collection column, TBD — confirm
with staff which one "Total Amount" refers to before finalizing).

### Sheet 3 — Field Works Visit Sheet
Header fields: Name of Staff, Name of Area.
Row fields (one row per date):
| Field | Type | Notes |
|---|---|---|
| Date | Date | |
| Name of Market | string | |
| Morning Visit Quantity | number | |
| Evening Visit Quantity | number | |
| Gynecologist Quantity | number | |
| Medicine Quantity | number | |
| Pediatric Quantity | number | |
| Orthopaedic Quantity | number | |
| Skin/VD Quantity | number | |
| GP & Others Quantity | number | |
| Total Visit Quantity | number | should auto-calculate as sum of the specialty columns; allow manual override in case of mismatch |

> Note: original paper sheets show occasional mismatches between this total and the
> sum of specialty columns (e.g. one row summed to 9 vs. listed components summing to
> 7). The app should auto-calculate but flag/allow override rather than silently
> "correcting" staff-entered totals.

---

## 3. User Roles & Auth

- **Staff (MPO)** — can log in, create/edit their own daily entries (same-day or
  backfill within a configurable window, e.g. last 7 days), view their own history,
  download their own sheets as PDF.
- **Manager/MPO Supervisor** — can view all staff entries in their region/area, filter
  by staff/date/market, download PDFs for any staff member, cannot edit staff entries
  directly (only add manager remarks/signature-off).
- **Admin** — full CRUD, user management (create staff accounts, assign area/region),
  can edit any record (with an audit trail of edits).

Auth: JWT-based session auth, password login (bcrypt-hashed). Keep it simple —
no need for OAuth/SSO for a mini internal tool. Add a "Signature" concept as a
typed name + timestamp (not actual image signature) unless staff specifically want
drawn signatures (pad input) — confirm before building signature-pad UI, it adds
complexity.

---

## 4. Tech Stack

- **Backend:** Node.js + Express
- **Database:** MongoDB (self-hosted or Atlas — confirm which; VPS already has
  infra for self-hosted Postgres/Traefik services, Mongo container can join the
  same Docker network)
- **Frontend:** React (Vite), mobile-first responsive design — staff will likely
  fill this from a phone in the field
- **PDF generation:** Puppeteer (render an HTML template styled to match the
  original paper sheet's grid layout, then print to PDF) — chosen over PDFKit
  because exact grid/table replica is much easier to achieve with HTML/CSS than
  programmatic PDF drawing
- **Reverse proxy:** Traefik (join existing `web` Docker network, add Traefik
  labels for routing + TLS via existing cert resolver — do NOT set up NGINX/Certbot)
- **Containerization:** Docker Compose, consistent with existing VPS services

---

## 5. Data Models (MongoDB collections)

### `users`
```
{
  _id, name, role: "staff" | "manager" | "admin",
  area, region, phone,
  passwordHash, createdAt
}
```

### `dailyWorksEntries` (Sheet 1)
```
{
  _id, staffId (ref users), date,
  morningMarket, afternoonMarket,
  doctorVisitQuantity, rxProductSurvey,
  mpoSignedOff: { name, at },
  managerSignedOff: { name, at },
  createdAt, updatedAt
}
```

### `dailyOrderEntries` (Sheet 2)
```
{
  _id, staffId, month, year,
  headQuarterDA, exQuarterDA, perMonthSalary, targetAmount, // monthly, set once
  days: [
    { date, market, doctorsCost, otherCost, dailyOrder, dailyCollection, remarks }
  ],
  createdAt, updatedAt
}
```

### `fieldVisitEntries` (Sheet 3)
```
{
  _id, staffId, area, date, market,
  morningVisitQty, eveningVisitQty,
  gynecologistQty, medicineQty, pediatricQty,
  orthopaedicQty, skinVdQty, gpOthersQty,
  totalVisitQty, totalVisitQtyOverridden: bool,
  createdAt, updatedAt
}
```

---

## 6. API Endpoints (high level)

```
POST   /api/auth/login
GET    /api/auth/me

# Sheet 1
POST   /api/daily-works            (create/upsert today's entry for logged-in staff)
GET    /api/daily-works?staffId=&from=&to=
PUT    /api/daily-works/:id        (edit within allowed window / admin)

# Sheet 2
POST   /api/daily-orders/:staffId/:month/:year/monthly-fields
POST   /api/daily-orders/:staffId/:month/:year/day
GET    /api/daily-orders?staffId=&month=&year=

# Sheet 3
POST   /api/field-visits
GET    /api/field-visits?staffId=&from=&to=

# PDF export
GET    /api/pdf/daily-works/:staffId/:month/:year
GET    /api/pdf/daily-orders/:staffId/:month/:year
GET    /api/pdf/field-visits/:staffId/:month/:year

# Admin
GET/POST/PUT/DELETE /api/users
```

---

## 7. Frontend Requirements

- **Staff-friendly, not admin-panel-friendly.** Assume staff are filling this on a
  phone, in the field, possibly with low connectivity. Priorities:
  - Big touch targets, minimal typing (dropdowns/autocomplete for market names
    pulled from a staff's own history, so "Nasirnagar" doesn't need retyping daily)
  - Numeric keypad for quantity/currency fields
  - One sheet = one simple form, not a giant scrolling table
  - Autosave / offline-tolerant submission (queue and retry if network drops)
  - Clear "today's entry submitted ✅" confirmation state
- **Three separate entry forms** (per your preference), reachable from a simple
  home screen: "Daily Works", "Daily Order/Collection", "Field Visit".
- **History view:** simple list/table of past entries, filterable by date range,
  per sheet type.
- **Manager view:** table across all staff, filterable by area/staff/date, with a
  "Download PDF" action per staff per month.

---

## 7A. Admin Panel — Manager Assigns/Configures Each Agent

Managers/Admins get a dedicated Admin Panel, separate from the staff-facing forms,
where they set up and configure each field agent (staff member) before that agent
starts logging entries. This is the manager's control surface — staff should never
need to touch these settings themselves.

### Agent Profile Setup (per staff/agent)
- Create agent account: name, phone, login credentials, role (staff/manager/admin)
- **Assign Area** (e.g. "Nasirnagar") and **Region**
- **Assign/curate Market List** for that agent — the set of markets/villages they're
  expected to visit; this list feeds the autocomplete dropdown in the agent's daily
  forms (Section 7) instead of free-typing every time
- **Assign monthly financial parameters** (maps to Sheet 2 header fields):
  - Head Quarter D/A
  - Ex-Quarter D/A
  - Per Month Salary
  - Target Amount
  - These should be editable per month (an agent's target/D/A can change month to
    month), not a single fixed value forever — store as a `staffMonthlyConfig`
    record keyed by staffId + month + year
- **Assign a supervising manager** (for multi-manager setups, so each agent's
  entries route to the correct manager's view)
- Activate/deactivate an agent (soft-delete, don't hard-delete — keep historical
  sheet data intact even if someone leaves)

### Data Model Addition
```
staffMonthlyConfig {
  _id, staffId, month, year,
  area, region, supervisingManagerId,
  marketList: [string],
  headQuarterDA, exQuarterDA, perMonthSalary, targetAmount,
  createdAt, updatedAt
}
```
This replaces the "monthly fields, set once" note in Section 2/5 — these values now
live in `staffMonthlyConfig` and are set by the manager/admin, not the agent, and can
be updated month to month.

### Admin Panel Screens
1. **Agent list** — all agents, area, active/inactive status, quick links to their
   sheets
2. **Agent detail / edit** — profile + the monthly config fields above, with a
   month-picker to view/edit past or upcoming months' config
3. **Market list manager** — add/remove/rename markets per agent (or a shared master
   market list they pick from, to avoid duplicate spellings like "Nasirnagar" vs
   "Nasinnagar")
4. **Bulk view across agents** — table of all agents' current-month target vs.
   actual (daily order/collection totals), for quick manager oversight
5. **Sign-off / review** — manager reviews submitted daily entries and marks them
   reviewed (maps to the "Signature of Manager" field on the original paper sheets)

### API Additions
```
POST   /api/admin/agents                     (create agent)
PUT    /api/admin/agents/:id                 (edit agent profile)
PUT    /api/admin/agents/:id/deactivate
GET    /api/admin/agents

GET/PUT /api/admin/staff-monthly-config/:staffId/:month/:year
GET    /api/admin/markets                    (shared master market list)
POST   /api/admin/markets

GET    /api/admin/overview?month=&year=      (bulk target-vs-actual table)
PUT    /api/admin/review/:entryType/:entryId (manager sign-off)
```

### Permission Note
This means the agent-facing forms (Section 7) should pull their market dropdown and
read-only display of their own target/D/A/salary from `staffMonthlyConfig` rather
than letting staff set these values themselves. Only Manager/Admin roles can write
to `staffMonthlyConfig`.

---

## 8. PDF Export — Exact Replica Requirement

- Recreate each sheet's original grid layout in HTML/CSS 1:1 (same columns, same
  header fields: Name of Staff, Area, Region, Month/Year, Signature rows at bottom).
- Render via Puppeteer → PDF, one PDF per staff per month per sheet type.
- Include a signature line/section at the bottom matching the original ("Signature
  of MPO", "Signature of Manager") — populated with typed name + date unless drawn
  signatures are explicitly requested later.
- Should look close enough to the original that it could replace the paper copy
  in any audit/inspection.

---

## 9. Deployment (VPS)

- New service added via `docker-compose.yml`, joining the existing external
  Traefik network (`web`) — do not provision a new NGINX/Certbot stack.
- Add Traefik labels for host-based routing (e.g. `fieldsheets.yourdomain.com`)
  using the existing cert resolver.
- Services: `app` (Node/Express + React build served together, or split
  frontend/backend containers), `mongo` (with a named volume for persistence).
- Environment variables via `.env` (JWT secret, Mongo URI, PDF temp dir).

---

## 10. Open Questions to Confirm Before Building

1. **Mongo:** self-hosted container on the same VPS, or MongoDB Atlas?
2. **Signatures:** typed name + timestamp (simple) or drawn signature pad (more
   complex, needs canvas capture + image storage)?
3. **Sheet 2 "Total Amount":** confirm whether it should sum Daily Order or Daily
   Collection (or both, shown separately) against Target Amount.
4. **Backfill window:** how many days back should staff be allowed to submit/edit
   a missed entry before it locks?
5. **Number of staff/areas** expected at launch, to size out the admin/user
   management screens appropriately (a handful of staff vs. dozens changes how
   much user-management UI is worth building now vs. later).

---

## 11. Explicit Non-Goals (for this "mini" version)

- No inventory/stock management
- No SMS/WhatsApp notifications (can be a future n8n integration hook)
- No multi-language UI (assume English labels, Bangla data entry is fine as free text)
- No offline-first full PWA (simple retry-on-submit is enough for v1)
