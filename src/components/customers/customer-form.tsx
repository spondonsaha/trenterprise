"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createCustomer, updateCustomer } from "@/app/actions/customers";
import { customerSchema, type CustomerInput } from "@/lib/validation";

export type CustomerFormInitial = CustomerInput & { id?: string };

const emptyValues: CustomerInput = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  openingBalance: 0,
  active: true,
};

export function CustomerForm({
  initial,
  isAdmin,
}: {
  initial?: CustomerFormInitial;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const isEdit = Boolean(initial?.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: initial ?? emptyValues,
  });

  async function onSubmit(values: CustomerInput) {
    setPending(true);
    try {
      const result = initial?.id
        ? await updateCustomer({ ...values, id: initial.id })
        : await createCustomer(values);
      if (result.ok) {
        toast.success(isEdit ? "Customer updated." : "Customer created.");
        router.push(`/customers/${result.data.id}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Customer details</CardTitle>
          <CardDescription>
            Used to prefill invoices and keep a receivable ledger for each buyer.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="customer-name">Company / customer name</Label>
            <Input
              id="customer-name"
              placeholder="e.g. Dhaka Print House"
              disabled={pending}
              {...register("name")}
            />
            {errors.name ? <ErrorText message={errors.name.message} /> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer-contact">Contact person</Label>
            <Input id="customer-contact" disabled={pending} {...register("contactPerson")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer-phone">Phone</Label>
            <Input id="customer-phone" placeholder="+880..." disabled={pending} {...register("phone")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer-email">Email</Label>
            <Input
              id="customer-email"
              type="email"
              placeholder="accounts@customer.com"
              disabled={pending}
              {...register("email")}
            />
            {errors.email ? <ErrorText message={errors.email.message} /> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer-address">Address</Label>
            <Input id="customer-address" disabled={pending} {...register("address")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer-opening">Opening balance (৳)</Label>
            <Input
              id="customer-opening"
              type="number"
              step="0.01"
              min="0"
              disabled={pending}
              {...register("openingBalance", { valueAsNumber: true })}
            />
            {errors.openingBalance ? <ErrorText message={errors.openingBalance.message} /> : null}
            <p className="text-[11px] text-slate-500">
              Previous dues carried into this system. It appears as a debit in the ledger.
            </p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="customer-notes">Notes</Label>
            <Textarea
              id="customer-notes"
              rows={3}
              placeholder="Credit terms, delivery preferences..."
              disabled={pending}
              {...register("notes")}
            />
          </div>
          {isAdmin ? (
            <label className="flex items-start gap-3 rounded-lg border border-border bg-slate-50/60 p-3 sm:col-span-2">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-ring"
                disabled={pending}
                {...register("active")}
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">Active customer</span>
                <span className="block text-xs text-slate-500">
                  Inactive customers remain in history but are hidden from new invoices.
                </span>
              </span>
            </label>
          ) : (
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 sm:col-span-2">
              Only admins can activate or deactivate customer accounts.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-24 lg:self-start">
        <CardHeader>
          <CardTitle>{isEdit ? "Save changes" : "Create customer"}</CardTitle>
          <CardDescription>Changes are recorded in the audit log.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Save customer" : "Create customer"}
          </Button>
          <Button type="button" variant="outline" className="w-full" asChild disabled={pending}>
            <Link href={initial?.id ? `/customers/${initial.id}` : "/customers"}>Cancel</Link>
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-red-600">{message}</p>;
}
