"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Percent } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateRate } from "@/app/actions/rates";
import { rateUpdateSchema, type RateUpdateInput } from "@/lib/validation";

export type RateProduct = {
  id: string;
  name: string;
  sku: string;
  cartonPrice: number;
  piecePrice: number;
};

export function RateDialog({
  product,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  product: RateProduct | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, setPending] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RateUpdateInput>({
    resolver: zodResolver(rateUpdateSchema),
    defaultValues: {
      productId: product?.id ?? "",
      cartonPrice: product?.cartonPrice ?? 0,
      piecePrice: product?.piecePrice ?? 0,
      note: "",
    },
  });

  useEffect(() => {
    if (open && product) {
      reset({
        productId: product.id,
        cartonPrice: product.cartonPrice,
        piecePrice: product.piecePrice,
        note: "",
      });
    }
  }, [open, product, reset]);

  async function onSubmit(values: RateUpdateInput) {
    if (!product) return;
    setPending(true);
    try {
      const result = await updateRate({ ...values, productId: product.id });
      if (result.ok) {
        toast.success(`Rates updated for ${product.name}.`);
        setOpen(false);
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
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-teal-600" />
            Change selling rates
          </DialogTitle>
          <DialogDescription>
            {product ? `${product.name} · ${product.sku}` : "Update product prices."} Existing
            invoices keep their original rates.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rate-carton">Carton price</Label>
              <Input
                id="rate-carton"
                type="number"
                step="0.01"
                min="0"
                disabled={pending}
                {...register("cartonPrice", { valueAsNumber: true })}
              />
              {errors.cartonPrice ? (
                <p className="text-xs font-medium text-red-600">{errors.cartonPrice.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rate-piece">Piece price</Label>
              <Input
                id="rate-piece"
                type="number"
                step="0.01"
                min="0"
                disabled={pending}
                {...register("piecePrice", { valueAsNumber: true })}
              />
              {errors.piecePrice ? (
                <p className="text-xs font-medium text-red-600">{errors.piecePrice.message}</p>
              ) : null}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rate-note">Note (optional)</Label>
            <Input
              id="rate-note"
              placeholder="Reason for the change"
              disabled={pending}
              {...register("note")}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !product}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Update rates
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
