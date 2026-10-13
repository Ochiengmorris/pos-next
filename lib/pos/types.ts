// lib/pos/types.ts
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

export type Receipt = {
  status: "COMPLETED" | "VOIDED" | "REFUNDED";
  store: { name: string; address: string; phone: string; taxPin: string };
  receiptNo: string;
  date: string;
  cashier: string;
  customer: string | null;
  items: {
    name: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
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
};
