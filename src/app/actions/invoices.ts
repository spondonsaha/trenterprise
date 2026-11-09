"use server";

import {
  DiscountType,
  InvoiceStatus,
  MovementType,
  Unit,
  type InvoiceItem,
  type Prisma,
} from "@prisma/client";
import type Decimal from "decimal.js";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionError, actionOk, AppError, type ActionResult } from "@/lib/errors";
import {
  canOverridePrice,
  requireActionUser,
  requireDeletePermission,
} from "@/lib/permissions";
import type { SessionUser } from "@/types/next-auth";
import {
  invoiceInputSchema,
  invoiceUpdateSchema,
  type InvoiceInput,
  type InvoiceUpdateInput,
} from "@/lib/validation";
import { D, round2 } from "@/lib/money";
import { computeInvoiceStatus, computeInvoiceTotals } from "@/lib/invoice-calc";
import { saleLinePieces } from "@/lib/stock-math";
import { formatSequence, nextSequence } from "@/lib/sequence";
import { deductStock } from "@/lib/stock-service";
import { getSettings } from "@/lib/settings";
import { parseDateOnly, todayDateInput } from "@/lib/utils";
import { writeAudit } from "@/lib/audit";

function revalidateInvoices(invoiceId?: string) {
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/dues");
  revalidatePath("/reports");
  revalidatePath("/customers");
  revalidatePath("/inventory");
  revalidatePath("/products");
  if (invoiceId) {
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/${invoiceId}/print`);
  }
}

function buildTotals(
  data: InvoiceInput,
  user: SessionUser,
): {
  subtotal: Decimal;
  discountType: DiscountType;
  discountValue: Decimal;
  discountAmount: Decimal;
  taxRate: Decimal;
  taxAmount: Decimal;
  shipping: Decimal;
  total: Decimal;
} {
  if (data.isQuick) {
    const total = round2(D(data.manualTotal ?? 0));
    if (total.lte(0)) throw new AppError("Enter a total price greater than zero.");
    return {
      subtotal: D(0),
      discountType: DiscountType.AMOUNT,
      discountValue: D(0),
      discountAmount: D(0),
      taxRate: D(0),
      taxAmount: D(0),
      shipping: D(0),
      total,
    };
  }

  const manualTotal =
    data.manualTotal !== null && data.manualTotal !== undefined && D(data.manualTotal).gt(0)
      ? data.manualTotal
      : null;

  if (manualTotal !== null && !canOverridePrice(user)) {
    throw new AppError("You do not have permission to override the invoice total.");
  }

  const calc = computeInvoiceTotals({
    items: data.items,
    discountType: data.discountType,
    discountValue: data.discountValue,
    taxRate: data.taxRate,
    shipping: data.shipping,
    manualTotal,
    paidAmount: 0,
  });

  const total = D(calc.total);
  if (total.lte(0)) throw new AppError("Invoice total must be greater than zero.");

  return {
    subtotal: D(calc.subtotal),
    discountType: data.discountType === "PERCENT" ? DiscountType.PERCENT : DiscountType.AMOUNT,
    discountValue: round2(D(data.discountValue)),
    discountAmount: D(calc.discountAmount),
    taxRate: round2(D(data.taxRate)),
    taxAmount: D(calc.taxAmount),
    shipping: D(calc.shipping),
    total,
  };
}

type PreparedItem = {
  productId: string;
  productName: string;
  description: string;
  unit: Unit;
  quantity: number;
  unitPrice: Decimal;
  piecesPerCarton: number;
  quantityPieces: number;
  lineTotal: Decimal;
};

async function prepareItems(
  tx: Prisma.TransactionClient,
  lines: InvoiceInput["items"],
): Promise<PreparedItem[]> {
  if (lines.length === 0) return [];
  const ids = Array.from(new Set(lines.map((line) => line.productId)));
  const products = await tx.product.findMany({ where: { id: { in: ids } } });
  const map = new Map(products.map((product) => [product.id, product]));
  const prepared: PreparedItem[] = [];

  for (const line of lines) {
    const product = map.get(line.productId);
    if (!product) throw new AppError("A selected product was not found.");
    if (product.isArchived || !product.active) {
      throw new AppError(`${product.name} is not active and cannot be invoiced.`);
    }
    const quantityPieces = saleLinePieces(line.unit, line.quantity, product.piecesPerCarton);
    prepared.push({
      productId: product.id,
      productName: product.name,
      description: line.description || product.name,
      unit: line.unit === "CARTON" ? Unit.CARTON : Unit.PIECE,
      quantity: line.quantity,
      unitPrice: round2(D(line.unitPrice)),
      piecesPerCarton: product.piecesPerCarton,
      quantityPieces,
      lineTotal: round2(D(line.unitPrice).mul(line.quantity)),
    });
  }
  return prepared;
}

async function reverseInvoiceStock(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  invoiceNumber: string,
  items: InvoiceItem[],
  userId: string,
  note: string,
): Promise<void> {
  for (const item of items) {
    if (!item.productId || item.quantityPieces <= 0) continue;
    await tx.product.update({
      where: { id: item.productId },
      data: { stockPieces: { increment: item.quantityPieces } },
    });
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        type: MovementType.SALE_RETURN,
        quantity: item.quantity,
        unit: item.unit,
        quantityPieces: item.quantityPieces,
        referenceType: "INVOICE",
        referenceId: invoiceId,
        note: `${note} (${invoiceNumber})`,
        userId,
      },
    });
  }
}

async function applyInvoiceStock(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  invoiceNumber: string,
  items: PreparedItem[],
  userId: string,
  allowNegative: boolean,
): Promise<void> {
  for (const item of items) {
    await deductStock(tx, {
      productId: item.productId,
      pieces: item.quantityPieces,
      allowNegative,
      productName: item.productName,
    });
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        type: MovementType.SALE,
        quantity: item.quantity,
        unit: item.unit,
        quantityPieces: -item.quantityPieces,
        referenceType: "INVOICE",
        referenceId: invoiceId,
        note: `Sold on ${invoiceNumber}`,
        userId,
      },
    });
  }
}

function resolveInitialPayment(
  data: InvoiceInput,
  total: Decimal,
  saveAsDraft: boolean,
): Decimal {
  if (saveAsDraft) return round2(D(0));

  const amount =
    data.paymentStatus === "PAID"
      ? round2(D(total))
      : data.paymentStatus === "PARTIALLY_PAID"
        ? round2(D(data.amountPaid))
        : round2(D(0));

  if (amount.lt(0)) throw new AppError("Amount paid cannot be negative.");
  if (amount.gt(total)) throw new AppError("Amount paid cannot exceed the invoice total.");
  if (
    data.paymentStatus === "PARTIALLY_PAID" &&
    (amount.lte(0) || amount.gte(total))
  ) {
    throw new AppError("A partial payment must be more than zero and less than the invoice total.");
  }

  return amount;
}

async function createInitialPayment(
  tx: Prisma.TransactionClient,
  args: {
    invoiceId: string;
    customerId: string | null;
    invoiceNumber: string;
    amount: Decimal;
    date: Date;
    userId: string;
  },
): Promise<string> {
  const sequence = await nextSequence(tx, "receipt");
  const receiptNumber = formatSequence("RCPT-", sequence);

  await tx.payment.create({
    data: {
      receiptNumber,
      invoiceId: args.invoiceId,
      customerId: args.customerId,
      amount: args.amount,
      date: args.date,
      method: "CASH",
      note: `Payment received with invoice ${args.invoiceNumber}`,
      createdById: args.userId,
    },
  });

  return receiptNumber;
}

async function findCustomerByName(
  tx: Prisma.TransactionClient,
  name: string,
) {
  return tx.customer.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
}

export async function createInvoice(
  input: InvoiceInput,
  saveAsDraft = false,
): Promise<ActionResult<{ id: string; invoiceNumber: string }>> {
  try {
    const user = await requireActionUser();
    const data = invoiceInputSchema.parse(input);
    const settings = await getSettings();
    const totals = buildTotals(data, user);
    const invoiceDate = parseDateOnly(data.date) ?? parseDateOnly(todayDateInput())!;
    const dueDate = parseDateOnly(data.dueDate);
    const initialPaid = resolveInitialPayment(data, totals.total, saveAsDraft);

    const created = await prisma.$transaction(async (tx) => {
      const customer = await findCustomerByName(tx, data.customerName);
      const items = await prepareItems(tx, data.items);

      const sequence = await nextSequence(tx, "invoice");
      const invoiceNumber = formatSequence(settings.invoicePrefix, sequence);
      const status = saveAsDraft
        ? InvoiceStatus.DRAFT
        : computeInvoiceStatus({
            isDraft: false,
            isCancelled: false,
            total: totals.total,
            paid: initialPaid,
          });
      const posted = !saveAsDraft && !data.isQuick;

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: customer?.id ?? null,
          customerName: data.customerName,
          customerPhone: data.customerPhone || customer?.phone || null,
          customerEmail: data.customerEmail || customer?.email || null,
          customerAddress: data.customerAddress || customer?.address || null,
          date: invoiceDate,
          dueDate,
          status,
          isQuick: data.isQuick,
          stockPosted: false,
          subtotal: totals.subtotal,
          discountType: totals.discountType,
          discountValue: totals.discountValue,
          discountAmount: totals.discountAmount,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          shipping: totals.shipping,
          total: totals.total,
          paidAmount: initialPaid,
          dueAmount: round2(totals.total.sub(initialPaid)),
          notes: data.notes || null,
          terms: data.terms || null,
          createdById: user.id,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              piecesPerCarton: item.piecesPerCarton,
              quantityPieces: item.quantityPieces,
              lineTotal: item.lineTotal,
            })),
          },
        },
      });

      if (posted) {
        await applyInvoiceStock(
          tx,
          invoice.id,
          invoiceNumber,
          items,
          user.id,
          settings.allowNegativeStock,
        );
        await tx.invoice.update({ where: { id: invoice.id }, data: { stockPosted: true } });
      }

      const initialPayment =
        initialPaid.gt(0)
          ? await createInitialPayment(tx, {
              invoiceId: invoice.id,
              customerId: customer?.id ?? null,
              invoiceNumber,
              amount: initialPaid,
              date: invoiceDate,
              userId: user.id,
            })
          : null;

      await writeAudit({
        tx,
        userId: user.id,
        action: "INVOICE_CREATED",
        entityType: "Invoice",
        entityId: invoice.id,
        details: {
          invoiceNumber,
          total: Number(totals.total),
          isQuick: data.isQuick,
          draft: saveAsDraft,
          itemCount: items.length,
          initialPaid: Number(initialPaid),
          initialPaymentReceipt: initialPayment,
        },
      });

      return { id: invoice.id, invoiceNumber };
    });

    revalidateInvoices(created.id);
    return actionOk(created);
  } catch (error) {
    return actionError(error);
  }
}

export async function updateInvoice(
  input: InvoiceUpdateInput,
  saveAsDraft = false,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionUser();
    const data = invoiceUpdateSchema.parse(input);
    const settings = await getSettings();
    const totals = buildTotals(data, user);
    const invoiceDate = parseDateOnly(data.date) ?? parseDateOnly(todayDateInput())!;
    const dueDate = parseDateOnly(data.dueDate);
    const initialPaid = resolveInitialPayment(data, totals.total, saveAsDraft);

    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: data.id },
        include: {
          items: true,
          payments: { where: { voidedAt: null }, select: { id: true }, take: 1 },
        },
      });
      if (!invoice) throw new AppError("Invoice not found.");
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new AppError("Cancelled invoices cannot be edited.");
      }
      if (invoice.payments.length > 0 || D(invoice.paidAmount).gt(0)) {
        throw new AppError("Payments exist. Void all payments before editing this invoice.");
      }

      const customer = await findCustomerByName(tx, data.customerName);
      const items = await prepareItems(tx, data.items);

      if (invoice.stockPosted) {
        await reverseInvoiceStock(
          tx,
          invoice.id,
          invoice.invoiceNumber,
          invoice.items,
          user.id,
          "Invoice edit reversal",
        );
      }

      await tx.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });

      const status = saveAsDraft
        ? InvoiceStatus.DRAFT
        : computeInvoiceStatus({
            isDraft: false,
            isCancelled: false,
            total: totals.total,
            paid: initialPaid,
          });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          customerId: customer?.id ?? null,
          customerName: data.customerName,
          customerPhone: data.customerPhone || customer?.phone || null,
          customerEmail: data.customerEmail || customer?.email || null,
          customerAddress: data.customerAddress || customer?.address || null,
          date: invoiceDate,
          dueDate,
          status,
          isQuick: data.isQuick,
          stockPosted: false,
          subtotal: totals.subtotal,
          discountType: totals.discountType,
          discountValue: totals.discountValue,
          discountAmount: totals.discountAmount,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          shipping: totals.shipping,
          total: totals.total,
          paidAmount: initialPaid,
          dueAmount: round2(totals.total.sub(initialPaid)),
          notes: data.notes || null,
          terms: data.terms || null,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              piecesPerCarton: item.piecesPerCarton,
              quantityPieces: item.quantityPieces,
              lineTotal: item.lineTotal,
            })),
          },
        },
      });

      if (!saveAsDraft && !data.isQuick) {
        await applyInvoiceStock(
          tx,
          invoice.id,
          invoice.invoiceNumber,
          items,
          user.id,
          settings.allowNegativeStock,
        );
        await tx.invoice.update({ where: { id: invoice.id }, data: { stockPosted: true } });
      }

      const initialPayment =
        initialPaid.gt(0)
          ? await createInitialPayment(tx, {
              invoiceId: invoice.id,
              customerId: customer?.id ?? null,
              invoiceNumber: invoice.invoiceNumber,
              amount: initialPaid,
              date: invoiceDate,
              userId: user.id,
            })
          : null;

      await writeAudit({
        tx,
        userId: user.id,
        action: "INVOICE_UPDATED",
        entityType: "Invoice",
        entityId: invoice.id,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          total: Number(totals.total),
          draft: saveAsDraft,
          itemCount: items.length,
          initialPaid: Number(initialPaid),
          initialPaymentReceipt: initialPayment,
        },
      });
    });

    revalidateInvoices(data.id);
    return actionOk({ id: data.id });
  } catch (error) {
    return actionError(error);
  }
}

export async function finalizeInvoice(
  id: string,
): Promise<ActionResult<{ id: string; status: InvoiceStatus }>> {
  try {
    const user = await requireActionUser();
    const settings = await getSettings();

    const finalized = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!invoice) throw new AppError("Invoice not found.");
      if (invoice.status !== InvoiceStatus.DRAFT) {
        throw new AppError("Only draft invoices can be finalized.");
      }
      if (!invoice.isQuick && invoice.items.length === 0) {
        throw new AppError("Add at least one line item before finalizing.");
      }

      if (!invoice.isQuick) {
        const items: PreparedItem[] = invoice.items
          .filter((item) => item.productId)
          .map((item) => ({
            productId: item.productId!,
            productName: item.description,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: D(item.unitPrice),
            piecesPerCarton: item.piecesPerCarton,
            quantityPieces: item.quantityPieces,
            lineTotal: D(item.lineTotal),
          }));
        await applyInvoiceStock(
          tx,
          invoice.id,
          invoice.invoiceNumber,
          items,
          user.id,
          settings.allowNegativeStock,
        );
      }

      const status = computeInvoiceStatus({
        isDraft: false,
        isCancelled: false,
        total: invoice.total,
        paid: invoice.paidAmount,
      });

      await tx.invoice.update({
        where: { id },
        data: {
          status,
          stockPosted: !invoice.isQuick,
          dueAmount: round2(D(invoice.total).sub(D(invoice.paidAmount))),
        },
      });

      await writeAudit({
        tx,
        userId: user.id,
        action: "INVOICE_FINALIZED",
        entityType: "Invoice",
        entityId: invoice.id,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          total: Number(invoice.total),
          isQuick: invoice.isQuick,
        },
      });

      return { id: invoice.id, status };
    });

    revalidateInvoices(id);
    return actionOk(finalized);
  } catch (error) {
    return actionError(error);
  }
}

export async function cancelInvoice(id: string): Promise<ActionResult<undefined>> {
  try {
    const user = await requireActionUser();
    requireDeletePermission(user);

    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: {
          items: true,
          payments: { where: { voidedAt: null }, select: { id: true }, take: 1 },
        },
      });
      if (!invoice) throw new AppError("Invoice not found.");
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new AppError("This invoice is already cancelled.");
      }
      if (invoice.payments.length > 0 || D(invoice.paidAmount).gt(0)) {
        throw new AppError("Void all payments before cancelling this invoice.");
      }

      if (invoice.stockPosted) {
        await reverseInvoiceStock(
          tx,
          invoice.id,
          invoice.invoiceNumber,
          invoice.items,
          user.id,
          "Invoice cancellation",
        );
      }

      await tx.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.CANCELLED,
          stockPosted: false,
          dueAmount: round2(D(0)),
          cancelledAt: new Date(),
          cancelledById: user.id,
        },
      });

      await writeAudit({
        tx,
        userId: user.id,
        action: "INVOICE_CANCELLED",
        entityType: "Invoice",
        entityId: invoice.id,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          total: Number(invoice.total),
          stockRestored: invoice.stockPosted,
        },
      });
    });

    revalidateInvoices(id);
    return actionOk(undefined);
  } catch (error) {
    return actionError(error);
  }
}

export async function duplicateInvoice(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionUser();
    const settings = await getSettings();

    const created = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!invoice) throw new AppError("Invoice not found.");

      const sequence = await nextSequence(tx, "invoice");
      const invoiceNumber = formatSequence(settings.invoicePrefix, sequence);
      const today = parseDateOnly(todayDateInput())!;

      const copy = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: invoice.customerId,
          customerName: invoice.customerName,
          customerPhone: invoice.customerPhone,
          customerEmail: invoice.customerEmail,
          customerAddress: invoice.customerAddress,
          date: today,
          dueDate: null,
          status: InvoiceStatus.DRAFT,
          isQuick: invoice.isQuick,
          stockPosted: false,
          subtotal: invoice.subtotal,
          discountType: invoice.discountType,
          discountValue: invoice.discountValue,
          discountAmount: invoice.discountAmount,
          taxRate: invoice.taxRate,
          taxAmount: invoice.taxAmount,
          shipping: invoice.shipping,
          total: invoice.total,
          paidAmount: round2(D(0)),
          dueAmount: invoice.total,
          notes: invoice.notes,
          terms: invoice.terms,
          createdById: user.id,
          items: {
            create: invoice.items.map((item) => ({
              productId: item.productId,
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              piecesPerCarton: item.piecesPerCarton,
              quantityPieces: item.quantityPieces,
              lineTotal: item.lineTotal,
            })),
          },
        },
      });

      await writeAudit({
        tx,
        userId: user.id,
        action: "INVOICE_DUPLICATED",
        entityType: "Invoice",
        entityId: copy.id,
        details: {
          from: invoice.invoiceNumber,
          invoiceNumber,
          draft: true,
        },
      });

      return copy;
    });

    revalidateInvoices(created.id);
    return actionOk({ id: created.id });
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteDraftInvoice(id: string): Promise<ActionResult<undefined>> {
  try {
    const user = await requireActionUser();
    requireDeletePermission(user);

    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: { payments: { where: { voidedAt: null }, select: { id: true }, take: 1 } },
      });
      if (!invoice) throw new AppError("Invoice not found.");
      if (invoice.status !== InvoiceStatus.DRAFT || invoice.stockPosted) {
        throw new AppError("Only draft invoices with no stock posting can be deleted.");
      }
      if (invoice.payments.length > 0) throw new AppError("This invoice has payments.");

      await tx.invoice.delete({ where: { id } });
      await writeAudit({
        tx,
        userId: user.id,
        action: "INVOICE_DELETED",
        entityType: "Invoice",
        entityId: id,
        details: { invoiceNumber: invoice.invoiceNumber, total: Number(invoice.total) },
      });
    });

    revalidateInvoices();
    return actionOk(undefined);
  } catch (error) {
    return actionError(error);
  }
}
