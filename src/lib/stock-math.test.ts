import { describe, expect, it } from "vitest";
import {
  canDeduct,
  cartonsToPieces,
  formatStock,
  formatStockDetailed,
  movementSign,
  saleLinePieces,
  stockStatus,
  stockValue,
  totalPieces,
} from "./stock-math";

describe("stock math", () => {
  it("converts cartons to pieces", () => {
    expect(cartonsToPieces(3, 12)).toBe(36);
    expect(totalPieces(2, 5, 12)).toBe(29);
  });

  it("rejects invalid carton configurations", () => {
    expect(() => cartonsToPieces(1, 0)).toThrow();
    expect(() => saleLinePieces("CARTON", 0, 12)).toThrow();
  });

  it("computes sale line pieces for cartons and pieces", () => {
    expect(saleLinePieces("CARTON", 2, 10)).toBe(20);
    expect(saleLinePieces("PIECE", 7, 10)).toBe(7);
  });

  it("formats stock compactly", () => {
    expect(formatStock(0, 12)).toBe("0 pcs");
    expect(formatStock(8, 12)).toBe("8 pcs");
    expect(formatStock(24, 12)).toBe("2 ctn");
    expect(formatStock(29, 12)).toBe("2 ctn + 5 pcs");
  });

  it("formats stock in detail", () => {
    expect(formatStockDetailed(29, 12)).toBe("2 cartons + 5 pieces (29 pcs)");
    expect(formatStockDetailed(12, 12)).toBe("1 carton (12 pcs)");
  });

  it("guards stock deductions", () => {
    expect(canDeduct(5, 5)).toBe(true);
    expect(canDeduct(4, 5)).toBe(false);
    expect(canDeduct(0, 5, true)).toBe(true);
    expect(canDeduct(5, 0)).toBe(false);
  });

  it("classifies stock health", () => {
    expect(stockStatus(0, 5)).toBe("OUT");
    expect(stockStatus(5, 5)).toBe("LOW");
    expect(stockStatus(6, 5)).toBe("OK");
  });

  it("maps movement signs and value", () => {
    expect(movementSign("SALE")).toBe(-1);
    expect(movementSign("STOCK_OUT")).toBe(-1);
    expect(movementSign("STOCK_IN")).toBe(1);
    expect(stockValue(7, "12.345")).toBe(86.42);
  });
});
