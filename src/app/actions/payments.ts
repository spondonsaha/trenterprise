"use server";

import { InvoiceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionError, actionOk, AppError, type ActionResult } from "@/lib/errors";
import { requireActionAdmin, requireActionUser } from "@/lib/permissions";
import {
  paymentSchema,
  paymentUpdateSchema,
  voidPaymentSchema,
  type PaymentInput,
  type PaymentUpdateInput,
} from "@/lib/validation";
import { D, formatMoney, round2 } from "@/lib/money";
import { computeInvoiceStatus } from "@/lib/invoice-calc";
import { formatSequence, nextSequence } from "@/lib/sequence";
import { parseDateOnly, todayDateInput } from "@/lib/utils";
import { writeAudit } from "@/lib/audit";

function revalidatePayments(invoiceId?: string, customerId?: string | null) {
  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath("/dues");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  if (invoiceId) revalidatePath(`/invoices/${invoiceId}`);
  if (customerId) revalidatePath(`/customers/${customerId}`);
}

export async function recordPayment(
  input: PaymentInput,
): Promise<ActionResult<{ id: string; receiptNumber: string }>> {
  try {
    const user = await requireActionUser();
    const data = paymentSchema.parse(input);
    const date = parseDateOnly(data.date);
    if (!date) throw new AppError("Enter a valid payment date.");
    const amount = round2(D(data.amount));

    const created = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: data.invoiceId } });
      if (!invoice) throw new AppError("Invoice not found.");
      if (invoice.status === InvoiceStatus.DRAFT) {
        throw new AppError("Finalize the draft invoice before recording a payment.");
      }
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new AppError("Cancelled invoices cannot receive payments.");
      }

      const total = D(invoice.total);
      const paid = D(invoice.paidAmount);
      const remaining = total.sub(paid);
      if (amount.gt(remaining)) {
        throw new AppError(`Payment exceeds the due amount of ${formatMoney(remaining)}.`);
      }

      const newPaid = round2(paid.add(amount));
      const newDue = round2(total.sub(newPaid));
      const status = computeInvoiceStatus({
        isDraft: false,
        isCancelled: false,
        total,
        paid: newPaid,
      });

      const sequence = await nextSequence(tx, "receipt");
      const receiptNumber = formatSequence("RCPT-", sequence);

      const payment = await tx.payment.create({
        data: {
          receiptNumber,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount,
          date,
          method: data.method,
          reference: data.reference || null,
          note: data.note || null,
          createdById: user.id,
        },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paidAmount: newPaid, dueAmount: newDue, status },
      });

      await writeAudit({
        tx,
        userId: user.id,
        action: "PAYMENT_RECORDED",
        entityType: "Payment",
        entityId: payment.id,
        details: {
          receiptNumber,
          invoiceNumber: invoice.invoiceNumber,
          amount: Number(amount),
          method: data.method,
          newDue: Number(newDue),
        },
      });

      return { id: payment.id, receiptNumber, customerId: invoice.customerId, invoiceId: invoice.id };
    });

    revalidatePayments(created.invoiceId, created.customerId);
    return actionOk({ id: created.id, receiptNumber: created.receiptNumber });
  } catch (error) {
    return actionError(error);
  }
}

export async function markInvoicePaid(
  invoiceId: string,
): Promise<ActionResult<{ id: string; receiptNumber: string }>> {
  try {
    const user = await requireActionUser();
    const date = parseDateOnly(todayDateInput());
    if (!date) throw new AppError("Unable to determine today's date.");

    const created = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new AppError("Invoice not found.");
      if (invoice.status === InvoiceStatus.DRAFT) {
        throw new AppError("Finalize the draft invoice before recording a payment.");
      }
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new AppError("Cancelled invoices cannot receive payments.");
      }

      const total = D(invoice.total);
      const paid = D(invoice.paidAmount);
      const remaining = round2(total.sub(paid));
      if (remaining.lte(0)) throw new AppError("This invoice is already fully paid.");

      const sequence = await nextSequence(tx, "receipt");
      const receiptNumber = formatSequence("RCPT-", sequence);

      const payment = await tx.payment.create({
        data: {
          receiptNumber,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount: remaining,
          date,
          method: "CASH",
          note: "Marked as paid from invoice",
          createdById: user.id,
        },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: round2(total),
          dueAmount: round2(D(0)),
          status: InvoiceStatus.PAID,
        },
      });

      await writeAudit({
        tx,
        userId: user.id,
        action: "PAYMENT_RECORDED",
        entityType: "Payment",
        entityId: payment.id,
        details: {
          receiptNumber,
          invoiceNumber: invoice.invoiceNumber,
          amount: Number(remaining),
          method: "CASH",
          markedPaid: true,
        },
      });

      return {
        id: payment.id,
        receiptNumber,
        invoiceId: invoice.id,
        customerId: invoice.customerId,
      };
    });

    revalidatePayments(created.invoiceId, created.customerId);
    return actionOk({ id: created.id, receiptNumber: created.receiptNumber });
  } catch (error) {
    return actionError(error);
  }
}

