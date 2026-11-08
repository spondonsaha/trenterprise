"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Pencil,
  Printer,
  Receipt,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PaymentDialog } from "@/components/payments/payment-dialog";
import {
  cancelInvoice,
  deleteDraftInvoice,
  duplicateInvoice,
  finalizeInvoice,
} from "@/app/actions/invoices";
import { markInvoicePaid } from "@/app/actions/payments";
import { formatMoney } from "@/lib/money";

export function InvoiceActions({
  id,
  invoiceNumber,
  status,
  dueAmount,
  hasLivePayments,
  isAdmin,
}: {
  id: string;
  invoiceNumber: string;
  status: string;
  dueAmount: number;
  hasLivePayments: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [duplicating, setDuplicating] = useState(false);

  const canFinalize = status === "DRAFT";
  const canEdit = status !== "CANCELLED" && !hasLivePayments;
  const canPay = status !== "DRAFT" && status !== "CANCELLED" && dueAmount > 0;
  const canCancel = isAdmin && status !== "CANCELLED" && !hasLivePayments;
  const canDelete = isAdmin && status === "DRAFT";

  async function duplicate() {
    setDuplicating(true);
    try {
      const result = await duplicateInvoice(id);
      if (result.ok) {
        toast.success("Invoice duplicated as a draft.");
        router.push(`/invoices/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    } finally {
      setDuplicating(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
      {canFinalize ? (
        <ConfirmDialog
          title={`Finalize ${invoiceNumber}?`}
          description="This will deduct the invoiced stock and mark the invoice as unpaid so payments can be recorded. You can still edit it until a payment is added."
          confirmLabel="Finalize invoice"
          successMessage="Invoice finalized."
          destructive={false}
          onConfirm={() => finalizeInvoice(id)}
          onSuccess={() => router.refresh()}
          trigger={
            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Finalize
            </Button>
          }
        />
      ) : null}
      {canPay ? (
        <>
          <ConfirmDialog
            title={`Mark ${invoiceNumber} as paid?`}
            description={`This records the remaining ${formatMoney(dueAmount)} as a cash payment and marks the invoice paid.`}
            confirmLabel="Mark paid"
            successMessage="Invoice marked as paid."
            destructive={false}
            onConfirm={() => markInvoicePaid(id)}
            onSuccess={() => router.refresh()}
            trigger={
              <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark paid
              </Button>
            }
          />
          <PaymentDialog
            invoiceId={id}
            invoiceNumber={invoiceNumber}
            dueAmount={dueAmount}
            trigger={
              <Button variant="outline" size="sm">
                <Receipt className="h-3.5 w-3.5" />
                Record payment
              </Button>
            }
          />
        </>
      ) : null}
      {canEdit ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/invoices/${id}/edit`}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        </Button>
      ) : null}
      <Button variant="outline" size="sm" asChild>
        <Link href={`/invoices/${id}/print`} target="_blank">
          <Printer className="h-3.5 w-3.5" />
          Print
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noreferrer">
          <Download className="h-3.5 w-3.5" />
          PDF
        </a>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={duplicate}
        disabled={duplicating}
      >
        {duplicating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        Duplicate
      </Button>
      {canCancel ? (
        <ConfirmDialog
          title={`Cancel ${invoiceNumber}?`}
          description="Stock from this invoice will be returned to inventory and the invoice marked cancelled. This cannot be undone."
          confirmLabel="Cancel invoice"
          successMessage="Invoice cancelled."
          onConfirm={() => cancelInvoice(id)}
          trigger={
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
              <Ban className="h-3.5 w-3.5" />
              Cancel
            </Button>
          }
        />
      ) : null}
      {canDelete ? (
        <ConfirmDialog
          title={`Delete draft ${invoiceNumber}?`}
          description="This draft has no stock effect or payments. Deleting it cannot be undone."
          confirmLabel="Delete draft"
          successMessage="Draft deleted."
          onConfirm={() => deleteDraftInvoice(id)}
          onSuccess={() => {
            router.push("/invoices");
            router.refresh();
          }}
          trigger={
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
