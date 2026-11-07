"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Building2, Loader2, Save, Upload, X } from "lucide-react";
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
import { updateSettings } from "@/app/actions/settings";
import { settingSchema, type SettingInput } from "@/lib/validation";
import { COMPANY_NAME } from "@/lib/constants";

export type SettingsFormValues = {
  address: string;
  phone: string;
  email: string;
  currency: string;
  currencySymbol: string;
  invoicePrefix: string;
  defaultTaxRate: number;
  invoiceFooterNote: string;
  allowNegativeStock: boolean;
  logoUrl?: string | null;
};

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [logo, setLogo] = useState<string | undefined>(initial.logoUrl ?? undefined);
  const [logoError, setLogoError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingInput>({
    resolver: zodResolver(settingSchema),
    defaultValues: {
      address: initial.address,
      phone: initial.phone,
      email: initial.email,
      currency: initial.currency,
      currencySymbol: initial.currencySymbol,
      invoicePrefix: initial.invoicePrefix,
      defaultTaxRate: initial.defaultTaxRate,
      invoiceFooterNote: initial.invoiceFooterNote,
      allowNegativeStock: initial.allowNegativeStock,
      logoUrl: initial.logoUrl ?? undefined,
    },
  });

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Choose an image file.");
      return;
    }
    if (file.size > 600 * 1024) {
      setLogoError("Logo must be under 600 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoError(null);
      setLogo(typeof reader.result === "string" ? reader.result : undefined);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function onSubmit(values: SettingInput) {
    setPending(true);
    try {
      const result = await updateSettings({ ...values, logoUrl: logo });
      if (result.ok) {
        toast.success("Settings updated.");
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
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Business profile</CardTitle>
            <CardDescription>
              Contact details printed on invoices, receipts and reports for {COMPANY_NAME}.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Business address</Label>
              <Textarea id="address" rows={2} disabled={pending} {...register("address")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" disabled={pending} {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" disabled={pending} {...register("email")} />
              {errors.email ? <ErrorText message={errors.email.message} /> : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="invoiceFooterNote">Invoice footer note</Label>
              <Textarea
                id="invoiceFooterNote"
                rows={2}
                placeholder="Thank you for your business."
                disabled={pending}
                {...register("invoiceFooterNote")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Currency &amp; numbering</CardTitle>
            <CardDescription>
              Applied to new invoices only. Existing invoice numbers never change.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency code</Label>
              <Input id="currency" placeholder="BDT" disabled={pending} {...register("currency")} />
              {errors.currency ? <ErrorText message={errors.currency.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currencySymbol">Currency symbol</Label>
              <Input
                id="currencySymbol"
                placeholder="৳"
                disabled={pending}
                {...register("currencySymbol")}
              />
              {errors.currencySymbol ? (
                <ErrorText message={errors.currencySymbol.message} />
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoicePrefix">Invoice prefix</Label>
              <Input
                id="invoicePrefix"
                placeholder="INV-"
                disabled={pending}
                {...register("invoicePrefix")}
              />
              {errors.invoicePrefix ? <ErrorText message={errors.invoicePrefix.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="defaultTaxRate">Default tax rate (%)</Label>
              <Input
                id="defaultTaxRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                disabled={pending}
                {...register("defaultTaxRate", { valueAsNumber: true })}
              />
              {errors.defaultTaxRate ? (
                <ErrorText message={errors.defaultTaxRate.message} />
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory behaviour</CardTitle>
            <CardDescription>Controls how invoices and stock movements behave.</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex items-start gap-3 rounded-lg border border-border bg-slate-50/60 p-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-ring"
                disabled={pending}
                {...register("allowNegativeStock")}
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">
                  Allow negative stock
                </span>
                <span className="block text-xs text-slate-500">
                  By default invoices cannot deduct more pieces than are in stock. Enable only if
                  you sell before recording stock in.
                </span>
              </span>
            </label>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>PNG or JPG under 600 KB. Used on printed documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border bg-slate-50">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="Company logo preview" className="max-h-24 max-w-full object-contain" />
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <Building2 className="h-7 w-7" />
                  <span className="mt-1 text-xs">No logo uploaded</span>
                </div>
              )}
            </div>
            {logoError ? <p className="text-xs font-medium text-red-600">{logoError}</p> : null}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" asChild disabled={pending}>
                <label className="cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={handleLogoChange}
                    disabled={pending}
                  />
                </label>
              </Button>
              {logo ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogo("")}
                  disabled={pending}
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-5">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save settings
            </Button>
            <p className="text-center text-[11px] text-slate-400">
              Settings changes are recorded in the audit log.
            </p>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-red-600">{message}</p>;
}
