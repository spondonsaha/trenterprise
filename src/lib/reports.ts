import "server-only";
import { InvoiceStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { D, formatAmount, round2, type Numeric } from "./money";
import { formatStockDetailed, stockStatus } from "./stock-math";
import {
  addDays,
  daysBetween,
  formatDate,
  formatDateTime,
  parseDateOnly,
  startOfUtcDay,
  todayDateInput,
} from "./utils";
import {
  INVOICE_STATUS_LABELS,
  MOVEMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
} from "./constants";

export type ReportType =
  | "sales"
  | "stock"
  | "stock-movements"
  | "dues"
  | "payments"
  | "price-history";

export const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  { value: "sales", label: "Sales Report", description: "Invoices issued in the selected date range." },
  { value: "stock", label: "Stock Report", description: "Current stock, value and stock health." },
  { value: "stock-movements", label: "Stock Movement Report", description: "Every ledger entry in the selected range." },
  { value: "dues", label: "Due / Receivable Report", description: "Outstanding invoices and overdue days." },
  { value: "payments", label: "Payment Collection Report", description: "Payments collected in the selected range." },
  { value: "price-history", label: "Price Change History", description: "Rate changes with old and new prices." },
];

export type ReportColumn = {
  key: string;
  label: string;
  width: number;
  align?: "left" | "right" | "center";
};

export type ReportResult = {
  type: ReportType;
  title: string;
  subtitle: string;
  range: { from: string; to: string; fromLabel: string; toLabel: string };
  columns: ReportColumn[];
  rows: Record<string, string>[];
  summary: { label: string; value: string }[];
};

export function isReportType(value: string | undefined): value is ReportType {
  return REPORT_TYPES.some((report) => report.value === value);
}

export function defaultReportRange(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { from: first.toISOString().slice(0, 10), to: todayDateInput() };
}

export function normaliseReportRange(from?: string, to?: string) {
  const defaults = defaultReportRange();
  const fromDate = parseDateOnly(from || defaults.from) ?? parseDateOnly(defaults.from)!;
  const toDate = parseDateOnly(to || defaults.to) ?? parseDateOnly(defaults.to)!;
  const endExclusive = addDays(toDate, 1);
  return {
    fromDate,
    toDate,
    endExclusive,
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
    fromLabel: formatDate(fromDate),
    toLabel: formatDate(toDate),
  };
}

const bdt = (value: Numeric) => `BDT ${formatAmount(value)}`;

