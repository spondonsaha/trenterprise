import { Badge } from "@/components/ui/badge";
import { INVOICE_STATUS_LABELS } from "@/lib/constants";
import { cn, statusBadgeClass, stockBadgeClass, stockLabel } from "@/lib/utils";

export function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-semibold", statusBadgeClass(status))}>
      {INVOICE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function StockBadge({
  pieces,
  lowStockPieces,
}: {
  pieces: number;
  lowStockPieces: number;
}) {
  return (
    <Badge variant="outline" className={cn("font-semibold", stockBadgeClass(pieces, lowStockPieces))}>
      {stockLabel(pieces, lowStockPieces)}
    </Badge>
  );
}
