"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Receipt } from "lucide-react";
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
import { recordPayment } from "@/app/actions/payments";
import { paymentSchema, type PaymentInput } from "@/lib/validation";
import { formatMoney } from "@/lib/money";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { todayDateInput } from "@/lib/utils";

const selectClass =
  "h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function PaymentDialog({
  invoiceId,
  invoiceNumber,
  dueAmount,
  trigger,
}: {
  invoiceId: string;
  invoiceNumber: string;
  dueAmount: number;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId,
      amount: dueAmount,
      date: todayDateInput(),
      method: "CASH",
      reference: "",
      note: "",
    },
  });

  async function onSubmit(values: PaymentInput) {
    setPending(true);
    try {
      const result = await recordPayment(values);
      if (result.ok) {
        toast.success(`Payment recorded · ${result.data.receiptNumber}`);
        setOpen(false);
        reset({
          invoiceId,
          amount: Math.max(0, dueAmount - values.amount),
          date: todayDateInput(),
          method: "CASH",
          reference: "",
          note: "",
        });
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Receipt className="h-4 w-4" />
            Record payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {invoiceNumber} · balance due {formatMoney(dueAmount)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="payment-amount">Amount (৳)</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0.01"
                max={dueAmount}
                step="0.01"
                disabled={pending}
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount ? <ErrorText message={errors.amount.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-date">Date</Label>
              <Input
                id="payment-date"
                type="date"
                disabled={pending}
                {...register("date")}
              />
              {errors.date ? <ErrorText message={errors.date.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-method">Method</Label>
              <select
                id="payment-method"
                className={selectClass}
                disabled={pending}
                {...register("method")}
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-reference">Reference</Label>
              <Input
                id="payment-reference"
                placeholder="Transaction / cheque no."
                disabled={pending}
                {...register("reference")}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="payment-note">Note</Label>
              <Textarea
                id="payment-note"
                rows={2}
                disabled={pending}
                {...register("note")}
              />
            </div>
          </div>
          <input type="hidden" {...register("invoiceId")} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              Record payment
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
