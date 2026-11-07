# TR Enterprise ERP

A complete, responsive ERP for **TR Enterprise**, a printer consumables business selling ink, toner and cartridges by carton and by piece. It covers inventory in base pieces, customers and suppliers, itemized or quick invoices, payments/receivables, dues ageing, reports, PDF/CSV exports, staff roles and an audit trail.

## Features

- **Dashboard** - sales, collections, receivables, low-stock alerts, recent activity and a daily sales chart.
- **Products & categories** - carton/piece pricing, cost, low-stock threshold, archive, single and bulk rate changes. Rate changes apply to future invoices only; existing invoice lines are snapshotted.
- **Inventory** - stock overview, stock-in, stock-out and adjustments. Stock is stored in pieces and reconciled with signed stock movements. Finalizing an invoice deducts stock atomically; cancelling restores it.
- **Customers** - directory, opening balance, credit terms, activation, account statement/ledger, invoice and payment history.
- **Suppliers** - supplier directory and purchase history (admin only).
- **Invoices** - quick invoices (name + total, no stock) or itemized carton/piece invoices with discount, tax and shipping. Drafts, finalization, editing, cancellation, duplication, print view, PDF download, and optional staff total override.
- **Payments & dues** - record payments against invoices, edit/void with audit history, receipt PDF, and receivables ageing buckets (`current`, `1-30`, `31-60`, `61-90`, `90+`).
- **Reports** - sales, collections, dues, stock and product performance with date filters, preview, CSV and PDF export.
- **Administration** - business settings (profile, logo, currency, prefixes, tax, negative stock), user management, and an audit log.
- **Roles** - Admin has full access; Staff can sell, collect payments, manage stock and customers, but cannot change rates/products, cancel invoices, void payments, or access suppliers, settings, users and audit.
- **Responsive UI** - desktop tables, mobile cards, sidebar/bottom navigation, loading skeletons and printable invoice layouts.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, Server Actions) |
| Language | TypeScript (strict) |
| Database | Neon Postgres + Prisma 6 |
| Auth | NextAuth (credentials, JWT sessions) + bcrypt |
| UI | Tailwind CSS, shadcn-style primitives, Radix UI, Lucide |
| Forms & tables | React Hook Form, Zod, TanStack Table |
| PDFs & charts | `@react-pdf/renderer`, Recharts |
| Tests | Vitest |

## Getting started

### 1. Requirements

- Node.js 22+ (Vercel pins 22.x; check `.nvmrc`/`engines`)
- A Neon Postgres database (or any Postgres 15+ instance)

### 2. Install

```bash
npm install
```

`postinstall` runs `prisma generate`.

### 3. Configure Neon

Create a Neon project and copy:

- the **pooled** connection string (host contains `-pooler`) into `DATABASE_URL`
- the **direct** connection string into `DIRECT_URL`

Create `.env` from `.env.example`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxxx-pooler.region.aws.neon.tech/tr_enterprise?sslmode=require&pgbouncer=true&connection_limit=1&connect_timeout=15"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxxx.region.aws.neon.tech/tr_enterprise?sslmode=require"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a secret with `openssl rand -base64 32` (or any long random string).

### 4. Migrate and seed

```bash
npm run db:deploy
npm run db:seed
```

For local schema changes use `npm run db:migrate`. `npm run db:studio` opens Prisma Studio.

Seeded demo logins:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@trenterprise.com` | `REDACTED` |
| Staff | `staff@trenterprise.com` | `REDACTED` |

Change these passwords after the first production login (Users -> edit).

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

> Windows PowerShell may block `npm.ps1`; use `npm.cmd run <script>` if needed.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (includes lint + type checks) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript without emitting |
| `npm test` | Vitest unit tests |
| `npm run db:generate` | Prisma client |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Prisma Studio |

## Deploying to Vercel

The project is ready for Vercel: Node 22 is pinned in `package.json`, `prisma generate` runs during the build, PDF routes run on the Node.js runtime with a 60-second limit, and `.vercelignore` keeps local env files and build output out of uploads.

### 1. Push this folder to GitHub

The configured repository is <https://github.com/spondonsaha/trenterprise>. If the local folder is not a Git repository yet:

```bash
git init
git add .
git commit -m "Prepare TR Enterprise ERP for deployment"
git branch -M main
git remote add origin https://github.com/spondonsaha/trenterprise.git
git push -u origin main
```

Never commit `.env`; only `.env.example` belongs in Git.

### 2. Set Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, add these for **Production** (and Preview if needed):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** URL, including `sslmode=require&pgbouncer=true&connection_limit=1&connect_timeout=15` |
| `DIRECT_URL` | Neon **direct** URL (no `-pooler`), used for migrations |
| `NEXTAUTH_SECRET` | A fresh long random secret, e.g. `openssl rand -base64 32` |
| `NEXTAUTH_URL` | The production URL, e.g. `https://trenterprise.vercel.app` |

