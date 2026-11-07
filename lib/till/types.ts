export type TillConfig = {
  enabled: boolean;
  tillNumber: string | null;
  requireCodeEntry: boolean;
  windowMinutes: number;
};

export type TillPaymentView = {
  transId: string;
  amount: string;
  time: string;
  payerName: string | null;
  reservedByMe: boolean;
};

export type TillWaiting = TillConfig & {
  matches: TillPaymentView[];
  others: TillPaymentView[];
};

export type TillStatus = "UNCLAIMED" | "CLAIMED" | "MATCHED_STK" | "IGNORED";

export type TillRow = {
  id: string;
  transId: string;
  time: string;
  amount: string;
  payerName: string | null;
  status: TillStatus;
  saleId: string | null;
  note: string | null;
  ignoredReason: string | null;
};

type Bucket = { count: number; amount: string };

export type TillDay = {
  date: string;
  totals: {
    received: Bucket;
    claimed: Bucket;
    matchedStk: Bucket;
    unclaimed: Bucket;
    ignored: Bucket;
  };
  rows: TillRow[];
};
