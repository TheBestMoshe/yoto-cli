// Simple output helpers for CLI

export function success(message: string): void {
  console.log(`✓ ${message}`);
}

export function error(message: string): void {
  console.error(`✗ ${message}`);
}

export function info(message: string): void {
  console.log(`ℹ ${message}`);
}

export function table(
  headers: string[],
  rows: string[][],
  widths?: number[]
): void {
  const colWidths =
    widths ||
    headers.map((h, i) =>
      Math.max(h.length, ...rows.map((r) => (r[i] || "").length))
    );

  const formatRow = (cells: string[]) =>
    cells.map((c, i) => (c || "").padEnd(colWidths[i] || 20)).join("  ");

  console.log(formatRow(headers));
  console.log(colWidths.map((w) => "-".repeat(w)).join("  "));
  rows.forEach((row) => console.log(formatRow(row)));
}

export function json(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}
