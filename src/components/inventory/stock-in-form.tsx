"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createStockIn } from "@/app/actions/inventory";
import { formatMoney } from "@/lib/money";
import { formatStock } from "@/lib/stock-math";
import { todayDateInput } from "@/lib/utils";

export type StockProductOption = {
  id: string;
  name: string;
  sku: string;
  piecesPerCarton: number;
  costPrice: number;
  stockPieces: number;
};

export type SupplierOption = { id: string; name: string };

type Row = {
  key: number;
  productId: string;
  cartons: string;
  pieces: string;
  costPerCarton: string;
};

const selectClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

function newRow(key: number): Row {
  return { key, productId: "", cartons: "", pieces: "", costPerCarton: "" };
}

export function StockInForm({
  products,
  suppliers,
  defaultProductId,
}: {
  products: StockProductOption[];
  suppliers: SupplierOption[];
  defaultProductId?: string;
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(todayDateInput());
  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote] = useState("");
  const [updateCost, setUpdateCost] = useState(true);
  const [rows, setRows] = useState<Row[]>(() => {
    const product = products.find((option) => option.id === defaultProductId);
    return [
      {
        ...newRow(1),
        productId: product?.id ?? "",
        costPerCarton:
          product && product.costPrice > 0
            ? String(product.costPrice * product.piecesPerCarton)
            : "",
      },
    ];
  });
  const [nextKey, setNextKey] = useState(2);
  const [pending, setPending] = useState(false);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function handleProductChange(key: number, productId: string) {
    const product = productMap.get(productId);
    updateRow(key, {
      productId,
      costPerCarton: product ? String(product.costPrice * product.piecesPerCarton) : "",
    });
  }

  function addRow() {
    setRows((current) => [...current, newRow(nextKey)]);
    setNextKey((value) => value + 1);
  }

  function removeRow(key: number) {
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row.key !== key)));
  }

  function lineTotal(row: Row) {
    const product = productMap.get(row.productId);
    if (!product) return 0;
    const cartons = Number(row.cartons) || 0;
    const pieces = Number(row.pieces) || 0;
    const cost = Number(row.costPerCarton) || 0;
    return cartons * cost + (cost / product.piecesPerCarton) * pieces;
  }

  const totalCost = rows.reduce((sum, row) => sum + lineTotal(row), 0);
  const totalPieces = rows.reduce((sum, row) => {
    const product = productMap.get(row.productId);
    if (!product) return sum;
    return (
      sum +
      (Number(row.cartons) || 0) * product.piecesPerCarton +
      (Number(row.pieces) || 0)
    );
  }, 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    for (const row of rows) {
      if (!row.productId) {
        toast.error("Select a product for every item row.");
        return;
      }
      if ((Number(row.cartons) || 0) + (Number(row.pieces) || 0) <= 0) {
        toast.error("Enter a carton or piece quantity for every item row.");
        return;
      }
    }

    setPending(true);
    try {
      const result = await createStockIn({
        supplierId: supplierId || "",
        date,
        referenceNumber,
        note,
        updateCost,
        items: rows.map((row) => ({
          productId: row.productId,
          cartons: Number(row.cartons) || 0,
          pieces: Number(row.pieces) || 0,
          costPerCarton: row.costPerCarton === "" ? undefined : Number(row.costPerCarton),
        })),
      });
      if (result.ok) {
        toast.success(`Stock added as purchase ${result.data.purchaseNumber}.`);
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
    <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Stock details</CardTitle>
            <CardDescription>
              Who supplied it and when. Only the date is needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="supplier">Supplier (optional)</Label>
              <select
                id="supplier"
                className={selectClass}
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
                disabled={pending}
              >
                <option value="">No supplier / direct purchase</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purchase-date">Purchase date</Label>
              <Input
                id="purchase-date"
                type="date"
                value={date}
                max={todayDateInput()}
                onChange={(event) => setDate(event.target.value)}
                disabled={pending}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reference">Supplier reference (optional)</Label>
              <Input
                id="reference"
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                placeholder="Invoice / challan number"
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock-in-note">Note (optional)</Label>
              <Input
                id="stock-in-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Delivery note"
                disabled={pending}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Items received</CardTitle>
              <CardDescription>Add each product and quantity received.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={pending}>
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.map((row, index) => {
              const product = productMap.get(row.productId);
              return (
                <div key={row.key} className="rounded-lg border border-border bg-slate-50/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Item {index + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:bg-red-50"
                      onClick={() => removeRow(row.key)}
                      disabled={pending || rows.length === 1}
                      aria-label={`Remove item ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
                    <div className="space-y-1 lg:col-span-5">
                      <Label>Product</Label>
                      <select
                        className={selectClass}
                        value={row.productId}
                        onChange={(event) => handleProductChange(row.key, event.target.value)}
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
                      {product ? (
                        <p className="text-[11px] text-slate-500">
                          {product.piecesPerCarton} pcs / carton ·{" "}
                          {formatStock(product.stockPieces, product.piecesPerCarton)} in stock
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1 lg:col-span-2">
                      <Label>Cartons</Label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className={inputClass}
                        value={row.cartons}
                        onChange={(event) => updateRow(row.key, { cartons: event.target.value })}
                        placeholder="0"
                        disabled={pending}
                      />
                    </div>
                    <div className="space-y-1 lg:col-span-2">
                      <Label>Pieces</Label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className={inputClass}
                        value={row.pieces}
                        onChange={(event) => updateRow(row.key, { pieces: event.target.value })}
                        placeholder="0"
                        disabled={pending}
                      />
                    </div>
                    <div className="space-y-1 lg:col-span-3">
                      <Label>Cost / carton (৳)</Label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputClass}
                        value={row.costPerCarton}
                        onChange={(event) =>
                          updateRow(row.key, { costPerCarton: event.target.value })
                        }
                        placeholder="0.00"
                        disabled={pending}
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {product
                        ? `${(Number(row.cartons) || 0) * product.piecesPerCarton + (Number(row.pieces) || 0)} pieces`
                        : "Select a product"}
                    </span>
                    <span className="font-medium text-slate-700">
                      Line cost {formatMoney(lineTotal(row))}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Add stock</CardTitle>
            <CardDescription>Check the quantity, then save.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Items</span>
                <span className="font-medium text-slate-900">{rows.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pieces received</span>
                <span className="font-medium text-slate-900">{totalPieces}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-slate-500">Total purchase cost</span>
                <span className="font-semibold text-slate-900">{formatMoney(totalCost)}</span>
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-border p-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-ring"
                checked={updateCost}
                onChange={(event) => setUpdateCost(event.target.checked)}
                disabled={pending}
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">
                  Update product cost price
                </span>
                <span className="block text-xs text-slate-500">
                  Uses the cost per carton entered above, divided by pieces per carton.
                </span>
              </span>
            </label>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-4 w-4" />
              )}
              {pending ? "Saving..." : "Add stock"}
            </Button>
            <Button type="button" variant="outline" className="w-full" asChild disabled={pending}>
              <Link href="/inventory">Cancel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
