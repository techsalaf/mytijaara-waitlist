/**
 * Client-side CSV export. Escapes quotes, wraps values with special chars,
 * and triggers a browser download via Blob.
 */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns?: { key: keyof T; label?: string }[],
): string {
  if (rows.length === 0) return "";
  const cols =
    columns ??
    (Object.keys(rows[0]).map((k) => ({ key: k as keyof T })) as {
      key: keyof T;
      label?: string;
    }[]);
  const header = cols.map((c) => escape(String(c.label ?? c.key))).join(",");
  const body = rows
    .map((row) => cols.map((c) => escape(fmt(row[c.key]))).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

function fmt(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.join("; ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function escape(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