export async function generateReport(
  type: ReportType,
  from?: string,
  to?: string,
): Promise<ReportResult> {
  const range = normaliseReportRange(from, to);
  const meta = REPORT_TYPES.find((report) => report.value === type)!;
  const dateRange = { gte: range.fromDate, lt: range.endExclusive };

  if (type === "sales") {
    const invoices = await prisma.invoice.findMany({
      where: {
        date: dateRange,
        status: { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED] },
      },
      orderBy: { date: "desc" },
    });
    const total = invoices.reduce((sum, inv) => sum.add(D(inv.total)), D(0));
    const paid = invoices.reduce((sum, inv) => sum.add(D(inv.paidAmount)), D(0));
    const due = invoices.reduce((sum, inv) => sum.add(D(inv.dueAmount)), D(0));

    return {
      type,
      title: meta.label,
      subtitle: `${range.fromLabel} to ${range.toLabel}`,
      range,
      columns: [
        { key: "invoice", label: "Invoice", width: 12 },
        { key: "date", label: "Date", width: 12 },
        { key: "customer", label: "Customer", width: 28 },
        { key: "status", label: "Status", width: 13 },
        { key: "total", label: "Total", width: 12, align: "right" },
        { key: "paid", label: "Paid", width: 11, align: "right" },
        { key: "due", label: "Due", width: 12, align: "right" },
      ],
      rows: invoices.map((invoice) => ({
        invoice: invoice.invoiceNumber,
        date: formatDate(invoice.date),
        customer: invoice.customerName,
        status: INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status,
        total: formatAmount(invoice.total),
        paid: formatAmount(invoice.paidAmount),
        due: formatAmount(invoice.dueAmount),
      })),
      summary: [
        { label: "Invoices", value: String(invoices.length) },
        { label: "Total Sales", value: bdt(round2(total)) },
        { label: "Collected", value: bdt(round2(paid)) },
        { label: "Outstanding", value: bdt(round2(due)) },
      ],
    };
  }

  if (type === "stock") {
    const products = await prisma.product.findMany({
      where: { isArchived: false },
      include: { category: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
    const totalPieces = products.reduce((sum, product) => sum + product.stockPieces, 0);
    const stockValueTotal = products.reduce(
      (sum, product) => sum.add(D(product.costPrice).mul(product.stockPieces)),
      D(0),
    );
    const lowCount = products.filter(
      (product) => stockStatus(product.stockPieces, product.lowStockPieces) !== "OK",
    ).length;
    const outCount = products.filter((product) => product.stockPieces <= 0).length;

    return {
      type,
      title: meta.label,
      subtitle: `Current stock as of ${formatDate(new Date())}`,
      range,
      columns: [
        { key: "sku", label: "SKU", width: 12 },
        { key: "product", label: "Product", width: 30 },
        { key: "category", label: "Category", width: 17 },
        { key: "stock", label: "Stock", width: 16 },
        { key: "pieces", label: "Pieces", width: 9, align: "right" },
        { key: "value", label: "Stock Value", width: 16, align: "right" },
      ],
      rows: products.map((product) => ({
        sku: product.sku,
        product: product.name,
        category: product.category?.name ?? "—",
        stock: formatStockDetailed(product.stockPieces, product.piecesPerCarton),
        pieces: String(product.stockPieces),
        value: formatAmount(round2(D(product.costPrice).mul(product.stockPieces))),
      })),
      summary: [
        { label: "Active Products", value: String(products.length) },
        { label: "Total Pieces", value: String(totalPieces) },
        { label: "Stock Value", value: bdt(round2(stockValueTotal)) },
        { label: "Low / Out", value: `${lowCount} / ${outCount}` },
      ],
    };
  }

  if (type === "stock-movements") {
    const movements = await prisma.stockMovement.findMany({
      where: { createdAt: dateRange },
      include: {
        product: { select: { name: true, sku: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const inbound = movements.reduce(
      (sum, movement) => (movement.quantityPieces > 0 ? sum + movement.quantityPieces : sum),
      0,
    );
    const outbound = movements.reduce(
      (sum, movement) => (movement.quantityPieces < 0 ? sum + Math.abs(movement.quantityPieces) : sum),
      0,
    );

    return {
      type,
      title: meta.label,
      subtitle: `${range.fromLabel} to ${range.toLabel}`,
      range,
      columns: [
        { key: "date", label: "Date", width: 14 },
        { key: "product", label: "Product", width: 25 },
        { key: "type", label: "Type", width: 13 },
        { key: "qty", label: "Qty", width: 7, align: "right" },
        { key: "unit", label: "Unit", width: 8 },
        { key: "pieces", label: "Pieces", width: 9, align: "right" },
        { key: "reference", label: "Reference / Note", width: 16 },
        { key: "user", label: "User", width: 8 },
      ],
      rows: movements.map((movement) => ({
        date: formatDateTime(movement.createdAt),
        product: `${movement.product.name} (${movement.product.sku})`,
        type: MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type,
        qty: String(movement.quantity),
        unit: movement.unit === "CARTON" ? "Carton" : "Piece",
        pieces: movement.quantityPieces > 0 ? `+${movement.quantityPieces}` : String(movement.quantityPieces),
        reference: movement.note || movement.referenceType || "—",
        user: movement.user.name,
      })),
      summary: [
        { label: "Movements", value: String(movements.length) },
        { label: "Pieces In", value: String(inbound) },
        { label: "Pieces Out", value: String(outbound) },
        { label: "Net Movement", value: String(inbound - outbound) },
      ],
    };
  }

  if (type === "dues") {
    const invoices = await prisma.invoice.findMany({
      where: {
        dueAmount: { gt: 0 },
        status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] },
        date: dateRange,
      },
      orderBy: [{ dueDate: "asc" }, { date: "asc" }],
    });
    const today = startOfUtcDay(new Date());
    const outstanding = invoices.reduce((sum, inv) => sum.add(D(inv.dueAmount)), D(0));
    const overdue = invoices
      .filter((invoice) => invoice.dueDate && invoice.dueDate < today)
      .reduce((sum, inv) => sum.add(D(inv.dueAmount)), D(0));

    return {
      type,
      title: meta.label,
      subtitle: `${range.fromLabel} to ${range.toLabel}`,
      range,
      columns: [
        { key: "invoice", label: "Invoice", width: 12 },
        { key: "customer", label: "Customer", width: 25 },
        { key: "dueDate", label: "Due Date", width: 12 },
        { key: "overdue", label: "Days Overdue", width: 10, align: "right" },
        { key: "total", label: "Total", width: 13, align: "right" },
        { key: "paid", label: "Paid", width: 13, align: "right" },
        { key: "due", label: "Due", width: 15, align: "right" },
      ],
      rows: invoices.map((invoice) => ({
        invoice: invoice.invoiceNumber,
        customer: invoice.customerName,
        dueDate: formatDate(invoice.dueDate),
        overdue: invoice.dueDate ? String(Math.max(0, daysBetween(today, invoice.dueDate))) : "—",
        total: formatAmount(invoice.total),
        paid: formatAmount(invoice.paidAmount),
        due: formatAmount(invoice.dueAmount),
      })),
      summary: [
        { label: "Open Invoices", value: String(invoices.length) },
        { label: "Outstanding", value: bdt(round2(outstanding)) },
        { label: "Overdue", value: bdt(round2(overdue)) },
      ],
    };
  }

  if (type === "payments") {
    const payments = await prisma.payment.findMany({
      where: { date: dateRange, voidedAt: null },
      include: {
        invoice: { select: { invoiceNumber: true, customerName: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });
    const collected = payments.reduce((sum, payment) => sum.add(D(payment.amount)), D(0));

    return {
      type,
      title: meta.label,
      subtitle: `${range.fromLabel} to ${range.toLabel}`,
      range,
      columns: [
        { key: "receipt", label: "Receipt", width: 12 },
        { key: "date", label: "Date", width: 11 },
        { key: "invoice", label: "Invoice", width: 11 },
        { key: "customer", label: "Customer", width: 23 },
        { key: "method", label: "Method", width: 16 },
        { key: "reference", label: "Reference", width: 14 },
        { key: "amount", label: "Amount", width: 13, align: "right" },
      ],
      rows: payments.map((payment) => ({
        receipt: payment.receiptNumber,
        date: formatDate(payment.date),
        invoice: payment.invoice.invoiceNumber,
        customer: payment.invoice.customerName,
        method: PAYMENT_METHOD_LABELS[payment.method] ?? payment.method,
        reference: payment.reference || "—",
        amount: formatAmount(payment.amount),
      })),
      summary: [
        { label: "Payments", value: String(payments.length) },
        { label: "Total Collected", value: bdt(round2(collected)) },
      ],
    };
  }

  const history = await prisma.priceHistory.findMany({
    where: { createdAt: dateRange },
    include: {
      product: { select: { name: true, sku: true } },
      changedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const affected = new Set(history.map((entry) => entry.productId)).size;

  return {
    type: "price-history",
    title: meta.label,
    subtitle: `${range.fromLabel} to ${range.toLabel}`,
    range,
    columns: [
      { key: "date", label: "Date", width: 13 },
      { key: "product", label: "Product", width: 23 },
      { key: "sku", label: "SKU", width: 10 },
      { key: "oldCarton", label: "Old Carton", width: 10, align: "right" },
      { key: "newCarton", label: "New Carton", width: 10, align: "right" },
      { key: "oldPiece", label: "Old Piece", width: 9, align: "right" },
      { key: "newPiece", label: "New Piece", width: 9, align: "right" },
      { key: "user", label: "Changed By", width: 8 },
      { key: "note", label: "Note", width: 8 },
    ],
    rows: history.map((entry) => ({
      date: formatDate(entry.createdAt),
      product: entry.product.name,
      sku: entry.product.sku,
      oldCarton: formatAmount(entry.oldCartonPrice),
      newCarton: formatAmount(entry.newCartonPrice),
      oldPiece: formatAmount(entry.oldPiecePrice),
      newPiece: formatAmount(entry.newPiecePrice),
      user: entry.changedBy.name,
      note: entry.note || "—",
    })),
    summary: [
      { label: "Price Changes", value: String(history.length) },
      { label: "Products Affected", value: String(affected) },
    ],
  };
}
