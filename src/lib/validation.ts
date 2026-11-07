import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const money = z
  .number({ invalid_type_error: "Enter a valid amount." })
  .min(0, "Amount cannot be negative.")
  .max(999_999_999, "Amount is too large.");

const optionalText = (max = 1000) =>
  z.preprocess(
    (value) => (value === null || value === undefined || value === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const optionalEmail = z.preprocess(
  (value) => (value === null || value === undefined || value === "" ? undefined : value),
  z.string().trim().email("Enter a valid email address.").max(200).optional(),
);

const dateString = z
  .string()
  .regex(DATE_RE, "Enter a valid date.")
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()), "Enter a valid date.");

const optionalDateString = z.preprocess(
  (value) => (value === null || value === undefined || value === "" ? undefined : value),
  dateString.optional(),
);

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "Product name is required.").max(150),
  sku: z
    .string()
    .trim()
    .min(2, "SKU is required.")
    .max(60)
    .regex(/^[A-Za-z0-9._-]+$/, "SKU may contain letters, numbers, dots, dashes and underscores."),
  categoryId: optionalText(100),
  brand: z.string().trim().min(1, "Brand is required.").max(80),
  color: z.string().trim().min(1, "Color is required.").max(60),
  description: optionalText(1500),
  active: z.boolean().default(true),
  piecesPerCarton: z
    .number({ invalid_type_error: "Enter pieces per carton." })
    .int("Pieces per carton must be a whole number.")
    .min(1, "Pieces per carton must be at least 1.")
    .max(100_000),
  cartonPrice: money,
  piecePrice: money,
  costPrice: money.default(0),
  lowStockPieces: z
    .number({ invalid_type_error: "Enter a low stock level." })
    .int("Low stock level must be a whole number.")
    .min(0, "Low stock level cannot be negative.")
    .max(10_000_000),
});

export const productUpdateSchema = productSchema.extend({
  id: z.string().min(1),
});

export const rateUpdateSchema = z.object({
  productId: z.string().min(1),
  cartonPrice: money,
  piecePrice: money,
  note: optionalText(500),
});

export const bulkRateSchema = z
  .object({
    productIds: z.array(z.string().min(1)).min(1, "Select at least one product.").max(1000),
    mode: z.enum(["FIXED", "PERCENT"]),
    field: z.enum(["CARTON", "PIECE", "BOTH"]),
    value: z
      .number({ invalid_type_error: "Enter a value." })
      .min(-95, "Percentage decrease cannot exceed 95%.")
      .max(1000, "Percentage increase is too large."),
    note: optionalText(500),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "FIXED" && data.value < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Fixed prices cannot be negative.", path: ["value"] });
    }
  });

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required.").max(100),
  description: optionalText(500),
});

export const categoryUpdateSchema = categorySchema.extend({ id: z.string().min(1) });

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Customer name is required.").max(150),
  contactPerson: optionalText(150),
  phone: optionalText(40),
  email: optionalEmail,
  address: optionalText(500),
  notes: optionalText(1500),
  openingBalance: money.default(0),
  active: z.boolean().default(true),
});

export const customerUpdateSchema = customerSchema.extend({ id: z.string().min(1) });

export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Supplier name is required.").max(150),
  contactPerson: optionalText(150),
  phone: optionalText(40),
  email: optionalEmail,
  address: optionalText(500),
  notes: optionalText(1500),
  active: z.boolean().default(true),
});

export const supplierUpdateSchema = supplierSchema.extend({ id: z.string().min(1) });

export const stockInItemSchema = z
  .object({
    productId: z.string().min(1, "Select a product."),
    cartons: z.number().int().min(0).max(1_000_000).default(0),
    pieces: z.number().int().min(0).max(1_000_000).default(0),
    costPerCarton: money.optional(),
  })
  .refine((item) => item.cartons > 0 || item.pieces > 0, {
    message: "Enter a carton or piece quantity for each item.",
  });

export const stockInSchema = z.object({
  supplierId: optionalText(100),
  date: dateString,
  referenceNumber: optionalText(100),
  note: optionalText(1000),
  updateCost: z.boolean().default(false),
  items: z.array(stockInItemSchema).min(1, "Add at least one item.").max(100),
});

export const stockOutSchema = z.object({
  productId: z.string().min(1, "Select a product."),
  unit: z.enum(["CARTON", "PIECE"]),
  quantity: z.number().int().min(1, "Quantity must be at least 1.").max(1_000_000),
  reason: z.string().trim().min(2, "A reason is required.").max(500),
  date: dateString,
});

export const adjustmentSchema = z.object({
  productId: z.string().min(1, "Select a product."),
  countedCartons: z.number().int().min(0).max(1_000_000),
  countedPieces: z.number().int().min(0).max(1_000_000),
  reason: z.string().trim().min(3, "A reason is required.").max(500),
  date: dateString,
});

