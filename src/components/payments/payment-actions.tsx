"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Ban, Download, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updatePayment, voidPayment } from "@/app/actions/payments";
import {
  paymentUpdateSchema,
  voidPaymentSchema,
  type PaymentUpdateInput,
  type VoidPaymentInput,
} from "@/lib/validation";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { toDateInputValue } from "@/lib/utils";

const selectClass =
  "h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function PaymentActions({
  id,
  receiptNumber,
  amount,
  date,
  method,
  reference,
  note,
  voided,
  isAdmin,
}: {
  id: string;
  receiptNumber: string;
  amount: number;
  date: string;
  method: string;
  reference: string | null;
  note: string | null;
  voided: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="outline" size="sm" asChild>
        <a href={`/api/payments/${id}/receipt`} target="_blank" rel="noreferrer">
          <Download className="h-3.5 w-3.5" />
          Receipt
        </a>
      </Button>
      {isAdmin && !voided ? (
        <>
          <EditPaymentDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            payment={{ id, receiptNumber, amount, date, method, reference, note }}
            onSaved={() => {
              setEditOpen(false);
              router.refresh();
            }}
          />
          <VoidPaymentDialog
            open={voidOpen}
            onOpenChange={setVoidOpen}
            payment={{ id, receiptNumber, amount }}
            onVoided={() => {
              setVoidOpen(false);
              router.refresh();
            }}
          />
        </>
      ) : null}
    </div>
  );
}

function EditPaymentDialog({
  open,
  onOpenChange,
  payment,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: {
    id: string;
    receiptNumber: string;
    amount: number;
    date: string;
    method: string;
    reference: string | null;
    note: string | null;
  };
  onSaved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentUpdateInput>({
    resolver: zodResolver(paymentUpdateSchema),
    defaultValues: {
      id: payment.id,
      amount: payment.amount,
      date: toDateInputValue(payment.date),
      method: payment.method as PaymentUpdateInput["method"],
      reference: payment.reference ?? "",
      note: payment.note ?? "",
    },
  });

  async function onSubmit(values: PaymentUpdateInput) {
    setPending(true);
    try {
      const result = await updatePayment(values);
      if (result.ok) {
        toast.success("Payment updated.");
        onSaved();
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && pending) return;
        if (next) {
          reset({
            id: payment.id,
            amount: payment.amount,
            date: toDateInputValue(payment.date),
            method: payment.method as PaymentUpdateInput["method"],
            reference: payment.reference ?? "",
            note: payment.note ?? "",
          });
        }
        onOpenChange(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit payment {payment.receiptNumber}</DialogTitle>
          <DialogDescription>
            Correcting a payment recalculates the invoice balance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-amount-${payment.id}`}>Amount (৳)</Label>
              <Input
                id={`edit-amount-${payment.id}`}
                type="number"
                min="0.01"
                step="0.01"
                disabled={pending}
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount ? <ErrorText message={errors.amount.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-date-${payment.id}`}>Date</Label>
              <Input
                id={`edit-date-${payment.id}`}
                type="date"
                disabled={pending}
                {...register("date")}
              />
              {errors.date ? <ErrorText message={errors.date.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <select className={selectClass} disabled={pending} {...register("method")}>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input disabled={pending} {...register("reference")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Note</Label>
              <Textarea rows={2} disabled={pending} {...register("note")} />
            </div>
          </div>
          <input type="hidden" {...register("id")} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VoidPaymentDialog({
  open,
  onOpenChange,
  payment,
  onVoided,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: { id: string; receiptNumber: string; amount: number };
  onVoided: () => void;
}) {
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VoidPaymentInput>({
    resolver: zodResolver(voidPaymentSchema),
    defaultValues: { id: payment.id, reason: "" },
  });

  async function onSubmit(values: VoidPaymentInput) {
    setPending(true);
    try {
      const result = await voidPayment(values);
      if (result.ok) {
        toast.success("Payment voided.");
        onVoided();
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && pending) return;
        if (next) reset({ id: payment.id, reason: "" });
        onOpenChange(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
          <Ban className="h-3.5 w-3.5" />
          Void
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void payment {payment.receiptNumber}?</DialogTitle>
          <DialogDescription>
            The {formatMoney(payment.amount)} payment will be reversed from the invoice balance.
            The record is kept for audit purposes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`void-reason-${payment.id}`}>Reason</Label>
            <Textarea
              id={`void-reason-${payment.id}`}
              rows={3}
              placeholder="Why is this payment being voided?"
              disabled={pending}
              {...register("reason")}
            />
            {errors.reason ? <ErrorText message={errors.reason.message} /> : null}
          </div>
          <input type="hidden" {...register("id")} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Void payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-red-600">{message}</p>;
}
