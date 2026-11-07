"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp } from "lucide-react";
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
import { bulkUpdateRates } from "@/app/actions/rates";

type Mode = "FIXED" | "PERCENT";
type Field = "CARTON" | "PIECE" | "BOTH";

const selectClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function BulkRateDialog({
  productIds,
  onApplied,
}: {
  productIds: string[];
  onApplied?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<Mode>("PERCENT");
  const [field, setField] = useState<Field>("BOTH");
  const [value, setValue] = useState("5");
  const [note, setNote] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await bulkUpdateRates({
        productIds,
        mode,
        field,
        value: Number(value),
        note,
      });
      if (result.ok) {
        toast.success(`Rates updated for ${result.data.updated} product(s).`);
        setOpen(false);
        setNote("");
        onApplied?.();
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
        <Button variant="teal" size="sm">
          <TrendingUp className="h-4 w-4" />
          Bulk update rates
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk rate update</DialogTitle>
          <DialogDescription>
            Apply a price change to {productIds.length} selected product
            {productIds.length === 1 ? "" : "s"}. Every change is recorded in price history.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-mode">Adjustment</Label>
              <select
                id="bulk-mode"
                className={selectClass}
                value={mode}
                onChange={(event) => setMode(event.target.value as Mode)}
                disabled={pending}
              >
                <option value="PERCENT">Percentage change</option>
                <option value="FIXED">Fixed amount change</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-field">Apply to</Label>
              <select
                id="bulk-field"
                className={selectClass}
                value={field}
                onChange={(event) => setField(event.target.value as Field)}
                disabled={pending}
              >
                <option value="BOTH">Carton and piece price</option>
                <option value="CARTON">Carton price only</option>
                <option value="PIECE">Piece price only</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk-value">
              {mode === "PERCENT" ? "Percentage (use a negative value to reduce)" : "Amount (৳)"}
            </Label>
            <Input
              id="bulk-value"
              type="number"
              step="0.01"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              disabled={pending}
              required
            />
            <p className="text-xs text-slate-500">
              {mode === "PERCENT"
                ? "Example: 5 increases every selected rate by 5%."
                : "Example: 10 adds ৳10 to every selected rate."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk-note">Note (optional)</Label>
            <Input
              id="bulk-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Supplier price revision"
              disabled={pending}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || productIds.length === 0}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Apply to {productIds.length} product{productIds.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
