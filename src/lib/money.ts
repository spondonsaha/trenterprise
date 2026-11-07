import Decimal from "decimal.js";

export type Numeric = string | number | Decimal;

export const D = (value: Numeric): Decimal => new Decimal(value || 0);

export function round2(value: Numeric): Decimal {
  return D(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function round4(value: Numeric): Decimal {
  return D(value).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
}

export function toNumber(value: Numeric): number {
  return D(value).toNumber();
}

export function toFixed2(value: Numeric): string {
  return round2(value).toFixed(2);
}

export function formatAmount(value: Numeric): string {
  return round2(value)
    .toNumber()
    .toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
}

export function formatMoney(value: Numeric, symbol = "৳"): string {
  return `${symbol} ${formatAmount(value)}`;
}

export function formatPdfMoney(value: Numeric, currency = "BDT"): string {
  return `${currency} ${formatAmount(value)}`;
}

export function percentOf(value: Numeric, percent: Numeric): Decimal {
  return D(value).mul(D(percent)).div(100);
}
