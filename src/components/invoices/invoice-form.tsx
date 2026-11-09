"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import {
  ChevronDown,
  Loader2,
  Package,
  Plus,
  Save,
  Send,
  Trash2,
  Zap,
} from "lucide-react";
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
import { createInvoice, updateInvoice } from "@/app/actions/invoices";
import { invoiceInputSchema, type InvoiceInput } from "@/lib/validation";
import { computeInvoiceTotals } from "@/lib/invoice-calc";
import { formatMoney } from "@/lib/money";
import { saleLinePieces } from "@/lib/stock-math";
import {
  addDays,
  daysBetween,
  parseDateOnly,
  toDateInputValue,
  todayDateInput,
} from "@/lib/utils";
import { cn } from "@/lib/utils";

export type InvoiceProductOption = {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  color: string | null;
  piecesPerCarton: number;
  cartonPrice: string;
  piecePrice: string;
  stockPieces: number;
};

export type InvoiceCustomerOption = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  contactPerson: string | null;
};

export type InvoiceFormInitial = InvoiceInput & {
  id: string;
  invoiceNumber: string;
};

const emptyLine = {
  productId: "",
  description: "",
  unit: "CARTON" as const,
  quantity: 1,
  unitPrice: 0,
  piecesPerCarton: 1,
};

const selectClass =
  "h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

