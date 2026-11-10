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

