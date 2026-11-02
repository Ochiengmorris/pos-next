export type MovementType = "PAID_OUT" | "CASH_DROP" | "CASH_IN";

export type Figures = {
  sales: { count: number; total: string };
  voided: { count: number; total: string };
  byMethod: Record<string, { count: number; amount: string }>;
  openingFloat: string;
  cashSales: string;
  cashIn: string;
  paidOut: string;
  cashDrops: string;
  expectedCash: string;
};

export type ShiftRow = {
  id: string;
  number: number;
  status: "OPEN" | "CLOSED";
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt: string | null;
  openingFloat: string;
  expectedCash: string;
  countedCash: string | null;
  variance: string | null;
  needsReview: boolean;
  reviewedAt: string | null;
  salesCount: number;
  cashSales: string;
  mpesa: string;
  card: string;
  paidOut: string;
  drops: string;
};

export type ShiftView = ShiftRow & {
  closeNote: string | null;
  reviewNote: string | null;
  figures: Figures;
  movements: {
    id: string;
    type: MovementType;
    amount: string;
    reason: string;
    createdAt: string;
    by: string;
  }[];
  tolerance: number;
  paidOutLimit: number;
};

export type CurrentShift = {
  required: boolean;
  shift: ShiftView | null;
  stale: boolean;
  tolerance: number;
  paidOutLimit: number;
};

export type DaySummary = {
  date: string;
  totals: {
    shifts: number;
    open: number;
    cashSales: string;
    mpesa: string;
    card: string;
    paidOut: string;
    drops: string;
    variance: string;
    needsReview: number;
  };
  shifts: ShiftRow[];
};
