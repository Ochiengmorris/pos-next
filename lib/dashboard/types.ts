export type TrendPoint = {
  bucket: string;
  transactions: number;
  revenue: string;
};

export type OverviewData = {
  range: { from: string; to: string };
  transactions: number;
  revenue: string;
  netSales: string;
  tax: string;
  avgBasket: string;
  itemsSold: number;
  grossProfit: string;
  marginPct: number | null;
  change: {
    revenue: number | null;
    transactions: number | null;
    grossProfit: number | null;
  };
  voids: { count: number; value: string };
  previousRange: { from: string; to: string };
};

export type DashboardData = {
  today: OverviewData;
  weekTrend: TrendPoint[];
  weekTopProducts: {
    id: string;
    name: string;
    sku: string;
    quantitySold: number;
    revenue: string;
    grossProfit: string;
  }[];
  lowStock: {
    id: string;
    name: string;
    sku: string;
    stockQty: number;
    reorderLevel: number;
  }[];
  recentSales: {
    id: string;
    receiptNo: string;
    status: "COMPLETED" | "VOIDED" | "REFUNDED";
    total: string;
    createdAt: string;
    cashier: string;
    methods: string[];
  }[];
  inventory: {
    activeProducts: number;
    totalUnits: number;
    stockValueAtCost: string;
    stockValueAtRetail: string;
    outOfStock: number;
    lowStock: number;
  };
  alerts: { unclaimedMpesa: number };
};
