import { EtimsDisplay } from "@/lib/pos/types";

export type SaleStatus = "COMPLETED" | "VOIDED" | "REFUNDED";

export type SaleRow = {
  id: string;
  receiptNo: string;
  status: SaleStatus;
  total: string;
  createdAt: string;
  cashier: { id: string; name: string };
  items: { quantity: number }[];
  payments: { method: string }[];
  etims: EtimsDisplay;
};

export type SalesPage = {
  items: SaleRow[];
  meta: { total: number; page: number; limit: number; pages: number };
};
