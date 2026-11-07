export const COMPANY_NAME = "TR Enterprise";
export const COMPANY_SLUG = COMPANY_NAME.replace(/\s+/g, "-");
export const DEFAULT_CURRENCY = "BDT";
export const DEFAULT_CURRENCY_SYMBOL = "৳";
export const DEFAULT_INVOICE_PREFIX = "INV-";
export const DEFAULT_DUE_DAYS = 15;
export const PAGE_SIZE = 10;

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  OPENING: "Opening",
  STOCK_IN: "Stock In",
  STOCK_OUT: "Stock Out",
  SALE: "Sale",
  SALE_RETURN: "Sale Return",
  ADJUSTMENT: "Adjustment",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  MOBILE_BANKING: "bKash / Nagad / Mobile Banking",
  CHEQUE: "Cheque",
  CARD: "Card",
  OTHER: "Other",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  STAFF: "Staff",
};
