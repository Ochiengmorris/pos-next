//  one loader for the server (first paint) and the browser (range changes)
import type { OverviewData, TrendPoint } from "@/lib/dashboard/types";
import type { Range } from "./range";
import type {
  CashierRow,
  CategoryRow,
  MethodRow,
  ReportsBundle,
  TaxData,
  TopBy,
  TopRow,
} from "./types";

export type Getter = <T>(path: string, init?: RequestInit) => Promise<T>;

export async function loadReports(
  get: Getter,
  range: Range,
  by: TopBy,
): Promise<ReportsBundle> {
  const q = `from=${range.from}&to=${range.to}`;
  const [overview, trend, categories, methods, tax, top, cashiers] =
    await Promise.all([
      get<OverviewData>(`/reports/overview?${q}`),
      get<TrendPoint[]>(`/reports/trend?${q}`),
      get<CategoryRow[]>(`/reports/categories?${q}`),
      get<MethodRow[]>(`/reports/payment-methods?${q}`),
      get<TaxData>(`/reports/tax?${q}`),
      get<TopRow[]>(`/reports/top-products?${q}&by=${by}&limit=10`),
      get<CashierRow[]>(`/reports/cashiers?${q}`),
    ]);
  return { overview, trend, categories, methods, tax, top, cashiers };
}
