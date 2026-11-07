import { describe, expect, it } from "vitest";
import { invoiceInputSchema } from "./validation";

const quickInvoice = {
  isQuick: true,
  customerName: "Walk-in customer",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  date: "2026-11-06",
  dueDate: "",
  items: [],
  discountType: "AMOUNT" as const,
  discountValue: 0,
  taxRate: 0,
  shipping: 0,
  manualTotal: 2500,
  notes: "",
  terms: "",
};

describe("invoiceInputSchema", () => {
  it("accepts a quick invoice with no line items", () => {
    const result = invoiceInputSchema.safeParse(quickInvoice);
    expect(result.success).toBe(true);
  });

  it("rejects a quick invoice that still contains line items", () => {
    const result = invoiceInputSchema.safeParse({
      ...quickInvoice,
      items: [
        {
          productId: "product-1",
          description: "",
          unit: "CARTON" as const,
          quantity: 1,
          unitPrice: 100,
          piecesPerCarton: 12,
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "items")).toBe(true);
    }
  });

  it("requires a positive total for a quick invoice", () => {
    const result = invoiceInputSchema.safeParse({ ...quickInvoice, manualTotal: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "manualTotal")).toBe(true);
    }
  });

  it("requires line items for an itemized invoice", () => {
    const result = invoiceInputSchema.safeParse({
      ...quickInvoice,
      isQuick: false,
      manualTotal: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "items")).toBe(true);
    }
  });

  it("accepts a paid invoice without a separate amount", () => {
    const result = invoiceInputSchema.safeParse({
      ...quickInvoice,
      paymentStatus: "PAID",
      amountPaid: 0,
    });
    expect(result.success).toBe(true);
  });

  it("requires an amount for a partially paid invoice", () => {
    const result = invoiceInputSchema.safeParse({
      ...quickInvoice,
      paymentStatus: "PARTIALLY_PAID",
      amountPaid: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "amountPaid")).toBe(true);
    }
  });
});