export const invoiceLineSchema = z.object({
  productId: z.string().min(1, "Select a product."),
  description: z.string().trim().min(1, "Description is required.").max(300),
  unit: z.enum(["CARTON", "PIECE"]),
  quantity: z.number().int().min(1, "Quantity must be at least 1.").max(1_000_000),
  unitPrice: money,
  piecesPerCarton: z.number().int().min(1).max(100_000),
});

export const invoiceInputSchema = z
  .object({
    isQuick: z.boolean(),
    customerName: z.string().trim().min(2, "Company / customer name is required.").max(150),
    customerPhone: optionalText(40),
    customerEmail: optionalEmail,
    customerAddress: optionalText(500),
    date: dateString,
    dueDate: optionalDateString,
    paymentStatus: z.enum(["UNPAID", "PARTIALLY_PAID", "PAID"]).default("UNPAID"),
    amountPaid: money.default(0),
    items: z.array(invoiceLineSchema).max(200).default([]),
    discountType: z.enum(["AMOUNT", "PERCENT"]).default("AMOUNT"),
    discountValue: money.default(0),
    taxRate: z.number().min(0, "Tax cannot be negative.").max(100, "Tax cannot exceed 100%.").default(0),
    shipping: money.default(0),
    manualTotal: z
      .union([z.number().min(0).max(999_999_999), z.null()])
      .optional(),
    notes: optionalText(2000),
    terms: optionalText(2000),
  })
  .superRefine((data, ctx) => {
    if (data.isQuick) {
      if (data.items.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A quick invoice cannot contain line items.",
          path: ["items"],
        });
      }
      if (!data.manualTotal || data.manualTotal <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter the total price for a quick invoice.",
          path: ["manualTotal"],
        });
      }
    } else if (data.items.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one line item, or use quick invoice mode.",
        path: ["items"],
      });
    }

    if (data.paymentStatus === "PARTIALLY_PAID" && (!data.amountPaid || data.amountPaid <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter the amount the customer paid.",
        path: ["amountPaid"],
      });
    }
  });

export const invoiceUpdateSchema = invoiceInputSchema.and(
  z.object({ id: z.string().min(1) }),
);

export const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Select an invoice."),
  amount: z
    .number({ invalid_type_error: "Enter a valid amount." })
    .positive("Payment amount must be greater than zero.")
    .max(999_999_999),
  date: dateString,
  method: z.enum(["CASH", "BANK_TRANSFER", "MOBILE_BANKING", "CHEQUE", "CARD", "OTHER"]),
  reference: optionalText(120),
  note: optionalText(1000),
});

export const paymentUpdateSchema = z.object({
  id: z.string().min(1),
  amount: z
    .number({ invalid_type_error: "Enter a valid amount." })
    .positive("Payment amount must be greater than zero.")
    .max(999_999_999),
  date: dateString,
  method: z.enum(["CASH", "BANK_TRANSFER", "MOBILE_BANKING", "CHEQUE", "CARD", "OTHER"]),
  reference: optionalText(120),
  note: optionalText(1000),
});

export const voidPaymentSchema = z.object({
  id: z.string().min(1),
  reason: z.string().trim().min(3, "A void reason is required.").max(500),
});

export const settingSchema = z.object({
  address: optionalText(500),
  phone: optionalText(40),
  email: optionalEmail,
  currency: z.string().trim().min(1, "Currency is required.").max(10),
  currencySymbol: z.string().trim().min(1, "Currency symbol is required.").max(5),
  invoicePrefix: z
    .string()
    .trim()
    .min(1, "Invoice prefix is required.")
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and dashes only."),
  defaultTaxRate: z.number().min(0, "Tax cannot be negative.").max(100, "Tax cannot exceed 100%."),
  invoiceFooterNote: optionalText(1000),
  logoUrl: z
    .string()
    .max(900_000, "Logo is too large. Use an image under 600 KB.")
    .optional(),
  allowNegativeStock: z.boolean().default(false),
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
  role: z.enum(["ADMIN", "STAFF"]),
  canOverridePrice: z.boolean().default(false),
});

export const userUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Name is required.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  role: z.enum(["ADMIN", "STAFF"]),
  active: z.boolean(),
  canOverridePrice: z.boolean(),
  password: z.preprocess(
    (value) => (value === null || value === undefined || value === "" ? undefined : value),
    z.string().min(8, "Password must be at least 8 characters.").max(200).optional(),
  ),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type RateUpdateInput = z.infer<typeof rateUpdateSchema>;
export type BulkRateInput = z.infer<typeof bulkRateSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;
export type StockInInput = z.infer<typeof stockInSchema>;
export type StockOutInput = z.infer<typeof stockOutSchema>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type InvoiceInput = z.infer<typeof invoiceInputSchema>;
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type PaymentUpdateInput = z.infer<typeof paymentUpdateSchema>;
export type VoidPaymentInput = z.infer<typeof voidPaymentSchema>;
export type SettingInput = z.infer<typeof settingSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
