# Apex Retail POS

**Apex Retail POS** is a full-stack retail management and point-of-sale application for grocery stores, mini marts, and other inventory-led retail businesses. It combines fast checkout, barcode-based product lookup, inventory and expiry control, supplier purchasing, reporting, audit trails, offline sale recovery, and an AI Retail Copilot in one responsive interface.

The project uses a React/Vite frontend with an Express API. Demo and local data are stored in `data/pos_db.json`, making it easy to run locally without provisioning a database.

## Highlights

- Fast POS checkout with product search, category filters, barcode lookup, item/cart discounts, tax calculation, held carts, receipt export/sharing, and receipt-only print/PDF output.
- Receipt printing supports 80mm thermal slips and a branded A4 tax-invoice layout with an Apex Retail mark, subtle watermark, customer details, totals, and a personalised thank-you note.
- Cash, card, bank transfer, digital-wallet, and split-payment workflows.
- Product catalogue with SKU, barcode, pricing, supplier, batch, stock threshold, and expiry details.
- Inventory protection: low-stock alerts, negative-stock prevention, expiry blocking, batch-aware stock deduction, adjustments, disposal, and stock-movement history.
- Purchase orders and receiving flow that updates inventory.
- Customer and supplier directory with profile pictures, camera/file upload, searchable customer types, delivery/corporate/wholesale details, and edit/remove controls.
- Role-based portals for admin, manager, warehouse manager, cashier, salesperson, and sales agent.
- Offline sale queue in browser storage with automatic/manual synchronization when connectivity returns.
- Private, local-first AI Retail Copilot for conversational business intelligence; Gemini is an opt-in provider only.
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

### Global online/offline mode

The header has a global status switch available from every portal:

- **Online** fetches current server data and automatically synchronizes queued POS sales when a connection is restored.
- **Offline (Manual)** lets a user deliberately continue in local POS mode even while the device still has a network connection. Toggle the red badge back to Online to synchronize.
- Offline sales are retained in browser `localStorage`, receive an offline invoice ID, can still be receipted/printed, and reduce the displayed local stock. Products and customers are read from the most recently cached data.
- The header displays pending transaction count and the last successful synchronization time. The server sync endpoint ignores duplicate sale IDs/invoice numbers before applying inventory movements.

Only supported POS sales are queued offline in this demo; administration, refunds, purchasing, profile changes, and other server-managed writes require Online mode.

### Checkout workflow

1. The cashier finds a product by name, SKU, barcode, category, or the camera scanner.
2. The product is added to the cart. Item-level and cart-level discounts, tax, customer details, and sale notes can be applied.
3. Before a sale is saved, the server validates that each product exists, enforces the expired-product policy, and prevents insufficient stock unless the relevant settings allow otherwise.
4. On a successful payment, the API creates an invoice, saves the sale, deducts stock (including available batches), creates stock-movement records, updates customer spend/visit data, records an audit event, and raises a low-stock/out-of-stock notification where applicable.
5. The cashier can view, download, share, or select **Print / Save PDF** for the completed receipt. Printing opens a receipt-only document; in Chrome, choose **Save to PDF** in the native print dialog. Refunds can restock returned items and update the original sale status.

### Inventory and purchasing workflow

1. Admins and managers create products with pricing, supplier, barcode, batch, expiry date, and minimum/maximum stock thresholds.
2. The system calculates each product's `fresh`, `expiring_soon`, or `expired` status from its expiry date and configured warning days.
3. Staff can log stock adjustments and dispose of expired goods; each action is retained in stock movements and audit history.
4. Purchase orders are created for suppliers. Receiving an order adds stock, creates batches where applicable, and records the corresponding movement.

### Suppliers and vendors

The **Directory** screen includes a working **Suppliers & Vendors** tab. Each vendor shows company/contact details, phone, email, address, supplied categories, and outstanding payable balance. Admins and managers can add supplier partners with all of these details; they then become available when creating inbound purchase orders.

### Roles and access

Each account opens a role-specific portal. Navigation is filtered by the selected user's role:

| Portal | Main responsibilities | Access |
| --- | --- | --- |
| Admin | Full store control, staff accounts, role assignment, activation/deactivation, removal, audit logs, settings, reporting, inventory, and POS | All modules |
| Manager | Day-to-day store operations, products, inventory, purchasing, customers, sales, reporting, and POS | All operational modules; no staff-account control or audit log |
| Warehouse Manager | Check product stock, expiry status, stock movements, adjustments, and disposal | Warehouse Stock Control only |
| Cashier | Scan items, process checkout, manage own sales/receipts, and use the AI Copilot | POS, Sales & Receipts, AI Copilot |
| Salesperson / POS Assistant | Help customers at the counter, process sales, reprint their own receipts, and use the AI Copilot | POS, own Sales & Receipts, AI Copilot |
| Sales Agent | Assist customers with product discovery and counter sales, then access only their own receipts | POS, own Sales & Receipts, AI Copilot |

### Staff-account workflow

