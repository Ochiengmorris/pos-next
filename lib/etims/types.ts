import type { EtimsDisplay } from "@/lib/pos/types";

export type InvoiceStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "FAILED"
  | "UNCERTAIN"
  | "CANCELLED";

export type MockMode =
  | "ok"
  | "down"
  | "timeout"
  | "reject"
  | "flaky"
  | "lost_response"
  | "lost_response_strict"
  | null;

export type EtimsSummary = {
  provider: "disabled" | "mock" | "oscu";
  environment: string;
  mock: boolean;
  mockMode: string | null;
  workerOn: boolean;
  counts: {
    pending: number;
    uncertain: number;
    rejected: number;
    failed: number;
    accepted: number;
    cancelled: number;
  };
  stuck: number;
  needsAttention: number;
  oldestPendingAt: string | null;
  lastAcceptedAt: string | null;
  unreviewedProducts: number;
};

export type InvoiceRow = {
  id: string;
  type: "SALE" | "CREDIT_NOTE";
  internalNo: string;
  status: InvoiceStatus;
  display: EtimsDisplay;
  environment: string;
  invoiceNo: number | null;
  scuReceiptNo: number | null;
  createdAt: string;
  acceptedAt: string | null;
  attempts: number;
  lastAttemptAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  nextAttemptAt: string | null;
  jobStatus: string | null;
  saleId: string;
  total: string;
  cashier: string;
  customerPin: string | null;
};

export type InvoicesPage = {
  items: InvoiceRow[];
  meta: { total: number; page: number; limit: number; pages: number };
};

export type InvoiceDetail = {
  id: string;
  type: "SALE" | "CREDIT_NOTE";
  internalNo: string;
  status: InvoiceStatus;
  display: EtimsDisplay;
  environment: string;
  invcNo: number | null;
  receiptNo: number | null;
  totalReceiptNo: number | null;
  sdcId: string | null;
  rcptSign: string | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  manuallyResolvedAt: string | null;
  payload: unknown;
  job: { status: string; nextAttemptAt: string } | null;
  sale: {
    id: string;
    receiptNumber: number;
    total: string;
    createdAt: string;
    cashier: { name: string };
  };
  events: {
    id: string;
    type: string;
    message: string | null;
    actorId: string | null;
    createdAt: string;
  }[];
};

export type TaxTypeRow = {
  code: "A" | "B" | "C" | "D" | "E";
  name: string;
  rate: string;
};

export type ReviewProduct = {
  id: string;
  sku: string;
  name: string;
  price: string;
  taxTyCd: TaxTypeRow["code"];
  taxRate: string;
  taxConfirmed: boolean;
};
