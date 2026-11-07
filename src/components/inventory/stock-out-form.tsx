"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpFromLine, Loader2 } from "lucide-react";
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
import { createStockOut } from "@/app/actions/inventory";
import { formatStock } from "@/lib/stock-math";
import { todayDateInput } from "@/lib/utils";
import type { StockProductOption } from "@/components/inventory/stock-in-form";

const selectClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function StockOutForm({
  products,
  defaultProductId,
  allowNegative,
}: {
  products: StockProductOption[];
  defaultProductId?: string;
  allowNegative: boolean;
}) {
  const router = useRouter();
  const [productId, setProductId] = useState(defaultProductId ?? "");
  const [unit, setUnit] = useState<"CARTON" | "PIECE">("PIECE");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(todayDateInput());
  const [pending, setPending] = useState(false);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const product = productMap.get(productId);
  const qty = Number(quantity) || 0;
  const requiredPieces = product
    ? unit === "CARTON"
      ? qty * product.piecesPerCarton
      : qty
    : 0;
  const remaining = product ? product.stockPieces - requiredPieces : 0;
  const insufficient = Boolean(product) && requiredPieces > 0 && remaining < 0 && !allowNegative;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) {
      toast.error("Select a product.");
      return;
    }
    if (qty < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }
    if (insufficient) {
      toast.error("Not enough stock for this stock-out.");
      return;
    }

    setPending(true);
    try {
      const result = await createStockOut({
        productId,
        unit,
        quantity: qty,
        reason,
        date,
      });
      if (result.ok) {
        toast.success(
          `Stock out recorded. ${product.name} now has ${formatStock(result.data.stockPieces, product.piecesPerCarton)}.`,
        );
        router.push("/inventory");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Record stock out</CardTitle>
          <CardDescription>
            Use this for damages, samples, internal use or stock corrections. Sales should be
            invoiced instead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="out-product">Product</Label>
              <select
                id="out-product"
                className={selectClass}
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                disabled={pending}
                required
              >
                <option value="">Select a product</option>
                {products.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({option.sku})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="out-unit">Unit</Label>
                <select
                  id="out-unit"
                  className={selectClass}
                  value={unit}
                  onChange={(event) => setUnit(event.target.value as "CARTON" | "PIECE")}
                  disabled={pending}
                >
                  <option value="PIECE">Pieces</option>
                  <option value="CARTON">Cartons</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="out-quantity">Quantity</Label>
                <Input
                  id="out-quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  disabled={pending}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="out-reason">Reason</Label>
              <Textarea
                id="out-reason"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Damaged cartons, sample to customer..."
                disabled={pending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="out-date">Date</Label>
              <Input
                id="out-date"
                type="date"
                value={date}
                max={todayDateInput()}
                onChange={(event) => setDate(event.target.value)}
                disabled={pending}
                required
              />
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" asChild disabled={pending}>
                <Link href="/inventory">Cancel</Link>
              </Button>
              <Button type="submit" variant="teal" disabled={pending || insufficient || !product}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpFromLine className="h-4 w-4" />
                )}
                Record stock out
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-24 lg:self-start">
        <CardHeader>
          <CardTitle>Stock impact</CardTitle>
          <CardDescription>Availability for the selected product.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-border pb-3">
            <span className="text-slate-500">Current stock</span>
            <span className="font-medium text-slate-900">
              {product ? formatStock(product.stockPieces, product.piecesPerCarton) : "—"}
            </span>
          </div>
          <div className="flex justify-between border-b border-border pb-3">
            <span className="text-slate-500">Pieces per carton</span>
            <span className="font-medium text-slate-900">
              {product?.piecesPerCarton ?? "—"}
            </span>
          </div>
          <div className="flex justify-between border-b border-border pb-3">
            <span className="text-slate-500">Pieces to remove</span>
            <span className="font-medium text-slate-900">{requiredPieces || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Remaining after</span>
            <span
              className={
                remaining < 0 ? "font-semibold text-red-600" : "font-semibold text-slate-900"
              }
            >
              {product ? `${remaining} pcs` : "—"}
            </span>
          </div>
          {insufficient ? (
            <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
              This would take stock negative. Reduce the quantity or enable negative stock in
              settings.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