1. An admin opens **Admin & Staff Control**.
2. Choose a portal card (Cashier, Salesperson, Sales Agent, Manager, Warehouse, or Admin) to start a role-preselected staff account, or select **Add Staff User**.
3. Enter the name, username, email/phone, and portal role. The role selector explains the access the new staff member will receive.
4. The account appears in the staff table and can be switched to from the header in this local/demo build.
5. Admins can activate/deactivate staff access or permanently remove an account. The system prevents removal of the final active admin.
6. When a user switches portal, the app automatically opens their default workspace: warehouse managers open stock control; cashiers, salespeople, and sales agents open POS; managers/admins open the dashboard.

Restricted portal views are guarded in the app: a cashier, salesperson, or sales agent cannot navigate to admin, warehouse, reporting, product, or staff-management screens; their sales ledger also filters to invoices created under their own staff ID. Refund controls are available only to admin and manager portals.

Admins can edit any staff profile from the staff table, including role, contact details, and profile picture. Images can be captured with a camera or uploaded from a device; uploaded images are compressed in the browser and can be removed to return the account to its default avatar. The active portal session can be started/ended from either the header account menu or the sidebar **Login/Logout** control.

### Customer and supplier profile images

Managers and admins can add or edit an optional customer or supplier picture from **Directory**. The image control supports camera capture and image-file upload, compresses the image in the browser, and shows the saved image on the directory card. Customer records can also be classified as walk-in, registered, online, corporate, wholesale, or delivery; the selected type exposes the relevant delivery, tax, credit, or bulk-pricing fields.

Dashboard KPI cards and AI insight cards are interactive: selecting a card opens its related sales, report, product, or warehouse workspace. Use **Refresh AI Insights** to reload the latest local analytics.

### Staff portal login and activity tracking

1. From the header's **Switch Cashier / Role Account** menu, select **Login** beside an active staff account. The portal changes to that staff member's permitted workspace and the time tracker starts.
2. The header shows the current session's login time. Selecting another staff account automatically ends the previous portal session; **Logout** ends the active tracker manually.
3. In **Admin & Staff Control**, select the blue detail icon beside any user to view their recent login/logout sessions, current logged-in state, POS sales, and audit activity.
4. The admin audit log also records `PORTAL_LOGIN`, `PORTAL_LOGOUT`, checkout, refund, stock, and management events.

> The included authentication endpoint and role controls are suitable for a local/demo foundation. Before production use, add password hashing, real session/token verification, authorization middleware, validation, a production database, and secure secret management.

## AI Retail Intelligence Copilot

The **AI Retail Intelligence Copilot** screen combines a natural-language assistant with four practical, clickable action cards. Its subtitle is: *Smart insights and proactive recommendations for your retail business*.

### Recommended action cards

| AI insight | Opens | Purpose |
| --- | --- | --- |
| 🔴 Immediate Stock Replenishment | Inventory | Low/out-of-stock items requiring immediate purchase |
| 🟠 Perishable Inventory Expiry Warning | Inventory → Expiry | Items approaching expiry that need clearance or disposal planning |
| 🟡 Slow-Moving / Unsold Inventory | Inventory → Stock Insights | Items with low or no sales that need a pricing or display review |
| 🟢 Beverage & Snack Cross-Selling Potential | Sales → AI Recommendations | Product combinations that can increase basket value |

Each card is always visible. It shows live local analysis when available, otherwise a clear no-risk/review message, and takes the user directly to the relevant workspace.

### Next-generation AI operating flow

The Copilot is an action-assisted operating workspace, not only a reporting screen. It uses the same product, sales, purchase, customer, inventory, notification, and audit data used by the POS.

| Capability | What it does | Control |
| --- | --- | --- |
| Daily AI Business Briefing | Summarises yesterday's sales, replenishment, expiry risk, slow-moving stock, and cross-sell opportunities. | Read-only insight |
| Demand Forecast | Estimates 14-day product demand, stockout timing, recommended reorder quantity, and confidence from recorded sales and stock data. | Recommendation only |
| AI Replenishment Action | Converts low-stock forecast recommendations into a pending purchase-order action. | Admin/manager must select **Approve & Execute**; resulting PO and action are audited |
| Inventory Intelligence | Highlights replenishment, expiry, slow-moving/unsold stock, and cross-selling opportunities. | Opens the relevant operational workspace |
| AI Risk & Anomaly Center | Presents refund and large inventory-adjustment patterns as review indicators, never as accusations. | Human review required |
| Cross-selling | Identifies beverage/snack basket opportunities through the existing local rules engine. | Recommendation only |

AI safety follows a strict workflow for sensitive operations:

```text
AI recommendation → human confirmation → execution → audit log
```

The AI cannot silently create a purchase order, change a price, refund a sale, adjust stock, or alter account permissions. The implemented replenishment action creates an **ordered** PO only after confirmation; receiving it remains the normal purchasing workflow and is what updates stock.

### Unified retail records

POS sales, online/delivery customer fields, purchase orders, suppliers, stock movements, loyalty points, notifications, offline sale sync, receipt history, and audit events share the local JSON data store. Customer profiles support walk-in, registered, online, corporate, wholesale, and delivery flows. Delivery/customer order references are retained with the sale record, keeping checkout, customer history, payment, and inventory activity synchronized.