function normalizeManualTotal(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function InvoiceForm({
  products,
  customers,
  defaultTaxRate,
  defaultDate,
  defaultDueDate,
  canOverridePrice,
  initial,
  initialStatus,
  defaultIsQuick = false,
}: {
  products: InvoiceProductOption[];
  customers: InvoiceCustomerOption[];
  defaultTaxRate: number;
  defaultDate: string;
  defaultDueDate: string;
  canOverridePrice: boolean;
  initial?: InvoiceFormInitial;
  initialStatus?: string;
  defaultIsQuick?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"draft" | "final" | null>(null);
  const isEdit = Boolean(initial?.id);
  const showDraftButton = !isEdit || initialStatus === "DRAFT";

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceInputSchema),
    defaultValues:
      initial ??
      {
        isQuick: defaultIsQuick,
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        customerAddress: "",
        date: defaultDate,
        dueDate: defaultDueDate,
        paymentStatus: "UNPAID",
        amountPaid: 0,
        items: defaultIsQuick ? [] : [{ ...emptyLine }],
        discountType: "AMOUNT",
        discountValue: 0,
        taxRate: defaultTaxRate,
        shipping: 0,
        manualTotal: null,
        notes: "",
        terms: "",
      },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: "items" });
  const values = watch();
  const isQuick = Boolean(values.isQuick);
  const invoiceDate = parseDateOnly(values.date);
  const dueDate = parseDateOnly(values.dueDate);
  const dueInDays =
    invoiceDate && dueDate ? daysBetween(dueDate, invoiceDate) : null;
  const paymentStatus = values.paymentStatus ?? "UNPAID";
  const amountPaid = Number(values.amountPaid) || 0;

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const calc = useMemo(
    () =>
      computeInvoiceTotals({
        items: isQuick
          ? []
          : (values.items ?? []).map((line) => ({
              quantity: Number(line.quantity) || 0,
              unit: line.unit,
              unitPrice: Number(line.unitPrice) || 0,
              piecesPerCarton: Number(line.piecesPerCarton) || 1,
            })),
        discountType: values.discountType ?? "AMOUNT",
        discountValue: Number(values.discountValue) || 0,
        taxRate: Number(values.taxRate) || 0,
        shipping: Number(values.shipping) || 0,
        manualTotal: normalizeManualTotal(values.manualTotal),
      }),
    [isQuick, values],
  );
  const paidPreview =
    paymentStatus === "PAID"
      ? Number(calc.total)
      : paymentStatus === "PARTIALLY_PAID"
        ? amountPaid
        : 0;
  const duePreview = Math.max(0, Number(calc.total) - paidPreview);

  function handleCustomerName(name: string) {
    setValue("customerName", name);
    const match = customers.find(
      (customer) => customer.name.toLowerCase() === name.trim().toLowerCase(),
    );
    if (!match) return;
    setValue("customerPhone", match.phone ?? "");
    setValue("customerEmail", match.email ?? "");
    setValue("customerAddress", match.address ?? "");
  }

  function handleProductSelect(index: number, product: InvoiceProductOption) {
    setValue(`items.${index}.productId`, product.id);
    setValue(`items.${index}.description`, product.name);
    setValue(`items.${index}.piecesPerCarton`, product.piecesPerCarton);
    setValue(`items.${index}.unitPrice`, Number(product.cartonPrice));
    setValue(`items.${index}.unit`, "CARTON");
  }

  function handleUnitChange(index: number, unit: "CARTON" | "PIECE") {
    const productId = values.items?.[index]?.productId;
    const product = productId ? productsById.get(productId) : undefined;
    if (product) {
      setValue(
        `items.${index}.unitPrice`,
        Number(unit === "CARTON" ? product.cartonPrice : product.piecePrice),
      );
    }
  }

  function toggleQuick(quick: boolean) {
    if (quick) {
      replace([]);
    } else if (fields.length === 0) {
      replace([{ ...emptyLine }]);
    }
    setValue("isQuick", quick);
    setValue("manualTotal", null);
    clearErrors(["items", "manualTotal"]);
  }

  function setInvoiceDate(value: string) {
    setValue("date", value, { shouldValidate: true });
  }

  function setDueIn(days: number | null) {
    if (days === null) {
      setValue("dueDate", "", { shouldValidate: true });
      return;
    }
    const base = parseDateOnly(values.date) ?? new Date();
    setValue("dueDate", toDateInputValue(addDays(base, days)), { shouldValidate: true });
  }

  function setPaymentStatus(status: InvoiceInput["paymentStatus"]) {
    setValue("paymentStatus", status, { shouldValidate: true });
    if (status !== "PARTIALLY_PAID") {
      setValue("amountPaid", 0, { shouldValidate: true });
    }
    clearErrors("amountPaid");
  }

  function handleInvalid() {
    toast.error("Please check the highlighted fields.");
  }

  async function submit(values: InvoiceInput, saveAsDraft: boolean) {
    setPending(saveAsDraft ? "draft" : "final");
    try {
      const payload: InvoiceInput = {
        ...values,
        items: values.isQuick ? [] : values.items,
        manualTotal: normalizeManualTotal(values.manualTotal),
      };
      const result = initial?.id
        ? await updateInvoice({ ...payload, id: initial.id }, saveAsDraft)
        : await createInvoice(payload, saveAsDraft);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        saveAsDraft
          ? "Invoice saved as draft."
          : isEdit
            ? "Invoice updated."
            : "Invoice created.",
      );
      router.push(`/invoices/${result.data.id}`);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <form
      className="grid gap-5 xl:grid-cols-3"
      noValidate
      onSubmit={handleSubmit((formValues) => submit(formValues, false), handleInvalid)}
    >
      <datalist id="invoice-customers">
        {customers.map((customer) => (
          <option key={customer.id} value={customer.name}>
            {customer.contactPerson ?? ""}
          </option>
        ))}
      </datalist>
      <div className="space-y-5 xl:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice type</CardTitle>
            <CardDescription>
              Itemized invoices deduct stock. Quick invoices only record a name and total.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => toggleQuick(false)}
                className={cn(
                  "rounded-lg border p-4 text-left transition",
                  !isQuick
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-slate-300",
                )}
              >
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  <Package className="h-4 w-4" /> Itemized invoice
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Line items with carton/piece pricing. Stock deducts when finalized.
                </p>
              </button>
              <button
                type="button"
                onClick={() => toggleQuick(true)}
                className={cn(
                  "rounded-lg border p-4 text-left transition",
                  isQuick
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-slate-300",
                )}
              >
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  <Zap className="h-4 w-4" /> Quick invoice
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Customer and agreed total only. Best for fast counter sales.
                </p>
              </button>
            </div>
          </CardContent>
        </Card>

        {!isQuick ? (
          <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
            <CardDescription>
              Pick an existing customer to autofill their details, or enter a walk-in name.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="customerName">Customer name</Label>
              <Input
                id="customerName"
                list="invoice-customers"
                placeholder="Start typing a customer name..."
                disabled={pending !== null}
                {...register("customerName", {
                  onChange: (event) => handleCustomerName(event.target.value),
                })}
              />
              {errors.customerName ? <ErrorText message={errors.customerName.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                disabled={pending !== null}
                {...register("customerPhone")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                type="email"
                disabled={pending !== null}
                {...register("customerEmail")}
              />
              {errors.customerEmail ? <ErrorText message={errors.customerEmail.message} /> : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="customerAddress">Billing address</Label>
              <Input
                id="customerAddress"
                disabled={pending !== null}
                {...register("customerAddress")}
              />
            </div>
          </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/30 bg-primary/[0.02]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Quick invoice
              </CardTitle>
              <CardDescription>
                Just the customer and the agreed total. No stock is deducted.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="quickCustomerName">Customer name</Label>
                <Input
                  id="quickCustomerName"
                  list="invoice-customers"
                  placeholder="Customer or walk-in name"
                  disabled={pending !== null}
                  {...register("customerName", {
                    onChange: (event) => handleCustomerName(event.target.value),
                  })}
                />
                {errors.customerName ? (
                  <ErrorText message={errors.customerName.message} />
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quickCustomerPhone">Phone (optional)</Label>
                <Input
                  id="quickCustomerPhone"
                  disabled={pending !== null}
                  {...register("customerPhone")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quickTotal">Total amount (৳)</Label>
                <Input
                  id="quickTotal"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="h-11 text-lg font-semibold"
                  disabled={pending !== null}
                  {...register("manualTotal", {
                    setValueAs: (value) =>
                      value === "" || value === null || value === undefined
                        ? null
                        : Number(value),
                  })}
                />
                {errors.manualTotal ? (
                  <ErrorText message={errors.manualTotal.message} />
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}

        {!isQuick ? (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Items</CardTitle>
                <CardDescription>
                  Pick products and enter quantity; line taxes, subtotal and total are calculated automatically.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ ...emptyLine })}
                disabled={pending !== null || fields.length >= 200}
              >
                <Plus className="h-3.5 w-3.5" />
                Add line
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-slate-500">
                  No line items yet. Add a line to continue.
                </p>
              ) : null}

              {fields.map((field, index) => {
                const line = values.items?.[index];
                const product = line?.productId ? productsById.get(line.productId) : undefined;
                const quantity = Number(line?.quantity) || 0;
                const linePieces =
                  product && quantity >= 1
                    ? saleLinePieces(
                        (line?.unit ?? "CARTON") as "CARTON" | "PIECE",
                        quantity,
                        Math.max(1, product.piecesPerCarton),
                      )
                    : 0;
                const shortOnStock = product ? linePieces > product.stockPieces : false;
                const lineTotal =
                  (Number(line?.quantity) || 0) * (Number(line?.unitPrice) || 0);
                return (
                  <div key={field.id} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Line {index + 1}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => remove(index)}
                        disabled={pending !== null}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-12">
                      <div className="space-y-1.5 sm:col-span-6">
                        <Label>Product</Label>
                        <ProductSelect
                          products={products}
                          value={line?.productId ?? ""}
                          disabled={pending !== null}
                          onSelect={(selected) => handleProductSelect(index, selected)}
                        />
                        {errors.items?.[index]?.productId ? (
                          <ErrorText message={errors.items[index]?.productId?.message} />
                        ) : null}
                      </div>
                      <div className="space-y-1.5 sm:col-span-3">
                        <Label>Unit</Label>
                        <select
                          className={selectClass}
                          disabled={pending !== null}
                          {...register(`items.${index}.unit`, {
                            onChange: (event) =>
                              handleUnitChange(
                                index,
                                event.target.value === "PIECE" ? "PIECE" : "CARTON",
                              ),
                          })}
                        >
                          <option value="CARTON">Carton</option>
                          <option value="PIECE">Piece</option>
                        </select>
                      </div>
                      <div className="space-y-1.5 sm:col-span-3">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          disabled={pending !== null}
                          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        />
                        {errors.items?.[index]?.quantity ? (
                          <ErrorText message={errors.items[index]?.quantity?.message} />
                        ) : null}
                      </div>
                      <div className="space-y-1.5 sm:col-span-6">
                        <Label>Description</Label>
                        <Input
                          placeholder="Printed name or note"
                          disabled={pending !== null}
                          {...register(`items.${index}.description`)}
                        />
                        {errors.items?.[index]?.description ? (
                          <ErrorText message={errors.items[index]?.description?.message} />
                        ) : null}
                      </div>
                      <div className="space-y-1.5 sm:col-span-3">
                        <Label>Unit price (৳)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={pending !== null}
                          {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                        />
                        {errors.items?.[index]?.unitPrice ? (
                          <ErrorText message={errors.items[index]?.unitPrice?.message} />
                        ) : null}
                      </div>
                      <div className="flex flex-col justify-end sm:col-span-3">
                        <p className="text-xs text-slate-500">Line total</p>
                        <p className="text-base font-semibold text-slate-900">
                          {formatMoney(lineTotal)}
                        </p>
                      </div>
                    </div>

                    {product ? (
                      <p
                        className={cn(
                          "mt-2 text-[11px]",
                          shortOnStock ? "font-medium text-amber-700" : "text-slate-500",
                        )}
                      >
                        {product.sku} · {product.piecesPerCarton} pcs/carton ·{" "}
                        {product.stockPieces} pcs in stock
                        {line && Number(line.quantity) > 0
                          ? ` · needs ${linePieces} pcs`
                          : ""}
                        {shortOnStock ? " — exceeds available stock" : ""}
                      </p>
                    ) : null}
                    <input
                      type="hidden"
                      {...register(`items.${index}.piecesPerCarton`, {
                        setValueAs: (value) => Math.max(1, Number(value) || 1),
                      })}
                    />
                  </div>
                );
              })}
              {errors.items?.message ? <ErrorText message={errors.items.message} /> : null}
              {typeof errors.items?.root?.message === "string" ? (
                <ErrorText message={errors.items.root.message} />
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Dates</CardTitle>
            <CardDescription>
              Pick a preset or fine-tune the dates. Due dates are optional.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">Invoice date</Label>
              <Input id="date" type="date" disabled={pending !== null} {...register("date")} />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setInvoiceDate(todayDateInput())}
                  disabled={pending !== null}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                    values.date === todayDateInput()
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-slate-600 hover:border-slate-300",
                  )}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const base = parseDateOnly(values.date) ?? new Date();
                    setInvoiceDate(toDateInputValue(addDays(base, -1)));
                  }}
                  disabled={pending !== null}
                  className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300"
                >
                  Yesterday
                </button>
              </div>
              {errors.date ? <ErrorText message={errors.date.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due date</Label>
              <Input
                id="dueDate"
                type="date"
                disabled={pending !== null}
                {...register("dueDate")}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[7, 15, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDueIn(days)}
                    disabled={pending !== null}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                      dueInDays === days
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-slate-600 hover:border-slate-300",
                    )}
                  >
                    {days} days
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDueIn(null)}
                  disabled={pending !== null}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                    !values.dueDate
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-slate-600 hover:border-slate-300",
                  )}
                >
                  No due date
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                {dueInDays === null
                  ? "No due date set."
                  : dueInDays < 0
                    ? "Due date is before the invoice date."
                    : `Due in ${dueInDays} day${dueInDays === 1 ? "" : "s"} from the invoice date.`}
              </p>
              {errors.dueDate ? <ErrorText message={errors.dueDate.message} /> : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder={
                  isQuick
                    ? "Optional note for this quick sale."
                    : "Visible to your team on the invoice."
                }
                disabled={pending !== null}
                {...register("notes")}
              />
            </div>
            {!isQuick ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="terms">Terms</Label>
                <Textarea
                  id="terms"
                  rows={2}
                  placeholder="Payment terms printed on the invoice."
                  disabled={pending !== null}
                  {...register("terms")}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment status</CardTitle>
            <CardDescription>
              Record what the customer has paid now. Any amount above zero creates a receipt automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "UNPAID", label: "Unpaid" },
                  { value: "PARTIALLY_PAID", label: "Partially paid" },
                  { value: "PAID", label: "Paid" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPaymentStatus(option.value)}
                  disabled={pending !== null}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-medium transition",
                    paymentStatus === option.value
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                      : "border-border text-slate-600 hover:border-slate-300",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {paymentStatus === "PARTIALLY_PAID" ? (
              <div className="space-y-1.5">
                <Label htmlFor="amountPaid">Amount received now (৳)</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={Number(calc.total) || undefined}
                  disabled={pending !== null}
                  {...register("amountPaid", { valueAsNumber: true })}
                />
                {errors.amountPaid ? (
                  <ErrorText message={errors.amountPaid.message} />
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <div className="flex justify-between gap-3">
                <span>Recorded as paid</span>
                <span className="font-medium text-slate-900">{formatMoney(paidPreview)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Balance after saving</span>
                <span className="font-medium text-slate-900">{formatMoney(duePreview)}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              {paymentStatus === "PAID"
                ? "The full total will be recorded as paid."
                : paymentStatus === "PARTIALLY_PAID"
                  ? "Only the amount entered will be recorded as paid."
                  : "The full balance will remain due."}
              {showDraftButton ? " Saving as a draft does not record a payment." : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              {isQuick ? "Quick invoice" : `${values.items?.length ?? 0} line item(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isQuick ? (
              <>
                <div className="space-y-2 text-sm">
                  <SummaryRow label="Subtotal" value={formatMoney(calc.subtotal)} />
                  <details className="border-t border-border pt-2">
                    <summary className="cursor-pointer text-xs font-medium text-slate-500">
                      Discount, tax and shipping
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-slate-600">
                        <span>Discount</span>
                        <div className="flex items-center gap-1">
                          <select
                            className="h-8 rounded-md border border-input bg-white px-2 text-xs"
                            disabled={pending !== null}
                            {...register("discountType")}
                          >
                            <option value="AMOUNT">৳</option>
                            <option value="PERCENT">%</option>
                          </select>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="h-8 w-24 text-right"
                            disabled={pending !== null}
                            {...register("discountValue", {
                              setValueAs: (value) => (value === "" ? 0 : Number(value)),
                            })}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-slate-600">
                        <span>Tax rate (%)</span>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="h-8 w-24 text-right"
                          disabled={pending !== null}
                          {...register("taxRate", {
                            setValueAs: (value) => (value === "" ? 0 : Number(value)),
                          })}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-slate-600">
                        <span>Shipping</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-8 w-24 text-right"
                          disabled={pending !== null}
                          {...register("shipping", {
                            setValueAs: (value) => (value === "" ? 0 : Number(value)),
                          })}
                        />
                      </div>
                      {Number(calc.discountAmount) > 0 ? (
                        <SummaryRow
                          label="Discount applied"
                          value={`− ${formatMoney(calc.discountAmount)}`}
                        />
                      ) : null}
                      {Number(calc.taxAmount) > 0 ? (
                        <SummaryRow label="Tax" value={formatMoney(calc.taxAmount)} />
                      ) : null}
                      {Number(calc.shipping) > 0 ? (
                        <SummaryRow label="Shipping" value={formatMoney(calc.shipping)} />
                      ) : null}
                    </div>
                  </details>
                </div>

                {canOverridePrice ? (
                  <details className="border-t border-border pt-3">
                    <summary className="cursor-pointer text-xs font-medium text-slate-500">
                      Advanced: override final total
                    </summary>
                    <div className="mt-2 space-y-1.5">
                      <Label htmlFor="manualTotal" className="text-xs">
                        Override total (optional)
                      </Label>
                      <Input
                        id="manualTotal"
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-9"
                        disabled={pending !== null}
                        {...register("manualTotal", {
                          setValueAs: (value) =>
                            value === "" || value === null || value === undefined
                              ? null
                              : Number(value),
                        })}
                      />
                      <p className="text-[11px] text-slate-500">
                        Calculated total: {formatMoney(calc.calculatedTotal)}
                      </p>
                    </div>
                  </details>
                ) : null}
              </>
            ) : null}

            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <span className="text-sm font-medium text-slate-600">Total</span>
              <span className="text-2xl font-semibold text-slate-900">
                {formatMoney(calc.total)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 pt-5">
            <Button type="submit" className="w-full" disabled={pending !== null}>
              {pending === "final" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEdit ? (
                <Save className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isEdit ? "Save invoice" : "Create invoice"}
            </Button>
            {showDraftButton ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={pending !== null}
                onClick={handleSubmit(
                  (formValues) => submit(formValues, true),
                  handleInvalid,
                )}
              >
                {pending === "draft" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save as draft
              </Button>
            ) : null}
            <Button type="button" variant="ghost" className="w-full" asChild disabled={pending !== null}>
              <Link href={initial?.id ? `/invoices/${initial.id}` : "/invoices"}>Cancel</Link>
            </Button>
            <p className="pt-1 text-center text-[11px] text-slate-400">
              Totals are recalculated securely on the server before saving.
            </p>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

function ProductSelect({
  products,
  value,
  disabled,
  onSelect,
}: {
  products: InvoiceProductOption[];
  value: string;
  disabled: boolean;
  onSelect: (product: InvoiceProductOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = useMemo(
    () => products.find((product) => product.id === value),
    [products, value],
  );
  const filtered = useMemo(() => {
    if (!open) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return products.slice(0, 30);
    return products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(needle) ||
          product.sku.toLowerCase().includes(needle) ||
          (product.brand ?? "").toLowerCase().includes(needle) ||
          (product.color ?? "").toLowerCase().includes(needle),
      )
      .slice(0, 30);
  }, [open, products, query]);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-white px-3 text-left text-sm shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
          !selected && "text-slate-400",
        )}
      >
        <span className="truncate">
          {selected ? `${selected.name} (${selected.sku})` : value ? "Product unavailable" : "Select product"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close product list"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-white p-2 shadow-lg">
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, SKU, brand..."
              className="h-9"
            />
            <div className="mt-2 max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-slate-500">
                  No products match.
                </p>
              ) : (
                filtered.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      onSelect(product);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full items-start justify-between gap-2 rounded px-2 py-2 text-left text-sm hover:bg-slate-100"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900">
                        {product.name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {product.sku}
                        {product.brand ? ` · ${product.brand}` : ""}
                        {product.color ? ` · ${product.color}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-slate-500">
                      <span className="block">{formatMoney(product.cartonPrice)}/ctn</span>
                      <span className={cn(product.stockPieces <= 0 && "text-amber-700")}>
                        {product.stockPieces} pcs
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-red-600">{message}</p>;
}
