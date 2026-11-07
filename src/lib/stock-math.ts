export type StockUnit = "CARTON" | "PIECE";

export function cartonsToPieces(cartons: number, piecesPerCarton: number): number {
  if (piecesPerCarton < 1) throw new Error("Pieces per carton must be at least 1.");
  return cartons * piecesPerCarton;
}

export function totalPieces(cartons: number, pieces: number, piecesPerCarton: number): number {
  return cartonsToPieces(cartons, piecesPerCarton) + pieces;
}

export function saleLinePieces(
  unit: StockUnit,
  quantity: number,
  piecesPerCarton: number,
): number {
  if (quantity < 1) throw new Error("Quantity must be at least 1.");
  return unit === "CARTON" ? cartonsToPieces(quantity, piecesPerCarton) : quantity;
}

export function formatStock(pieces: number, piecesPerCarton: number): string {
  if (piecesPerCarton < 1) return `${pieces} pcs`;
  const safe = Math.max(0, pieces);
  const cartons = Math.floor(safe / piecesPerCarton);
  const remainder = safe % piecesPerCarton;
  if (cartons === 0) return `${remainder} pcs`;
  if (remainder === 0) return `${cartons} ctn`;
  return `${cartons} ctn + ${remainder} pcs`;
}

export function formatStockDetailed(pieces: number, piecesPerCarton: number): string {
  if (piecesPerCarton < 1) return `${pieces} pieces`;
  const safe = Math.max(0, pieces);
  const cartons = Math.floor(safe / piecesPerCarton);
  const remainder = safe % piecesPerCarton;
  const parts = [`${cartons} carton${cartons === 1 ? "" : "s"}`];
  if (remainder > 0) parts.push(`${remainder} piece${remainder === 1 ? "" : "s"}`);
  return `${parts.join(" + ")} (${safe} pcs)`;
}

export function canDeduct(currentPieces: number, requiredPieces: number, allowNegative = false): boolean {
  if (requiredPieces <= 0) return false;
  return allowNegative || currentPieces >= requiredPieces;
}

export function movementSign(type: string): 1 | -1 {
  return type === "SALE" || type === "STOCK_OUT" ? -1 : 1;
}

export function stockStatus(
  pieces: number,
  lowStockPieces: number,
): "OUT" | "LOW" | "OK" {
  if (pieces <= 0) return "OUT";
  if (pieces <= lowStockPieces) return "LOW";
  return "OK";
}

export function stockValue(stockPieces: number, costPrice: string | number): number {
  return Math.round(stockPieces * Number(costPrice) * 100) / 100;
}
