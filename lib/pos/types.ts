export const PRODUCT_PAGE_SIZE = 100;

export type Category = {
  id: string;
  name: string;
  _count: { products: number };
};

export type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  price: string; // decimals arrive from the API as strings
  taxRate: string;
  stockQty: number;
  reorderLevel: number;
  categoryId: string | null;
};

export type ProductPage = {
  items: Product[];
  meta: { total: number; page: number; limit: number; pages: number };
};

export type CartLine = {
  productId: string;
  name: string;
  priceCents: number;
  taxRate: number;
  quantity: number;
  stockQty: number;
};

export type PaymentEntry = {
  id: string;
  method: "CASH" | "CARD" | "MPESA";
  amountCents: number; // the part of the bill this payment covers
  tenderedCents?: number; // cash handed over (may exceed the amount)
  reference?: string; // card slip, or the M-Pesa receipt code (display only)
  mpesaPaymentId?: string; // links the sale to the confirmed STK payment
};

export type EtimsDisplay =
  | "NOT_REQUIRED"
  | "PENDING"
  | "ACCEPTED"
  | "FAILED"
  | "CANCELLED"
  | "MOCK_ACCEPTED";

export type ReceiptEtims = {
  status: EtimsDisplay;
  environment: string;
  tin: string | null;
  invoiceNo: number | null;
  scuReceiptNo: number | null;
  scuTotalReceiptNo: number | null;
  sdcId: string | null;
  mrcNo: string | null;
  sdcDateTime: string | null;
  internalData: string | null;
  signature: string | null;
  qrPayload: string | null;
  acceptedAt: string | null;
  copy: number;
} | null;

export type Receipt = {
  saleId: string;
  status: "COMPLETED" | "VOIDED" | "REFUNDED";
  store: {
    name: string;
    address: string;
    phone: string;
    taxPin: string;
    footer: string;
  };
  receiptNo: string;
  date: string;
  cashier: string;
  customer: string | null;
  customerPin: string | null;
  items: {
    name: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    taxTyCd: string;
  }[];
  taxBreakdown: {
    code: string;
    rate: string;
    net: string;
    vat: string;
    gross: string;
  }[];
  subtotal: string;
  taxTotal: string;
  total: string;
  payments: {
    method: string;
    amount: string;
    reference: string | null;
    tendered: string | null;
  }[];
  changeDue: string;
  etims: ReceiptEtims;
};
