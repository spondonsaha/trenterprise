"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2 } from "lucide-react";
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
import { adjustStock } from "@/app/actions/inventory";
import { formatStock } from "@/lib/stock-math";
import { todayDateInput } from "@/lib/utils";
import type { StockProductOption } from "@/components/inventory/stock-in-form";

const selectClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function AdjustStockForm({
  products,
  defaultProductId,
}: {
  products: StockProductOption[];
  defaultProductId?: string;
}) {
  const router = useRouter();
  const initial = products.find((product) => product.id === defaultProductId);
  const [productId, setProductId] = useState(initial?.id ?? "");
  const [countedCartons, setCountedCartons] = useState(() =>
    initial ? String(Math.floor(initial.stockPieces / initial.piecesPerCarton)) : "0",
  );
  const [countedPieces, setCountedPieces] = useState(() =>
    initial ? String(initial.stockPieces % initial.piecesPerCarton) : "0",
  );
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(todayDateInput());
  const [pending, setPending] = useState(false);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const product = productMap.get(productId);
  const counted = product
    ? (Number(countedCartons) || 0) * product.piecesPerCarton + (Number(countedPieces) || 0)
    : 0;
  const difference = product ? counted - product.stockPieces : 0;

  function handleProductChange(nextId: string) {
    setProductId(nextId);
    const next = productMap.get(nextId);
    if (next) {
      setCountedCartons(String(Math.floor(next.stockPieces / next.piecesPerCarton)));
      setCountedPieces(String(next.stockPieces % next.piecesPerCarton));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) {
      toast.error("Select a product.");
      return;
    }
    setPending(true);
    try {
      const result = await adjustStock({
        productId,
        countedCartons: Number(countedCartons) || 0,
        countedPieces: Number(countedPieces) || 0,
        reason,
        date,
      });
      if (result.ok) {
        toast.success(
          `Stock adjusted by ${result.data.difference > 0 ? "+" : ""}${result.data.difference} pieces.`,
        );
        router.push(`/products/${productId}`);
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
          <CardTitle>Physical stock count</CardTitle>
          <CardDescription>
            Enter the quantity you actually counted. The ledger records the difference from the
            system balance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="adjust-product">Product</Label>
              <select
                id="adjust-product"
                className={selectClass}
                value={productId}
                onChange={(event) => handleProductChange(event.target.value)}
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
                <Label htmlFor="counted-cartons">Counted cartons</Label>
                <Input
                  id="counted-cartons"
                  type="number"
                  min="0"
                  step="1"
                  value={countedCartons}
                  onChange={(event) => setCountedCartons(event.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="counted-pieces">Counted loose pieces</Label>
                <Input
                  id="counted-pieces"
                  type="number"
                  min="0"
                  step="1"
                  value={countedPieces}
                  onChange={(event) => setCountedPieces(event.target.value)}
                  disabled={pending}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjust-reason">Reason</Label>
              <Textarea
                id="adjust-reason"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Monthly physical count, damaged goods write-off..."
                disabled={pending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjust-date">Date</Label>
              <Input
                id="adjust-date"
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
              <Button type="submit" disabled={pending || !product}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardList className="h-4 w-4" />
                )}
                Post adjustment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-24 lg:self-start">
        <CardHeader>
          <CardTitle>Count comparison</CardTitle>
          <CardDescription>System versus physical count.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-border pb-3">
            <span className="text-slate-500">System stock</span>
            <span className="font-medium text-slate-900">
              {product ? `${product.stockPieces} pcs` : "—"}
            </span>
          </div>
          <div className="flex justify-between border-b border-border pb-3">
            <span className="text-slate-500">Counted stock</span>
            <span className="font-medium text-slate-900">{product ? `${counted} pcs` : "—"}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-3">
            <span className="text-slate-500">Carton equivalent</span>
            <span className="font-medium text-slate-900">
              {product ? formatStock(counted, product.piecesPerCarton) : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Difference</span>
            <span
              className={
                difference === 0
                  ? "font-semibold text-green-600"
                  : difference > 0
                    ? "font-semibold text-teal-700"
                    : "font-semibold text-red-600"
              }
            >
              {product ? `${difference > 0 ? "+" : ""}${difference} pcs` : "—"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
