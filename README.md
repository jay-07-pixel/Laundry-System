# Laundry Order Management System (AI-First Assignment)

**Mini laundry / dry cleaning order system** — create orders, track status, calculate billing, and view a basic dashboard. Built with **Node.js + Express + MongoDB** (API), **React** (UI), **JWT** auth, and **MongoDB aggregations** for dashboard stats.

This README follows the assignment deliverables: **setup**, **features**, **AI usage report**, **tradeoffs**, plus **live demo**, **demo video**, and **repository** links.

---

## Quick links (submission)

| Deliverable | Link |
|-------------|------|
| **Live website (frontend)** | [https://laundry-system-i4sd-5xfio60fg-jay-jobanputras-projects.vercel.app/](https://laundry-system-i4sd-5xfio60fg-jay-jobanputras-projects.vercel.app/) |
| **Demo video (screen recording)** | [Google Drive — LAUNDRY.mp4](https://drive.google.com/file/d/1bscDtx76npbX_naXF-tYKvcuOPAgHZJf/view?usp=sharing) |
| **Public GitHub repository** | [github.com/jay-07-pixel/Laundry-System](https://github.com/jay-07-pixel/Laundry-System) |

**API (hosted):** The React app is configured to call a deployed backend (e.g. **Render**) for real data. For local development, point `REACT_APP_API_URL` at your own API (see [Setup — frontend](#setup--frontend)).

**Demo login (API):** `admin@gmail.com` / `123456` (hardcoded demo user; not for production.)

---

## Table of contents

1. [Assignment alignment](#assignment-alignment)
2. [Live app & demo](#live-app--demo)
3. [Repository layout](#repository-layout)
4. [Tech stack](#tech-stack)
5. [Prerequisites](#prerequisites)
6. [Setup — backend (API)](#setup--backend-api)
7. [Setup — frontend](#setup--frontend)
8. [Environment variables](#environment-variables)
9. [API reference](#api-reference)
10. [Features implemented (checklist)](#features-implemented-checklist)
11. [Bonus / stretch features](#bonus--stretch-features)
12. [Scripts](#scripts)
13. [AI usage report](#ai-usage-report)
14. [Tradeoffs & future work](#tradeoffs--future-work)
15. [What evaluators asked for (mapping)](#what-evaluators-asked-for-mapping)
16. [Author & license](#author--license)

---

## Assignment alignment

| Assignment requirement | How this project addresses it |
|------------------------|--------------------------------|
| **Create orders** | Customer name, **10-digit phone**, garment lines (type, quantity, price), **unique `orderId`**, **total bill** from server |
| **Order status** | `RECEIVED` → `PROCESSING` → `READY` → `DELIVERED`; update via API + UI |
| **List / filter** | List orders; filter by **status**; **search** by name, phone, or **garment type** |
| **Dashboard** | **Total orders**, **total revenue**, **count per status** (MongoDB `$facet`) |
| **AI tools** | Heavy use of **Cursor** (and similar assistants) to scaffold, debug, and iterate; report below |
| **Deliverables** | Public **GitHub**, this **README**, **UI** + optional Postman, **video** on Drive, **deployed** app |

**Time / scope:** Kept to a **small, working** system: one admin login, one `Order` model, one React screen — no extra microservices or heavy abstractions (per assignment hint).

---

## Live app & demo

### Live website (Vercel)

- **URL:** [https://laundry-system-i4sd-5xfio60fg-jay-jobanputras-projects.vercel.app/](https://laundry-system-i4sd-5xfio60fg-jay-jobanputras-projects.vercel.app/)
- **What to try:** Sign in → dashboard totals → create order (garments, line totals) → orders list (search, status buttons, estimated delivery) → refresh to see dashboard update.

**Note:** Vercel **preview** deployments sometimes protect routes; if `manifest.json` returns **401** in the console, that is usually **Vercel Deployment Protection** on that URL, not the app’s JWT. Use the **production** deployment or adjust protection in [Vercel project settings](https://vercel.com/docs/deployment-protection) if you need a fully public static manifest.

### Demo video

- **URL:** [https://drive.google.com/file/d/1bscDtx76npbX_naXF-tYKvcuOPAgHZJf/view?usp=sharing](https://drive.google.com/file/d/1bscDtx76npbX_naXF-tYKvcuOPAgHZJf/view?usp=sharing)  
- **File name:** `LAUNDRY.mp4` (Google Drive)  
- Suggested content for reviewers: sign-in, create order, list orders, change status, dashboard numbers, and (optionally) a quick API or Postman shot.

### API testing (Postman / Thunder Client)

1. `POST` `{API_URL}/auth/login` with `{"email":"admin@gmail.com","password":"123456"}`  
2. Copy `token` → **Authorization: Bearer &lt;token&gt;**  
3. Call `GET /dashboard`, `GET /orders`, `POST /orders`, etc.

---

## Repository layout

```
Laundry/                          ← project root (this README)
├── package.json                  # API dependencies & scripts
├── .env.example                  # Copy to .env (never commit real secrets)
├── .gitignore                    # Excludes .env, node_modules, build output
├── src/                          # Express API
│   ├── server.js
│   ├── app.js                    # CORS, JSON, routes, 404
│   ├── config/db.js
│   ├── models/Order.js
│   ├── controllers/
│   ├── middleware/auth.js
│   ├── routes/index.js
│   ├── aggregations/             # Dashboard $facet
│   └── utils/orderResponse.js
├── scripts/
│   └── clear-orders.js
├── laundry-frontend/             # Create React App
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── App.js
│       ├── api/                 # axios client (retries, JWT), orders, auth
│       └── data/garmentCatalog.js
└── README.md
```

---

## Tech stack

| Layer | Technology |
|-------|------------|
| API | Node.js 18+, Express 4, Mongoose 8 |
| Auth | `jsonwebtoken` (Bearer, ~1h expiry) |
| Database | MongoDB (Atlas or local) |
| UI | React 19 (Create React App), Axios |
| IDs | Business `orderId` (`ORD-` + UUID v4) |
| Deploy (typical) | **Frontend: Vercel** · **Backend: Render** (or your own host) |

---

## Prerequisites

- **Node.js** ≥ 18  
- **MongoDB** ([Atlas](https://www.mongodb.com/cloud/atlas) or local)  
- **npm**

---

## Setup — backend (API)

1. **Clone** the [GitHub repository](https://github.com/jay-07-pixel/Laundry-System) and open the **root** folder.

2. **Install**

   ```bash
   npm install
   ```

3. **Environment**

   ```bash
   copy .env.example .env
   ```

   | Variable | Description |
   |----------|-------------|
   | `MONGO_URI` | Required — connection string |
   | `PORT` | Optional (see `src/server.js`) |
   | `JWT_SECRET` | Required for login tokens |

4. **Run**

   ```bash
   npm run dev
   ```

5. **Checks**  
   - `GET /health` → `{ ok: true, ... }`  
   - `POST /auth/login` with the demo user → `token` in body  

> **Security:** Do not commit `.env`. Rotate Atlas / JWT if they were ever exposed.

---

## Setup — frontend

1. `cd laundry-frontend`

2. `npm install`

3. `copy .env.example .env` and set:

   ```env
   REACT_APP_API_URL=http://localhost:5001
   ```

   Use the **same port** as the API, or your **deployed** API base URL (no trailing slash).

4. `npm start` → [http://localhost:3000](http://localhost:3000)

5. `npm run build` for a production static build (e.g. Vercel).

---

## Environment variables

### API (`.env` in project root)

| Name | Required | Description |
|------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB URI |
| `PORT` | No | Server port |
| `JWT_SECRET` | Yes | Secret for signing JWTs |

### Frontend (`laundry-frontend/.env`)

| Name | Description |
|------|-------------|
| `REACT_APP_API_URL` | Base URL of the API (required for real calls) |

---

## API reference

**Local base URL example:** `http://localhost:5001`

### Auth (demo user)

`POST /auth/login`  
Body: `{"email":"admin@gmail.com","password":"123456"}`

### Public (no JWT)

- `GET /health`  
- `GET|PUT|DELETE /orders/:id` (as implemented)

### Protected (Bearer token)

- `GET /dashboard`  
- `GET /orders?status=&search=` (search: name, phone, or garment `type`)  
- `POST /orders`  
- `PUT /orders/:orderId/status` (by business `orderId`)

**Statuses:** `RECEIVED` · `PROCESSING` · `READY` · `DELIVERED`

**Phone:** stored as **exactly 10 digits**; non-digits stripped; if more than 10 digits, **last 10** used (e.g. pasted with country code).

**Create order (example):**

```json
{
  "customerName": "Jane Doe",
  "phone": "9876543210",
  "garments": [
    { "type": "Shirt", "quantity": 2, "price": 5.5 }
  ]
}
```

- **`totalAmount`:** sum of `quantity × price` per line (Mongoose pre-validate).  
- **`estimatedDeliveryDate`:** `today + N` calendar days, `N = 1 + floor(total garment quantity ÷ 3)` (base 1 day + 1 day per 3 items). Recalculated when garments change on full update.

---

## Features implemented (checklist)

| Feature | Status |
|--------|--------|
| Create order: name, phone, garments, qty, price | Yes |
| Total bill + unique `orderId` | Yes |
| Status workflow + update (API + UI) | Yes |
| List orders + filter by status + search | Yes |
| Dashboard: total orders, revenue, per-status counts | Yes |
| **Bonus:** React UI | Yes |
| **Bonus:** Auth (JWT) | Yes |
| **Bonus:** MongoDB | Yes |
| **Bonus:** Search by garment type (via `?search=`) | Yes |
| **Bonus:** Estimated delivery date | Yes |
| **Bonus:** Deploy (e.g. Vercel + Render) | Yes (see [Quick links](#quick-links-submission)) |
| CORS for API | Configured (all origins in dev/deploy-friendly way) |
| Resilience | Axios **retries** (cold start) + optional **GET /health** wake on load for hosted API |

**UX details:** Garment **catalog** + “Other”, line totals on create, order list line subtotals (`price × qty`), status badges, debounced search, 10-digit phone input, “waking up server” message during API retries when the host is slow to respond.

---

## Bonus / stretch features

- **Deployment:** Vercel (frontend) + hosted Node API (e.g. Render) — see [Quick links](#quick-links-submission).  
- **Render cold start:** `fetch` to `/health` on app load (non-blocking) + **global axios retries** (up to 3, 2s delay) with user-facing **“Waking up server, please wait…”** during retries.  
- **DB script:** `npm run clear-orders` to clear orders in development.

---

## Scripts

| Location | Command | Purpose |
|----------|---------|--------|
| API root | `npm run dev` | API with watch |
| API root | `npm start` | API |
| API root | `npm run clear-orders` | Delete all orders (dev) |
| `laundry-frontend` | `npm start` | React dev |
| `laundry-frontend` | `npm run build` | Production build |

---

## AI usage report

**Tools used:** **Cursor** (in-editor AI for code and refactors) and the same class of **ChatGPT-style** assistants for debugging and design questions. The workflow matched the assignment: **scaffold fast → run → fix AI mistakes → keep scope small**.

### Where AI helped

- Express **folder structure**, Mongoose `Order` schema, **routes/controllers**, and **React** single-app layout.  
- **JWT** `POST /auth/login` + `verifyToken` on protected routes.  
- **Dashboard** aggregation with `$facet`.  
- **React:** axios client, **debounced** search, garment **dropdown** + “Other”, line totals, status UI.  
- **Debugging:** 404 on `/auth/login` (wrong process / port), **PostCSS** error from broken `App.css` block, CORS, **Mongo** connection issues.  
- **Nice-to-haves:** CORS, **axios retry** for Render cold start, health **wake** request, EDD formula, 10-digit phone, search including **garment type**, README structure.

### Sample prompts (paraphrased)

- *“Laundry order API: CRUD-style orders, `orderId`, totals from garments, status enum, MongoDB.”*  
- *“Add JWT: hardcoded user, protect dashboard, list/create orders, status update by `orderId`.”*  
- *“React UI: login, dashboard, create order, orders list, status buttons, axios to API.”*  
- *“Search by status and name/phone; later extend search to garment type.”*  
- *“Global axios retry with 2s delay and a ‘waking up server’ message for Render.”*  
- *“Estimated delivery: base 1 day + 1 day per 3 total garments.”*

### What AI got wrong (and what I fixed)

- **TypeScript in `.js` files** (e.g. `as const`) — removed for valid JavaScript.  
- Inconsistent **env** names (`MONGODB_URI` vs `MONGO_URI`) — standardized.  
- **Port drift** (5000 vs 5001) — aligned `.env` and docs.  
- **Stale Node process** after route changes — restart server (operational, not a code bug).  
- **Broken CSS** (orphan `}`) — fixed `.actions` / structure so CRA builds.  
- **README / deployment** — iterated until links, security notes, and assignment sections were clear.

### Ownership (beyond copy-paste)

- Chose **one** admin user and **one** order model (no over-engineering).  
- **Single source of truth** for `totalAmount` in Mongoose.  
- **Validation** (phone, garments) on both client and server.  
- **Polished enough** for a demo: retries, EDD rule, subtotals, badges — without a huge design system.

---

## Tradeoffs & future work

| Area | Simplified for the assignment | With more time |
|------|---------------------------------|----------------|
| **Users** | One hardcoded admin | User model, bcrypt, refresh tokens |
| **Phone** | 10-digit India-style | `libphonenumber` / country select |
| **Search** | One `search` param (name / phone / garment) | Dedicated filters, text indexes |
| **Tests** | None in repo | Jest (API) + React Testing Library |
| **API docs** | This README | OpenAPI / Swagger |
| **PWA** | Not a focus | Fix `manifest` 401 on protected Vercel previews or ship `manifest` from an unprotected path |
| **i18n** | English + “rs” display | Full localization |

---

## What evaluators asked for (mapping)

| Evaluation criterion | Evidence in this project |
|----------------------|---------------------------|
| **Speed & execution** | Working end-to-end path: API + DB + UI + deploy links |
| **AI leverage** | [AI usage report](#ai-usage-report) with tools, prompts, mistakes, fixes |
| **Problem solving** | Port/CORS/Render cold start/validation/CSS/build issues addressed in code and docs |
| **Code quality (practical)** | Readable files, no unnecessary layers, clear `Order` model and routes |
| **Ownership** | Extras: JWT, MongoDB, search, EDD, deploy, video, README, resilience (retries + wake) |

**What we avoided (per brief):** huge UI frameworks, microservices, unnecessary abstractions.

---

## Author & license

- **Repository:** [github.com/jay-07-pixel/Laundry-System](https://github.com/jay-07-pixel/Laundry-System)  
- **Live app:** [Vercel](https://laundry-system-i4sd-5xfio60fg-jay-jobanputras-projects.vercel.app/)  
- **Demo video:** [Google Drive — LAUNDRY.mp4](https://drive.google.com/file/d/1bscDtx76npbX_naXF-tYKvcuOPAgHZJf/view?usp=sharing)  

Use for **education / portfolio** unless you add your own license. Add your **name** and **course / submission ID** in the GitHub repository description when you submit.