export async function updatePayment(
  input: PaymentUpdateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionAdmin();
    const data = paymentUpdateSchema.parse(input);
    const date = parseDateOnly(data.date);
    if (!date) throw new AppError("Enter a valid payment date.");
    const amount = round2(D(data.amount));

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: data.id },
        include: { invoice: true },
      });
      if (!payment) throw new AppError("Payment not found.");
      if (payment.voidedAt) throw new AppError("Voided payments cannot be edited.");

      const invoice = payment.invoice;
      const basePaid = round2(D(invoice.paidAmount).sub(payment.amount));
      const newPaid = round2(basePaid.add(amount));
      if (newPaid.gt(invoice.total)) {
        throw new AppError(`Payment exceeds the invoice total. Maximum allowed is ${formatMoney(D(invoice.total).sub(basePaid))}.`);
      }
      const newDue = round2(D(invoice.total).sub(newPaid));
      const status = computeInvoiceStatus({
        isDraft: false,
        isCancelled: false,
        total: invoice.total,
        paid: newPaid,
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          amount,
          date,
          method: data.method,
          reference: data.reference || null,
          note: data.note || null,
        },
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paidAmount: newPaid, dueAmount: newDue, status },
      });

      await writeAudit({
        tx,
        userId: user.id,
        action: "PAYMENT_EDITED",
        entityType: "Payment",
        entityId: payment.id,
        details: {
          receiptNumber: payment.receiptNumber,
          invoiceNumber: invoice.invoiceNumber,
          oldAmount: Number(payment.amount),
          newAmount: Number(amount),
        },
      });

      return { id: payment.id, invoiceId: invoice.id, customerId: invoice.customerId };
    });

    revalidatePayments(result.invoiceId, result.customerId);
    return actionOk({ id: result.id });
  } catch (error) {
    return actionError(error);
  }
}

export async function voidPayment(input: { id: string; reason: string }): Promise<ActionResult<undefined>> {
  try {
    const user = await requireActionAdmin();
    const data = voidPaymentSchema.parse(input);

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: data.id },
        include: { invoice: true },
      });
      if (!payment) throw new AppError("Payment not found.");
      if (payment.voidedAt) throw new AppError("This payment is already voided.");

      const invoice = payment.invoice;
      const rawPaid = D(invoice.paidAmount).sub(payment.amount);
      const newPaid = rawPaid.isNegative() ? D(0) : round2(rawPaid);
      const newDue = round2(D(invoice.total).sub(newPaid));
      const status = computeInvoiceStatus({
        isDraft: false,
        isCancelled: false,
        total: invoice.total,
        paid: newPaid,
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          voidedAt: new Date(),
          voidedById: user.id,
          voidReason: data.reason,
        },
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paidAmount: newPaid, dueAmount: newDue, status },
      });

      await writeAudit({
        tx,
        userId: user.id,
        action: "PAYMENT_VOIDED",
        entityType: "Payment",
        entityId: payment.id,
        details: {
          receiptNumber: payment.receiptNumber,
          invoiceNumber: invoice.invoiceNumber,
          amount: Number(payment.amount),
          reason: data.reason,
        },
      });

      return { invoiceId: invoice.id, customerId: invoice.customerId };
    });

    revalidatePayments(result.invoiceId, result.customerId);
    return actionOk(undefined);
  } catch (error) {
    return actionError(error);
  }
}
