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
import { createSupplier, updateSupplier } from "@/app/actions/suppliers";
import { supplierSchema, type SupplierInput } from "@/lib/validation";

export type SupplierFormInitial = SupplierInput & { id?: string };

const emptyValues: SupplierInput = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  active: true,
};

export function SupplierForm({ initial }: { initial?: SupplierFormInitial }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const isEdit = Boolean(initial?.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: initial ?? emptyValues,
  });

  async function onSubmit(values: SupplierInput) {
    setPending(true);
    try {
      const result = initial?.id
        ? await updateSupplier({ ...values, id: initial.id })
        : await createSupplier(values);
      if (result.ok) {
        toast.success(isEdit ? "Supplier updated." : "Supplier added.");
        router.push("/suppliers");
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
          <CardTitle>Supplier details</CardTitle>
          <CardDescription>
            Suppliers are used when receiving stock. Staff cannot access supplier management.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="supplier-name">Supplier name</Label>
            <Input
              id="supplier-name"
              placeholder="e.g. Global Print Supplies"
              disabled={pending}
              {...register("name")}
            />
            {errors.name ? <ErrorText message={errors.name.message} /> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactPerson">Contact person</Label>
            <Input id="contactPerson" disabled={pending} {...register("contactPerson")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" placeholder="+880..." disabled={pending} {...register("phone")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="orders@supplier.com"
              disabled={pending}
              {...register("email")}
            />
            {errors.email ? <ErrorText message={errors.email.message} /> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" disabled={pending} {...register("address")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Payment terms, lead time, preferred brands..."
              disabled={pending}
              {...register("notes")}
            />
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-border bg-slate-50/60 p-3 sm:col-span-2">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-ring"
              disabled={pending}
              {...register("active")}
            />
            <span>
              <span className="block text-sm font-medium text-slate-900">Active supplier</span>
              <span className="block text-xs text-slate-500">
                Inactive suppliers are hidden from new stock-in entries.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-24 lg:self-start">
        <CardHeader>
          <CardTitle>{isEdit ? "Save changes" : "Add supplier"}</CardTitle>
          <CardDescription>Supplier records are audited for accountability.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Save supplier" : "Create supplier"}
          </Button>
          <Button type="button" variant="outline" className="w-full" asChild disabled={pending}>
            <Link href="/suppliers">Cancel</Link>
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
