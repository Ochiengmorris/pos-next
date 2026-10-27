// money is handled in whole cents on the screen to avoid float drift
export const toCents = (v: string | number) => Math.round(Number(v) * 100);

export const centsToInput = (c: number) => String(c / 100);

export function parseCents(input: string): number | null {
  const n = Number(input.replace(/,/g, "").trim());
  return input.trim() !== "" && Number.isFinite(n) && n >= 0
    ? Math.round(n * 100)
    : null;
}

// deterministic formatting (no Intl) so server and browser render identically
export function formatKsh(cents: number): string {
  const [whole, dec] = (cents / 100).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `KSH ${grouped}${cents % 100 !== 0 ? `.${dec}` : ""}`;
}

// VAT contained in a VAT-inclusive amount (display estimate; the server's figure is the official one)
export const vatOf = (lineCents: number, ratePct: number) =>
  Math.round((lineCents * ratePct) / (100 + ratePct));

export const formatInt = (n: number) =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
