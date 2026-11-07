export type CsvColumn = { key: string; label: string };

function escapeCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(columns: CsvColumn[], rows: Record<string, string>[]): string {
  const header = columns.map((column) => escapeCell(column.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((column) => escapeCell(row[column.key] ?? "")).join(","),
  );
  return `\uFEFF${[header, ...lines].join("\r\n")}\r\n`;
}
