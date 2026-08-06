# UPSHOP Project File Registry & Directory Map

This document outlines the file structure of the **UPSHOP** application. It serves as a guide for developer onboarding, bug troubleshooting, and future code refactoring or upgrades. It intentionally excludes internal build/dependency folders (like `.next`, `node_modules`, and `.git`).

---

## 📂 Project Root Configuration & Assets

| File / Folder | Purpose |
| :--- | :--- |
| **`/public/`** | Contains static assets served directly by Next.js. |
| ├── 📄 `developer_portrait.jpg` | Portrait image of the developer (Matovu Shafik) shown in the About tab. |
| └── 📄 `fikmen_logo.png` | FIKMEN M&S winged logo shown in the About tab. |
| **`/data/`** | The persistent database directory. |
| └── 📄 `upshop.sqlite` | SQLite database file storing users, products, sales, and movement logs. |
| 📄 `package.json` | Project dependencies, devDependencies, and scripts (e.g. build, dev, start). |
| 📄 `next.config.ts` | Next.js compilation settings (configured for dynamic server environments). |
| 📄 `tailwind.config.ts` | Tailwind CSS configuration defining theme colors (primary, accent) and fonts. |
| 📄 `tsconfig.json` | TypeScript compilation configurations and directory path aliases (`@/*` mapping to `src/*`). |
| 📄 `components.json` | shadcn/ui configuration mapping UI primitive paths and styling formats. |
| 📄 `postcss.config.mjs` | PostCSS processors config (Tailwind integration). |
| 📄 `apphosting.yaml` | Firebase App Hosting configuration (unused in current SQLite build). |
| 📄 `PACKAGING.md` | Deployment packaging guidelines. |

---

## 📂 Source Code (`/src/`)

All logic, pages, components, and styling reside under the `/src/` folder.

### 1. Database & Utility Libraries (`/src/lib/`)
* 📄 [`db.ts`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/lib/db.ts): **The Core Database Driver.** Initializes the SQLite database, runs table setup, performs automatic migration from the old `db.json` file if present, and exports all asynchronous database query helper methods (e.g. `saveUser`, `getProducts`, `insertSale`).
* 📄 [`auth-context.tsx`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/lib/auth-context.tsx): React context provider that wraps the app to manage authentication states (active user, JWT token, login/register helper methods).
* 📄 [`use-api.ts`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/lib/use-api.ts): Custom hooks wrapper for managing standardized API query states and mutations.
* 📄 [`placeholder-images.ts`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/lib/placeholder-images.ts): Registry of placeholder image templates for products and user avatars.
* 📄 [`utils.ts`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/lib/utils.ts): Primitive utility helpers (e.g. class name merger `cn` for dynamic Tailwind classes).

### 2. Custom Hooks (`/src/hooks/`)
* 📄 [`use-toast.ts`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/hooks/use-toast.ts): Handles displaying temporary, toast-style pop-up notifications to the user.

---

### 3. Reusable UI Components (`/src/components/`)
* **`/layout/`**
  * 📄 [`app-sidebar.tsx`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/components/layout/app-sidebar.tsx): Main left sidebar navigation. Features the **UPSHOP** branding header, developer identification avatar, links to the various tabs, and the Settings link.
* **`/ui/`** (shadcn/ui primitives used throughout the interface)
  * 📄 `button.tsx`: Styled button triggers.
  * 📄 `card.tsx`: Layout container components (`CardHeader`, `CardTitle`, `CardContent`).
  * 📄 `badge.tsx`: Colored indicator pills (e.g. status tags for "Paid" or "Overdue").
  * 📄 `input.tsx` & `textarea.tsx`: Form input elements.
  * 📄 `label.tsx`: Styled form labeling text.
  * 📄 `progress.tsx`: Custom progress bar synced with revenue goals.
  * 📄 `radio-group.tsx`: Multi-choice radio buttons.
  * 📄 `select.tsx`: Interactive select dropdown menus.
  * 📄 `table.tsx`: Horizontal data grid layouts (`TableHeader`, `TableRow`, `TableCell`).
  * 📄 `toast.tsx` & `toaster.tsx`: Floating notice alerts container.
  * 📄 `tooltip.tsx`: Descriptive hover menus.

---

### 4. Page Router & Views Layouts (`/src/app/`)

Next.js 15 App Router handles routes by mapping folders containing a `page.tsx` file.

#### 🔓 Public Routes (Authentication)
* **`/signup/`**
  * 📄 [`page.tsx`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/app/signup/page.tsx): User registration form (creates a new store credentials account).
