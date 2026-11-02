export const ksh = (v: string | number) => {
  const n = Number(v);
  return `${n < 0 ? "-" : ""}KSh ${Math.abs(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// "1,250.50" -> 1250.5, or null when it is not a valid money amount
export const parseAmount = (s: string): number | null => {
  const t = s.replace(/[,\s]/g, "");
  return /^\d{1,9}(\.\d{1,2})?$/.test(t) ? Number(t) : null;
};

export const cents = (n: number) => Math.round(n * 100);

export const MOVEMENT_LABEL = {
  PAID_OUT: "Paid out",
  CASH_DROP: "Cash drop",
  CASH_IN: "Cash added",
} as const;