Do not reuse the local development secret for production. For preview deployments, use a separate preview database or omit `NEXTAUTH_URL` so NextAuth follows the preview host.

### 3. Import and deploy

1. In Vercel, choose **Add New → Project** and import `spondonsaha/trenterprise`.
2. Framework preset: **Next.js**. Root directory: `.`.
3. Keep the default install command (`npm install`). The build command is `npm run build`; `postinstall` and the build both run `prisma generate`.
4. Deploy.

### 4. Prepare the production database

From a trusted machine with the production variables loaded, run:

```bash
npm run db:deploy
```

Seed only for a brand-new demo environment; do not seed over production data. After the first login, change the seeded admin and staff passwords in **Users & Roles**.

### CLI deployment (optional)

If you prefer deploying the local folder without the Git integration:

```bash
npx vercel login
npx vercel link
npx vercel env pull .env.vercel.local
npx vercel --prod
```

Add the production variables in the Vercel dashboard before the production deployment. Neon's pooled URL keeps serverless connections within limits; keep `connection_limit=1` in `DATABASE_URL`.

## Business rules

- **Stock is in pieces.** Cartons are converted with the product's `piecesPerCarton`. A product's cached `stockPieces` is kept in sync with signed stock movements.
- **Negative stock** is blocked unless enabled in Settings.
- **Invoices:** totals are recalculated on the server; client-submitted prices and carton sizes are never trusted. Drafts do not move stock. Finalizing deducts stock. Editing a finalized invoice reverses the old sale and reapplies the new one. Cancelling restores stock. Invoices with payments cannot be edited or cancelled.
- **Quick invoices** record a customer name and total only and intentionally have no stock effect.
- **Payments** update invoice status (`UNPAID`, `PARTIALLY_PAID`, `PAID`) and cannot exceed the due amount. Paid invoices cannot be cancelled.
- **Numbering** is concurrency-safe via a sequence table: `INV-0001`, `RCPT-0001`, `PO-0001`.
- **Dates** entered as date-only values are treated as UTC midnight so invoice due dates are consistent across time zones.
- **Money** is calculated with `decimal.js` and persisted as Postgres `Decimal`; values are rounded to 2 decimals at the boundaries.

## Manual smoke test

1. Sign in as admin, open **Products**, create a product with a carton size and prices, then **Stock In** a few cartons.
2. Create an **itemized invoice**, finalize it, and confirm stock decreased.
3. Record a partial **payment**; confirm the invoice becomes partially paid and appears in **Dues** with the right ageing bucket.
4. Download the invoice **PDF** and payment **receipt**; check the TR Enterprise branding, filename and BDT amounts.
5. Edit the invoice (reverse/reapply stock), then cancel it and confirm stock is restored. Cancel is blocked once paid.
6. Sign in as staff and confirm restricted actions are hidden/denied (rates, suppliers, settings, users, audit, voids).
7. Export a **report** as CSV and PDF.
8. Open **Audit Log** and verify the create/update/payment/cancel entries.

## Tests

```bash
npm test
```

Unit tests cover carton/piece stock math, stock status, invoice line/total calculations, discounts, tax, shipping, manual totals and invoice status derivation.

## Project layout

```text
prisma/                 schema, migration and seed
src/app/(app)/          authenticated pages
src/app/actions/        server actions (validation, auth, audit)
src/app/api/            PDF, CSV and search endpoints
src/components/         UI primitives, forms and feature components
src/lib/                auth, permissions, money, stock, invoice math, reports
src/lib/pdf/            invoice, receipt and report PDF templates
```

## Security notes

- Every server action and API route authenticates and authorizes individually; middleware also guards app routes.
- Passwords are hashed with bcrypt. Sessions use a signed JWT secret.
- Audit records capture actor, action, entity and changes for key mutations.
- Environment files are git-ignored. Never commit real database URLs or secrets.
- For production, use a unique `NEXTAUTH_SECRET`, rotate the seeded passwords, enable Neon backups, and restrict database access.

## Limitations

- Single currency and single business profile (configurable in Settings).
- PDFs use Helvetica and the configured currency code (for example `BDT`) for reliable rendering; the UI uses the `৳` symbol.
- No email/SMS sending, online payment gateway, purchase-order workflow or multi-warehouse support.
- Reports are generated on demand; there is no scheduled email delivery.
