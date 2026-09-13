# Apex Retail POS

**Apex Retail POS** is a full-stack retail management and point-of-sale application for grocery stores, mini marts, and other inventory-led retail businesses. It combines fast checkout, barcode-based product lookup, inventory and expiry control, supplier purchasing, reporting, audit trails, offline sale recovery, and an AI Retail Copilot in one responsive interface.

The project uses a React/Vite frontend with an Express API. Demo and local data are stored in `data/pos_db.json`, making it easy to run locally without provisioning a database.

## Highlights

- Fast POS checkout with product search, category filters, barcode lookup, item/cart discounts, tax calculation, held carts, and receipt export/sharing.
- Cash, card, bank transfer, digital-wallet, and split-payment workflows.
- Product catalogue with SKU, barcode, pricing, supplier, batch, stock threshold, and expiry details.
- Inventory protection: low-stock alerts, negative-stock prevention, expiry blocking, batch-aware stock deduction, adjustments, disposal, and stock-movement history.
- Purchase orders and receiving flow that updates inventory.
- Customers, suppliers, role-based navigation, store settings, notifications, dashboard, sales reporting, P&L-oriented analytics, and audit logs.
- Offline sale queue in browser storage with automatic/manual synchronization when connectivity returns.
- Gemini-powered AI Retail Copilot for conversational business intelligence, plus a local fallback when no Gemini key is configured.
- Responsive desktop and mobile POS layouts, native-camera barcode scanner, keyboard shortcuts (`F2` POS and `F4` scanner), themes, and optional sound effects.

## Technology

| Layer | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Motion, Lucide icons |
| Backend | Node.js, Express, TypeScript (`tsx`) |
| AI | Google Gen AI SDK / Gemini |
| Persistence | JSON file store at `data/pos_db.json` |
| Build | Vite + esbuild |

## Application flow

```text
Products / barcode / search
          |
          v
POS cart -> discounts + tax -> payment -> invoice / receipt
          |                                  |
          |                                  v
          |                          sale record + audit log
          v
stock validation (expired / available stock)
          |
          v
inventory deduction -> batch deduction -> stock movement -> low-stock notification

Offline browser? -> queue sale in localStorage -> reconnect -> /api/sync -> persist sale and stock movement
```

### Checkout workflow

1. The cashier finds a product by name, SKU, barcode, category, or the camera scanner.
2. The product is added to the cart. Item-level and cart-level discounts, tax, customer details, and sale notes can be applied.
3. Before a sale is saved, the server validates that each product exists, enforces the expired-product policy, and prevents insufficient stock unless the relevant settings allow otherwise.
4. On a successful payment, the API creates an invoice, saves the sale, deducts stock (including available batches), creates stock-movement records, updates customer spend/visit data, records an audit event, and raises a low-stock/out-of-stock notification where applicable.
5. The cashier can view, download, share, or print the completed receipt. Refunds can restock returned items and update the original sale status.

### Inventory and purchasing workflow

1. Admins and managers create products with pricing, supplier, barcode, batch, expiry date, and minimum/maximum stock thresholds.
2. The system calculates each product's `fresh`, `expiring_soon`, or `expired` status from its expiry date and configured warning days.
3. Staff can log stock adjustments and dispose of expired goods; each action is retained in stock movements and audit history.
4. Purchase orders are created for suppliers. Receiving an order adds stock, creates batches where applicable, and records the corresponding movement.

### Roles and access

Navigation is filtered by the selected user's role:

| Area | Admin | Manager | Cashier |
| --- | :---: | :---: | :---: |
| POS checkout and sales history | Yes | Yes | Yes |
| Dashboard, products, inventory, purchasing, directory, reports, settings | Yes | Yes | — |
| AI Retail Copilot | Yes | Yes | Yes |
| Audit log | Yes | — | — |

> The included authentication endpoint and role controls are suitable for a local/demo foundation. Before production use, add password hashing, real session/token verification, authorization middleware, validation, a production database, and secure secret management.

## AI Retail Copilot

The **AI Retail Intelligence & Copilot** screen accepts questions in natural language and presents automated risk/opportunity cards.

### What it can analyze

