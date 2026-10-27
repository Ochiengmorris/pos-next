export type CsvCell = string | number;

export function toCsv(rows: CsvCell[][]): string {
  const esc = (v: CsvCell) => {
    let s = String(v);
    // a text cell starting with = + - @ would run as a formula in Excel: defuse it (numbers are left alone)
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, rows: CsvCell[][]) {
  // the BOM makes Excel read the file as UTF-8
  const blob = new Blob(["\ufeff", toCsv(rows)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadText(
  filename: string,
  text: string,
  type = "text/csv;charset=utf-8",
) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
