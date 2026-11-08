import { D, round2, type Numeric } from "./money";
import { saleLinePieces, type StockUnit } from "./stock-math";

export type CalcLine = {
  quantity: number;
  unit: StockUnit;
  unitPrice: Numeric;
  piecesPerCarton: number;
};

export type InvoiceTotalsInput = {
  items: CalcLine[];
  discountType: "AMOUNT" | "PERCENT";
  discountValue: Numeric;
  taxRate: Numeric;
  shipping: Numeric;
  manualTotal?: Numeric | null;
  paidAmount?: Numeric;
};

export type InvoiceTotals = {
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  shipping: string;
  calculatedTotal: string;
  total: string;
  paidAmount: string;
  dueAmount: string;
  linePieces: number[];
};

export function computeLineTotal(line: CalcLine): string {
  return round2(D(line.unitPrice).mul(line.quantity)).toFixed(2);
}

export function computeInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const subtotal = input.items.reduce(
    (sum, line) => sum.add(D(line.unitPrice).mul(line.quantity)),
    D(0),
  );

  const rawDiscount = D(input.discountValue);
  let discountAmount = D(0);
  if (rawDiscount.gt(0)) {
    discountAmount =
      input.discountType === "PERCENT"
        ? subtotal.mul(rawDiscount).div(100)
        : rawDiscount;
  }
  discountAmount = round2(discountAmount);
  if (discountAmount.gt(subtotal)) discountAmount = round2(subtotal);

  const taxRate = D(input.taxRate);
  const shipping = round2(D(input.shipping));
  const taxable = subtotal.sub(discountAmount);
  const taxAmount = round2(taxable.mul(taxRate).div(100));
  const calculatedTotal = round2(taxable.add(taxAmount).add(shipping));

  const hasManualTotal =
    input.manualTotal !== null &&
    input.manualTotal !== undefined &&
    String(input.manualTotal) !== "" &&
    D(input.manualTotal).gte(0);

  const total = hasManualTotal ? round2(D(input.manualTotal!)) : calculatedTotal;
  const paid = round2(D(input.paidAmount ?? 0));
  const due = total.sub(paid).isNegative() ? D(0) : round2(total.sub(paid));

  return {
    subtotal: round2(subtotal).toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    shipping: shipping.toFixed(2),
    calculatedTotal: calculatedTotal.toFixed(2),
    total: total.toFixed(2),
    paidAmount: paid.toFixed(2),
    dueAmount: round2(due).toFixed(2),
    linePieces: input.items.map((line) => {
      const quantity = Number(line.quantity);
      const piecesPerCarton = Math.max(1, Number(line.piecesPerCarton) || 1);
      return quantity >= 1 ? saleLinePieces(line.unit, quantity, piecesPerCarton) : 0;
    }),
  };
}

export function computeInvoiceStatus(args: {
  isDraft: boolean;
  isCancelled: boolean;
  total: Numeric;
  paid: Numeric;
}): "DRAFT" | "UNPAID" | "PARTIALLY_PAID" | "PAID" | "CANCELLED" {
  if (args.isCancelled) return "CANCELLED";
  if (args.isDraft) return "DRAFT";
  const total = D(args.total);
  const paid = D(args.paid);
  if (paid.lte(0)) return "UNPAID";
  if (paid.lt(total)) return "PARTIALLY_PAID";
  return "PAID";
}