## Authentication and account approval

The application uses a role-checked sign-in flow:

1. On the **Retail POS** login screen, select **Login As** before entering an email/username and password.
2. The server validates the credentials, account status, and the selected role against the role actually approved for that account. Selecting a role never grants extra permissions.
3. New staff use **Create Account** to submit a request with their personal details, requested role, optional address, and optional camera/file profile picture. Requests start as **Pending Admin Approval** and receive an `AR-` request ID.
4. An admin opens **Admin & Staff Control** and selects **Approve** beside a pending account. Only then can that staff member sign in to their role portal.
5. Pending, rejected, and inactive accounts are denied login with a clear status message. **Remember me** saves only the email/username in the browser; it never saves a password.

### Role-first signup and password reset

- The login page uses a prominent **Login As** selector with icons for Admin, Manager, Cashier, Sales Person, Sales Agent, and Inventory Agent. The selected role is verified by the server against the role approved for the account.
- **Create Account** begins with an icon-based **Select Your Role** panel. Users can request Manager, Cashier, Sales Person, Sales Agent, or Inventory Agent access; Admin cannot be requested through signup.
- The user then completes their details, optional profile picture and address, and password. The submitted request stays pending until an admin approves it in **Admin & Staff Control**.
- Selecting **Forgot password?** submits a reset request to the administrator. Admin & Staff Control contains **Password Reset Requests**, where an admin can set a new password for the requesting user.

Development Super Admin credentials:

```text
Login As: Admin
Email: rajaharoon320@gmail.com
Password: 12345678
```

This local/demo authentication implementation uses a SHA-256 password hash. Production deployments should use a dedicated identity provider or a modern salted password-hashing algorithm, secure sessions, rate limiting, and authorization middleware.

### What it can analyze

- Daily sales volume and recent transactions
- Low-stock products and reorder thresholds
- Expired and soon-to-expire inventory
- Product price, cost, category, and stock snapshots
- Top-selling product queries and general store summaries
- Stock-risk, expiry-risk, slow-moving stock, and cross-sell recommendations

### How AI data is handled

By default, `AI_MODE="local"` runs the built-in `local-rules-v1` engine entirely in the Express server. No store data leaves the application. It calculates sales and estimated gross profit from recorded line totals and costs, ranks cashiers and top-selling products, identifies stock/expiry risks, and gives markdown guidance for expiring products.

Gemini is optional. Set `AI_MODE="gemini"` (or `"auto"`) and provide `GEMINI_API_KEY` only if you explicitly want external Gemini responses. In that mode, the server sends a compact store summary—counts, low-stock/expiry lists, recent sales, a product sample, staff role/name, and the question—to Gemini. If it is unavailable, the local engine is used automatically.

Example prompts:

- `What were today's net sales and profit?`
- `Which products are low in stock and need reordering?`
- `Which perishable items will expire soon?`
- `What are our best-selling products?`
- `Suggest pricing strategies for expiring items`

## Getting started

### Demo sign-in and signup

The app opens on a dedicated sign-in screen. The seeded demo administrator is:

```text
Email: rajaharoon320@gmail.com
Password: 12345678
```

Use **Sign up** to submit a manager, warehouse manager, cashier, salesperson, or sales-agent account request. New accounts are inactive by default; an administrator activates them from **Admin & Staff Control** before they can sign in. Staff can sign in using either their email or username, and Logout ends the tracked portal session before returning to the sign-in screen.

> These credentials and the SHA-256 password storage are for local/demo use only. Before deployment, replace them with an authentication provider or a production password system using salted, adaptive hashes, secure tokens/cookies, rate limits, and password-reset verification.

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
AI_MODE="local"
GEMINI_API_KEY=""
APP_URL="http://localhost:3000"
```

Keep `AI_MODE="local"` for private, on-server analytics. To use Gemini, set `AI_MODE="gemini"` or `AI_MODE="auto"` and add a valid `GEMINI_API_KEY`. `APP_URL` is reserved for the deployed app URL and self-referential/OAuth-style use cases.

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

## Verification

The project is verified with the following checks:

```bash
npm run lint
npm run build
```

The local development server can then be started with `npm run dev` and opened at `http://localhost:3000`. A basic local smoke test confirms that the health endpoint, product data, automated insight endpoint, and frontend HTML shell are served correctly.

The local AI endpoint is safe to include in an unattended smoke test because it does not send data outside the server. When Gemini mode is configured, test external Gemini queries only with data you are authorized to share.

### Recent maintenance fixes

- Added the optional manufacturing-date field to purchase-item data, allowing received purchase batches to compile and retain their manufacture date.
- Replaced global React event-type references with explicit type imports in the image upload component.
- Corrected threshold-update type inference and the inventory expiry movement label, so strict TypeScript checking completes successfully.
- Added a receipt-only print route for dependable Chrome **Save to PDF** output, plus local-first AI mode with sales/profit, cashier, expiry, and markdown analysis.

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
