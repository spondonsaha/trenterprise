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
import { createProduct, updateProduct } from "@/app/actions/products";
import { productSchema, type ProductInput } from "@/lib/validation";
import { formatMoney } from "@/lib/money";

export type ProductFormInitial = ProductInput & { id?: string };

export type CategoryOption = { id: string; name: string };

const emptyValues: ProductInput = {
  name: "",
  sku: "",
  categoryId: "",
  brand: "",
  color: "",
  description: "",
  active: true,
  piecesPerCarton: 1,
  cartonPrice: 0,
  piecePrice: 0,
  costPrice: 0,
  lowStockPieces: 0,
};

export function ProductForm({
  categories,
  initial,
}: {
  categories: CategoryOption[];
  initial?: ProductFormInitial;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const isEdit = Boolean(initial?.id);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: initial ?? emptyValues,
  });

  const piecesPerCarton = watch("piecesPerCarton") || 0;
  const cartonPrice = watch("cartonPrice") || 0;
  const piecePrice = watch("piecePrice") || 0;
  const costPrice = watch("costPrice") || 0;
  const impliedPiece = piecesPerCarton > 0 ? cartonPrice / piecesPerCarton : 0;
  const margin = piecePrice - costPrice;

  async function onSubmit(values: ProductInput) {
    setPending(true);
    try {
      const result = initial?.id
        ? await updateProduct({ ...values, id: initial.id })
        : await createProduct(values);
      if (result.ok) {
        toast.success(isEdit ? "Product updated." : "Product created.");
        router.push(`/products/${result.data.id}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Product information</CardTitle>
              <CardDescription>
                Identify the cartridge, ink or toner. SKU must be unique.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name">Product name</Label>
                <Input
                  id="name"
                  placeholder="e.g. HP 85A Black Toner Cartridge"
                  disabled={pending}
                  {...register("name")}
                />
                {errors.name ? <FieldError message={errors.name.message} /> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  placeholder="HP-85A-BLK"
                  className="uppercase"
                  disabled={pending}
                  {...register("sku")}
                />
                {errors.sku ? <FieldError message={errors.sku.message} /> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="categoryId">Category</Label>
                <select
                  id="categoryId"
                  className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={pending}
                  {...register("categoryId")}
                >
                  <option value="">Uncategorised</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" placeholder="HP" disabled={pending} {...register("brand")} />
                {errors.brand ? <FieldError message={errors.brand.message} /> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="color">Colour</Label>
                <Input
                  id="color"
                  placeholder="Black"
                  disabled={pending}
                  {...register("color")}
                />
                {errors.color ? <FieldError message={errors.color.message} /> : null}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Compatible printers, yield, part number..."
                  disabled={pending}
                  {...register("description")}
                />
                {errors.description ? <FieldError message={errors.description.message} /> : null}
              </div>

              <label className="flex items-start gap-3 rounded-lg border border-border bg-slate-50/60 p-3 sm:col-span-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-ring"
                  disabled={pending}
                  {...register("active")}
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">
                    Active for sale
                  </span>
                  <span className="block text-xs text-slate-500">
                    Inactive products stay in history but cannot be selected on new invoices.
                  </span>
                </span>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Units &amp; pricing</CardTitle>
              <CardDescription>
                Stock is tracked in pieces. Carton quantities are converted using pieces per
                carton.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="piecesPerCarton">Pieces per carton</Label>
                <Input
                  id="piecesPerCarton"
                  type="number"
                  min="1"
                  step="1"
                  disabled={pending}
                  {...register("piecesPerCarton", { valueAsNumber: true })}
                />
                {errors.piecesPerCarton ? (
                  <FieldError message={errors.piecesPerCarton.message} />
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lowStockPieces">Low stock level (pieces)</Label>
                <Input
                  id="lowStockPieces"
                  type="number"
                  min="0"
                  step="1"
                  disabled={pending}
                  {...register("lowStockPieces", { valueAsNumber: true })}
                />
                {errors.lowStockPieces ? (
                  <FieldError message={errors.lowStockPieces.message} />
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cartonPrice">Selling price per carton (৳)</Label>
                <Input
                  id="cartonPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={pending}
                  {...register("cartonPrice", { valueAsNumber: true })}
                />
                {errors.cartonPrice ? <FieldError message={errors.cartonPrice.message} /> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="piecePrice">Selling price per piece (৳)</Label>
                <Input
                  id="piecePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={pending}
                  {...register("piecePrice", { valueAsNumber: true })}
                />
                {errors.piecePrice ? <FieldError message={errors.piecePrice.message} /> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="costPrice">Cost per piece (৳)</Label>
                <Input
                  id="costPrice"
                  type="number"
                  min="0"
                  step="0.0001"
                  disabled={pending}
                  {...register("costPrice", { valueAsNumber: true })}
                />
                {errors.costPrice ? <FieldError message={errors.costPrice.message} /> : null}
              </div>

              <div className="rounded-lg border border-dashed border-teal-200 bg-teal-50/60 p-3 text-xs text-teal-900">
                <p className="font-semibold">Price check</p>
                <p className="mt-1">
                  Carton price equals {formatMoney(impliedPiece)} / piece.
                </p>
                <p className={margin < 0 ? "text-red-700" : ""}>
                  Margin per piece: {formatMoney(margin)}
                  {margin < 0 ? " (below cost)" : ""}.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle>{isEdit ? "Save changes" : "Create product"}</CardTitle>
              <CardDescription>
                Opening stock is added from the Inventory module after the product is created.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isEdit ? "Save product" : "Create product"}
              </Button>
              <Button type="button" variant="outline" className="w-full" asChild disabled={pending}>
                <Link href={initial?.id ? `/products/${initial.id}` : "/products"}>Cancel</Link>
              </Button>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Rate changes are recorded in price history with your user account. Existing
                invoices are never repriced.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-red-600">{message}</p>;
}