* **`/login/`**
  * 📄 [`page.tsx`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/app/login/page.tsx): Sign-in form (validates password hashes against SQLite user entries).
* 📄 [`page.tsx`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/app/page.tsx): Landing redirect page. Auto-navigates users to `/dashboard` if logged in, or `/login` if unauthenticated.
* 📄 [`layout.tsx`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/app/layout.tsx): Top-level root layout. Sets up fonts, sets the site HTML title, and binds the global `<Toaster />` notification container.

#### 🔒 Authenticated App Route Group (`/src/app/(authenticated)/`)
Contains dashboard sub-routes guarded by login credentials validation. Inherits sidebar layouts.

* 📄 [`layout.tsx`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/app/(authenticated)/layout.tsx): Sidebar wrapper layout. Renders the main dashboard layout shell alongside the left navigation.
* **`dashboard/`**
  * 📄 [`page.tsx`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/app/(authenticated)/dashboard/page.tsx): **Main Overview Console.** Features weekly cash metrics (Revenue in Cash, Revenue in Credit, Progress percentage), daily sales trend charts, recently sold products grouped by weekdays, and active debtor alerts with dismissal triggers.
* **`inventory/`**
  * 📄 [`page.tsx`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/app/(authenticated)/inventory/page.tsx): **Inventory Stock Catalog.** Shows total counts, warehouse versus shop floor quantities, warning pills for low-stock products, and contains pop-up dialogs to edit product fields (prices, limits, names).
* **`store/`**
  * 📄 [`page.tsx`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/app/(authenticated)/store/page.tsx): **Logistics & Incoming Intake.** Form to register new products from suppliers (with file-upload options for custom images) or transfer stock quantities from the Warehouse to the Shop Floor.
* **`sales/`**
  * 📄 [`page.tsx`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/app/(authenticated)/sales/page.tsx): **Point of Sale (POS) Cashier.** Grid of products for quick checkout. Toggles between Cash and Credit sales, logging customer names and due date intervals.
* **`notifications/`**
  * 📄 [`page.tsx`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/app/(authenticated)/notifications/page.tsx): **Business Intelligence & Debtors Console.** Displays weekly progress bars, target input configurators, the global outstanding debtors registry (logs partial and full debt collections), and system alerts for overdue payments or low stock.
* **`returns/`**
  * 📄 [`page.tsx`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/app/(authenticated)/returns/page.tsx): **Stock Returns Registry.** Records returned items, automatically adjusting stock levels back into the inventory index.
* **`settings/`**
  * 📄 [`page.tsx`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/app/(authenticated)/settings/page.tsx): **Maintenance Dashboard.** Holds security-guarded options to clear past transaction tables (preserving products index) or wipe the entire database.
* **`about/`**
  * 📄 [`page.tsx`](file:///c:/Users/fikmen/Downloads/project%20%281%29/src/app/(authenticated)/about/page.tsx): About information page displaying application vision, developer portrait, contact data, and corporate identity logos.

---

### 5. Backend REST API Endpoints (`/src/app/api/`)

Endpoints process client requests and return JSON payloads from the SQLite database.

* **`auth/login/`**
  * 📄 `route.ts`: Matches username/password inputs and returns authentication JWT tokens.
* **`auth/register/`**
  * 📄 `route.ts`: Registers a new administrator profile (hashes passwords using `bcryptjs`).
* **`user/profile/`**
  * 📄 `route.ts`: `GET` profile statistics (weekly targets, business name, avatars) and `PUT` profile settings changes.
* **`products/`**
  * 📄 `route.ts`: `GET` list of all products in inventory and `POST` custom new items.
* **`products/[id]/`**
  * 📄 `route.ts`: `PUT` updates to a specific product's pricing or stock amounts.
* **`movements/`**
  * 📄 `route.ts`: `GET` full stock logistical history logs and `POST` movements (Warehouse to Shop Floor transfers).
* **`sales/`**
  * 📄 `route.ts`: `GET` all sales history records and `POST` checkouts (deducts stock quantities and records credit status).
* **`debtors/pay/`**
  * 📄 `route.ts`: `POST` method to log a custom amount of cash received to settle debtor balances.
* **`debtors/dismiss/`**
  * 📄 `route.ts`: `POST` method to hide fully resolved debtor alerts from the dashboard.
* **`settings/reset/`**
  * 📄 `route.ts`: `POST` credentials verification logic to clear/wipe SQLite database tables.
