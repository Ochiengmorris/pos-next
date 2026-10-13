import type { OverviewData, TrendPoint } from "@/lib/dashboard/types";

export type CategoryRow = {
  category: string;
  quantitySold: number;
  revenue: string;
  grossProfit: string;
};
export type MethodRow = { method: string; payments: number; amount: string };
export type TopRow = {
  id: string;
  name: string;
  sku: string;
  quantitySold: number;
  revenue: string;
  grossProfit: string;
};
export type CashierRow = {
  id: string;
  name: string;
  transactions: number;
  revenue: string;
  avgBasket: string;
};
export type TaxData = {
  byRate: { rate: string; netSales: string; vat: string; gross: string }[];
  totals: { netSales: string; vat: string; gross: string };
};
export type TopBy = "revenue" | "quantity" | "profit";

export type ReportsBundle = {
  overview: OverviewData;
  trend: TrendPoint[];
  categories: CategoryRow[];
  methods: MethodRow[];
  tax: TaxData;
  top: TopRow[];
  cashiers: CashierRow[];
};
