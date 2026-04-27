# Laundry Order Management System

A full-stack **dry cleaning / laundry order** app: **Node.js + Express + MongoDB** API, **React** UI, **JWT** auth, and a **dashboard** with MongoDB aggregations.

---

## Table of contents

1. [Repository layout](#repository-layout)
2. [Tech stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Setup — backend (API)](#setup--backend-api)
5. [Setup — frontend](#setup--frontend)
6. [Environment variables](#environment-variables)
7. [API reference](#api-reference)
8. [Features implemented](#features-implemented)
9. [Scripts](#scripts)
10. [AI usage report](#ai-usage-report)
11. [Tradeoffs & future work](#tradeoffs--future-work)
12. [Demo & submission tips](#demo--submission-tips)

---

## Repository layout

```
Laundry/                          ← project root (this README)
├── package.json                  # API dependencies & scripts
├── .env.example                  # Copy to .env for the API (do not commit real secrets)
├── src/                          # Express API
│   ├── server.js
│   ├── app.js
│   ├── config/db.js              # MongoDB connection
│   ├── models/Order.js
│   ├── controllers/
│   ├── middleware/auth.js        # JWT verify
│   ├── routes/index.js
│   ├── aggregations/             # Dashboard $facet pipeline
│   └── utils/orderResponse.js
├── scripts/
│   └── clear-orders.js           # Optional: delete all orders (dev)
├── laundry-frontend/             # Create React App UI
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── App.js
│       ├── api/                  # axios client, auth, orders API
│       └── data/garmentCatalog.js
└── README.md
```

---

## Tech stack

| Layer        | Technology |
|-------------|------------|
| API         | Node.js 18+, Express 4, Mongoose 8 |
| Auth        | `jsonwebtoken` (Bearer tokens, 1h expiry) |
| Database    | MongoDB (Atlas or local) |
| UI          | React 19 (Create React App), Axios |
| IDs         | Business `orderId` (`ORD-` + UUID v4) |

---

## Prerequisites

- **Node.js** ≥ 18  
- **MongoDB** connection string (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))  
- **npm** (comes with Node)

---

## Setup — backend (API)

1. **Clone** this repository and open the **root** folder (`Laundry/`).

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment file**

   ```bash
   copy .env.example .env
   ```

   Edit `.env`:

   | Variable      | Description |
   |---------------|-------------|
   | `MONGO_URI`   | MongoDB connection string (required) |
   | `PORT`        | API port (default in example: `3000`; use any free port, e.g. `5001`) |
   | `JWT_SECRET`  | Long random string used to sign JWTs (required for login) |

4. **Run the API**

   ```bash
   npm run dev
   ```

   You should see: `MongoDB connected successfully` and `Laundry API listening on http://localhost:<PORT>`.

5. **Sanity check**

   - `GET http://localhost:<PORT>/health` → JSON with `ok: true`  
   - `POST /auth/login` with body `{"email":"admin@gmail.com","password":"123456"}` → returns a `token`

> **Security:** Never commit `.env` or real passwords. Rotate any credentials that were ever shared in chat or screenshots.

---

## Setup — frontend

1. **Open the UI folder**

   ```bash
   cd laundry-frontend
   ```

2. **Install**

   ```bash
   npm install
   ```

3. **Environment**

   ```bash
   copy .env.example .env
   ```

   Set **`REACT_APP_API_URL`** to match your API, including port, e.g.:

   ```env
   REACT_APP_API_URL=http://localhost:5001
   ```

4. **Run (development)**

   ```bash
   npm start
   ```

   Opens at [http://localhost:3000](http://localhost:3000) by default.

5. **Sign in** with the configured admin user (see [API reference](#api-reference)), then use dashboard, create order, and orders list.

6. **Production build** (optional)

   ```bash
   npm run build
   ```

---

## Environment variables

### API (`.env` in project root)

| Name          | Required | Description |
|---------------|----------|-------------|
| `MONGO_URI`   | Yes      | MongoDB URI |
| `PORT`        | No       | Falls back in code if omitted (see `src/server.js`) |
| `JWT_SECRET`  | Yes      | Secret for signing JWTs |

### Frontend (`laundry-frontend/.env`)

| Name                  | Required | Description |
|-----------------------|----------|-------------|
| `REACT_APP_API_URL`  | No*      | Base URL of API; defaults in code if unset — **must match API port** |

\*Required in practice so the browser calls the correct host/port (avoid 404 / CORS confusion).

---

## API reference

**Base URL:** `http://localhost:<PORT>` (example: `5001`)

### Auth (hardcoded demo user)

| Method | Path           | Auth   | Body |
|--------|----------------|--------|------|
| POST   | `/auth/login`  | None   | `{"email":"admin@gmail.com","password":"123456"}` |

Response includes `token`, `tokenType: "Bearer"`, `expiresIn` (seconds).  
Use header on protected routes: `Authorization: Bearer <token>`

### Public

| Method | Path        | Description |
|--------|-------------|-------------|
| GET    | `/health`   | Liveness + hints |
| GET    | `/orders/:id` | Get one order (by Mongo `_id` or `orderId`) |
| PUT    | `/orders/:id` | Full update order |
| DELETE | `/orders/:id` | Delete order |

### Protected (require JWT)

| Method | Path                      | Description |
|--------|---------------------------|-------------|
| GET    | `/dashboard`              | Totals + counts per status |
| GET    | `/orders`                 | List orders; `?status=&search=` (name, phone, or garment `type`) |
| POST   | `/orders`                 | Create order |
| PUT    | `/orders/:orderId/status` | Update status (lookup by **business** `orderId`) |

**Order status values:** `RECEIVED` → `PROCESSING` → `READY` → `DELIVERED`

**Phone field:** `phone` must end up as **exactly 10 digits** (stored value is `^\d{10}$`). Non-digits are stripped; if more than 10 digits are present (e.g. pasted with a `91` country code), the **last 10** digits are used. The create-order field only accepts numeric input and holds at most 10 characters after this normalization.

**Create order body (example):**

```json
{
  "customerName": "Jane Doe",
  "phone": "9876543210",
  "garments": [
    { "type": "Shirt", "quantity": 2, "price": 5.5 }
  ]
}
```

`totalAmount` is computed server-side from garments. `estimatedDeliveryDate` is set on create (and when `garments` change on update) to **today + N calendar days**, where **N = 1 + floor(total garment quantity ÷ 3)** — base **1 day**, plus **1 day for every full 3 items** (quantities summed across all lines).

---

## Features implemented

- **Orders:** Create, list (with `status` + `search` on customer name, phone, or garment type), get by id, full update, delete, status update by `orderId`
- **Phone:** 10-digit mobile only (UI blocks non-digits; API + Mongoose enforce `^\d{10}$` on create and full update)
- **Est. delivery:** `estimatedDeliveryDate` = order date + **1 + floor(total quantity ÷ 3)** days (base 1 day + 1 day per 3 items); set on create and when line items are updated
- **Billing:** `totalAmount` = sum of `quantity × price` per line (validated + Mongoose pre-validate)
- **Dashboard:** MongoDB **aggregation** (`$facet`) — total orders, total revenue, counts per status
- **Auth:** JWT login + middleware on protected routes; React stores token and sends `Authorization` header
- **UI:** Dashboard, create order (garment catalog + “Other”, line totals), order list with status actions, search, est. delivery (from quantity-based rule; see below), status color badges
- **Utilities:** `npm run clear-orders` to wipe all orders in DB (development)

---

## Scripts

| Where        | Command              | Purpose |
|--------------|----------------------|---------|
| API root     | `npm run dev`        | API with file watch |
| API root     | `npm start`         | API without watch |
| API root     | `npm run clear-orders` | Delete all `Order` documents |
| `laundry-frontend` | `npm start`  | React dev server |
| `laundry-frontend` | `npm run build` | Production build |

---

## AI usage report

This project was built **iteratively** with help from **AI coding tools** (e.g. **Cursor** with an embedded model, and general guidance similar to **ChatGPT**-style assistants). The goal was speed, clarity, and learning—not paste-and-submit.

### How AI was used

- **Scaffolding:** Express app structure, Mongoose `Order` schema, route files, and React `App.js` layout.
- **Refactors:** Moving aggregation into `src/aggregations/`, response helpers to strip `__v` / `_id` on list, axios client + `REACT_APP_API_URL`.
- **Debugging:** Explaining 404 on `/auth/login` (stale server / wrong port), PostCSS “Unexpected `}`” in `App.css` (missing `.actions {` block), and MongoDB connection issues in sandboxed environments.
- **Features:** JWT auth flow, garment dropdown + line totals, debounced search (name / phone / garment type), 10-digit phone validation in the form and API, `POST /auth/login` + protected routes.

### Example prompts (paraphrased)

- *“Add JWT auth: `POST /auth/login`, hardcoded user, `verifyToken` middleware, protect GET `/orders`, POST `/orders`, GET `/dashboard`, PUT `…/status`.”*
- *“Add a React UI with axios to localhost:5000 — dashboard, orders, create form, status buttons.”*
- *“Add garment dropdown with 10+ items, ‘Other’ with manual name, default price with editable field.”*
- *“Fix CSS build error — Unexpected `}` in App.css.”*

### What AI got wrong or what needed manual fix

- **TypeScript in `.js`:** Early model code sometimes used TS-only syntax (e.g. `as const`); **removed** for valid JavaScript.
- **Env naming:** Mix of `MONGODB_URI` vs `MONGO_URI` — **standardized** to `MONGO_URI` in `config/db.js` and docs.
- **Port mismatch:** Frontend default `5000` vs API on `5001` → **documented** and **`.env`** on the frontend to match the API.
- **Stale API process:** 404 on new routes until **restarting** Node after adding files — a **runtime** issue, not a code typo.
- **Orphan CSS:** A deleted `.actions` block left stray rules → **restored** `.actions { ... }` so PostCSS/CRA compiles.

### What I improved or owned myself

- **Assignment alignment:** Stuck to “simple API + simple UI” — avoided unnecessary microservices and heavy UI frameworks.
- **Single source of truth** for `totalAmount` in Mongoose `pre("validate")`.
- **Security awareness:** Emphasize not committing `.env`, rotating exposed Atlas passwords, and using a strong `JWT_SECRET` in production.
- **README** (this file) and runbook-style instructions for evaluators and teammates.

---

## Tradeoffs & future work

| Area | What we skipped / simplified | With more time |
|------|------------------------------|----------------|
| Phone | Fixed 10-digit local format (no `+91` / E.164 in UI) | Country picker, international validation (`libphonenumber`) |
| Users | One hardcoded admin | User model, hashed passwords, refresh tokens |
| Search | `?search=` matches name, phone, or garment `type` (regex, case-insensitive) | Separate `garmentType` param, full-text index, or “starts with” only |
| Deploy | Local / manual | **Bonus:** API on Render/Railway, frontend on Vercel/Netlify |
| Tests | None for time | Jest for API, React Testing Library for forms |
| API docs | This README | OpenAPI / Swagger |
| i18n | English only | Locales, currency beyond “rs” display string |

---

## Demo & submission tips

1. **Record or screenshot:** login → create order → list → change status → dashboard numbers updating.  
2. **Postman / Thunder Client:** import base URL, save `POST /auth/login`, use **Bearer** token in folder auth for other requests.  
3. **Public repo:** Push to GitHub; add **only** `.env.example`, not `.env`.  
4. **AI report:** If your school wants a **separate PDF**, copy the [AI usage report](#ai-usage-report) section and add your own **exact** prompts from chat history.

---

## License

Use for **education / portfolio** unless you add your own license.

---

**Author note:** Fill in your name, university, and submission link in the repository description on GitHub when you hand it in.
