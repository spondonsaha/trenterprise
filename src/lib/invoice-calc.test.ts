import { describe, expect, it } from "vitest";
import { computeInvoiceStatus, computeInvoiceTotals, computeLineTotal } from "./invoice-calc";

const baseItems = [
  { quantity: 2, unit: "CARTON" as const, unitPrice: 100, piecesPerCarton: 10 },
  { quantity: 3, unit: "PIECE" as const, unitPrice: 12.5, piecesPerCarton: 10 },
];

describe("invoice calculations", () => {
  it("computes line totals with two decimals", () => {
    expect(computeLineTotal(baseItems[0])).toBe("200.00");
    expect(computeLineTotal(baseItems[1])).toBe("37.50");
  });

  it("computes subtotal, amount discount, tax and shipping", () => {
    const totals = computeInvoiceTotals({
      items: baseItems,
      discountType: "AMOUNT",
      discountValue: 37.5,
      taxRate: 10,
      shipping: 20,
    });

    expect(totals.subtotal).toBe("237.50");
    expect(totals.discountAmount).toBe("37.50");
    expect(totals.taxAmount).toBe("20.00");
    expect(totals.shipping).toBe("20.00");
    expect(totals.calculatedTotal).toBe("240.00");
    expect(totals.total).toBe("240.00");
    expect(totals.dueAmount).toBe("240.00");
    expect(totals.linePieces).toEqual([20, 3]);
  });

  it("computes percent discounts and caps them at subtotal", () => {
    const totals = computeInvoiceTotals({
      items: baseItems,
      discountType: "PERCENT",
      discountValue: 10,
      taxRate: 0,
      shipping: 0,
    });
    expect(totals.discountAmount).toBe("23.75");
    expect(totals.total).toBe("213.75");

    const capped = computeInvoiceTotals({
      items: baseItems,
      discountType: "PERCENT",
      discountValue: 150,
      taxRate: 0,
      shipping: 0,
    });
    expect(capped.discountAmount).toBe("237.50");
    expect(capped.total).toBe("0.00");
  });

  it("honours manual totals and paid amounts", () => {
    const totals = computeInvoiceTotals({
      items: baseItems,
      discountType: "AMOUNT",
      discountValue: 0,
      taxRate: 0,
      shipping: 0,
      manualTotal: 250,
      paidAmount: 50,
    });
    expect(totals.total).toBe("250.00");
    expect(totals.dueAmount).toBe("200.00");
  });

  it("never produces a negative due amount", () => {
    const totals = computeInvoiceTotals({
      items: baseItems,
      discountType: "AMOUNT",
      discountValue: 0,
      taxRate: 0,
      shipping: 0,
      paidAmount: 999,
    });
    expect(totals.dueAmount).toBe("0.00");
  });
});

describe("invoice status", () => {
  it("derives payment status", () => {
    expect(
      computeInvoiceStatus({ isDraft: true, isCancelled: false, total: 100, paid: 0 }),
    ).toBe("DRAFT");
    expect(
      computeInvoiceStatus({ isDraft: false, isCancelled: false, total: 100, paid: 0 }),
    ).toBe("UNPAID");
    expect(
      computeInvoiceStatus({ isDraft: false, isCancelled: false, total: 100, paid: 40 }),
    ).toBe("PARTIALLY_PAID");
    expect(
      computeInvoiceStatus({ isDraft: false, isCancelled: false, total: 100, paid: 100 }),
    ).toBe("PAID");
    expect(
      computeInvoiceStatus({ isDraft: false, isCancelled: true, total: 100, paid: 100 }),
    ).toBe("CANCELLED");
  });
});
