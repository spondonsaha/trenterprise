import "server-only";
import { prisma } from "./prisma";
import {
  COMPANY_NAME,
  DEFAULT_CURRENCY,
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_INVOICE_PREFIX,
} from "./constants";

export type AppSettings = {
  companyName: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  currencySymbol: string;
  invoicePrefix: string;
  defaultTaxRate: string;
  invoiceFooterNote: string | null;
  allowNegativeStock: boolean;
};

export async function getSettings(): Promise<AppSettings> {
  const setting = await prisma.setting.findUnique({ where: { id: "singleton" } });
  if (!setting) {
    return {
      companyName: COMPANY_NAME,
      logoUrl: null,
      address: null,
      phone: null,
      email: null,
      currency: DEFAULT_CURRENCY,
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      invoicePrefix: DEFAULT_INVOICE_PREFIX,
      defaultTaxRate: "0",
      invoiceFooterNote: null,
      allowNegativeStock: false,
    };
  }
  return {
    companyName: COMPANY_NAME,
    logoUrl: setting.logoUrl,
    address: setting.address,
    phone: setting.phone,
    email: setting.email,
    currency: setting.currency,
    currencySymbol: setting.currencySymbol,
    invoicePrefix: setting.invoicePrefix,
    defaultTaxRate: setting.defaultTaxRate.toFixed(2),
    invoiceFooterNote: setting.invoiceFooterNote,
    allowNegativeStock: setting.allowNegativeStock,
  };
}