- Daily sales volume and recent transactions
- Low-stock products and reorder thresholds
- Expired and soon-to-expire inventory
- Product price, cost, category, and stock snapshots
- Top-selling product queries and general store summaries
- Stock-risk, expiry-risk, slow-moving stock, and cross-sell recommendations

### How AI data is handled

For a Gemini request, the server prepares a compact live-store summary: counts of products, sales, customers and suppliers; low-stock and expiry lists; the five most recent sales; and a sample of up to ten products. This summary, the staff role/name, and the user question are sent to Gemini. The configured model is `gemini-3.8-flash`.

If `GEMINI_API_KEY` is absent, or the Gemini request fails, the application still responds through its local heuristic engine. It supports sales-today, low-stock, expiry, and top-product queries without an external AI call; its response is labelled `local-heuristic` in the UI.

Example prompts:

- `What were today's net sales and profit?`
- `Which products are low in stock and need reordering?`
- `Which perishable items will expire soon?`
- `What are our best-selling products?`
- `Suggest pricing strategies for expiring items`

## Getting started

### Prerequisites

- Node.js 18 or later
- npm
- Optional: a Google Gemini API key for Gemini responses

### Install and run

```bash
git clone https://github.com/haroondhanyal/Appex_Retail_POS.git
cd Appex_Retail_POS
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL shown by the development server (normally `http://localhost:3000`). The Express server runs the Vite development middleware, so one command starts both the API and frontend.

### Environment variables

Create `.env.local` from `.env.example`. Never commit this file.

```env
GEMINI_API_KEY="your_google_gemini_api_key"
APP_URL="http://localhost:3000"
```

`GEMINI_API_KEY` is optional: omit it to use the local AI fallback. `APP_URL` is reserved for the deployed app URL and self-referential/OAuth-style use cases.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Express + Vite development server |
| `npm run lint` | Run TypeScript type checking without emitting files |
| `npm run build` | Build the frontend and bundle the production server into `dist/` |
| `npm run start` | Start the built server (`dist/server.cjs`) |
| `npm run preview` | Preview the Vite frontend build |

For a production-style local run:

```bash
npm run build
npm run start
```

## API overview

The backend exposes JSON REST endpoints under `/api`.

| Group | Main endpoints | Purpose |
| --- | --- | --- |
| Health & users | `GET /health`, `POST /auth/login`, `/users` | Health checks and user management |
| Products | `/products`, `GET /products/barcode/:barcode` | Product CRUD, thresholds, and barcode lookup |
| Sales | `/sales`, `POST /sales/:id/refund`, `POST /sync` | Checkout, refunds, and offline-sale synchronization |
| Inventory | `/inventory/movements`, `/inventory/adjustment`, `/inventory/expired/dispose` | Trace, adjust, and dispose inventory |
| Purchasing | `/purchases`, `PUT /purchases/:id/receive` | Create, receive, or remove purchase orders |
| CRM | `/customers`, `/suppliers` | Customer and supplier records |
| Operations | `/reports/dashboard`, `/notifications`, `/audit-logs`, `/settings` | Reporting, alerts, audit history, and configuration |
| AI | `POST /ai/query`, `GET /ai/insights` | Conversational AI and automated intelligence cards |

## Project structure

```text
.
├── src/
│   ├── components/          # POS, dashboard, inventory, reports, AI and UI views
│   ├── services/            # REST client, receipt utilities and sounds
│   ├── App.tsx              # Application state, navigation and orchestration
│   └── types.ts             # Shared TypeScript data contracts
├── data/pos_db.json         # Local seeded and persisted business data
├── server.ts                # Express API, JSON persistence and Gemini integration
├── .env.example             # Safe environment-variable template
└── vite.config.ts           # Frontend build configuration
```

## Data and deployment notes

- `data/pos_db.json` is a local file-backed data store. It is ideal for demos and development but is not appropriate for concurrent, multi-instance production deployment.
- The repository contains sample retail data. Treat it as demo data and replace it before using the system for a real store.
- Browser-side offline sales are stored in `localStorage` until `/api/sync` succeeds; clearing browser storage removes unsynchronized transactions.
- For production, replace the JSON store with a transactional database, add backups and migrations, place the app behind HTTPS, and implement full authentication/authorization and observability.

## License

No license file is currently included. Add an explicit license before distributing or using the project as an open-source product.
