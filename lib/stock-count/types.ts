export type CountStatus = "OPEN" | "APPLIED" | "CANCELLED";

export type CountListItem = {
  id: string;
  number: number;
  name: string;
  status: CountStatus;
  categoryName: string | null;
  createdAt: string;
  appliedAt: string | null;
  lines: number;
};

export type CountSummary = {
  id: string;
  number: number;
  name: string;
  status: CountStatus;
  categoryId: string | null;
  categoryName: string | null;
  note: string | null;
  createdAt: string;
  appliedAt: string | null;
  totals: {
    products: number;
    counted: number;
    uncounted: number;
    matched: number;
    shortLines: number;
    overLines: number;
    shortUnits: number;
    overUnits: number;
    netUnits: number;
    shortValue: string;
    overValue: string;
    netValue: string;
  };
  needsApproval: boolean;
  approvalValue: number;
};

export type CountLine = {
  productId: string;
  sku: string;
  barcode: string | null;
  name: string;
  systemQty: number;
  countedQty: number | null;
  difference: number | null;
  valueDiff: string | null;
  countedAt: string | null;
};

export type LinesPage = {
  items: CountLine[];
  meta: { total: number; page: number; limit: number; pages: number };
};

export type FoundProduct = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  counted: number | null;
};
export type FindResult = {
  items: FoundProduct[];
  exact: boolean;
  outOfScope: boolean;
};
