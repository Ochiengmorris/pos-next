export type ImportRow = {
  row: number;
  sku: string;
  name: string;
  action: "create" | "update" | "skip" | "error";
  errors: string[];
  warnings: string[];
};

export type ImportReport = {
  dryRun: boolean;
  applied: boolean;
  columns: string[];
  unknownColumns: string[];
  totals: {
    rows: number;
    create: number;
    update: number;
    skip: number;
    error: number;
  };
  newCategories: string[];
  notices: string[];
  rows: ImportRow[];
  truncated: boolean;
};
