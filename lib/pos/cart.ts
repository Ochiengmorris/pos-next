import { toCents, vatOf } from "./money";
import type { CartLine, Product } from "./types";

export type CartAction =
  | { type: "add"; product: Product; quantity?: number }
  | { type: "setQty"; productId: string; quantity: number }
  | { type: "remove"; productId: string }
  | { type: "clear" };

export function cartReducer(state: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case "add": {
      const p = action.product;
      const existing = state.find((l) => l.productId === p.id);
      const line: CartLine = {
        productId: p.id,
        name: p.name,
        priceCents: toCents(p.price),
        taxRate: Number(p.taxRate),
        quantity: (existing?.quantity ?? 0) + (action.quantity ?? 1),
        stockQty: p.stockQty,
      };
      // the line just scanned always goes to the top
      return [line, ...state.filter((l) => l.productId !== p.id)];
    }
    case "setQty":
      return state.map((l) =>
        l.productId === action.productId
          ? {
              ...l,
              quantity: Math.max(1, Math.min(action.quantity, l.stockQty)),
            }
          : l,
      );
    case "remove":
      return state.filter((l) => l.productId !== action.productId);
    case "clear":
      return [];
  }
}

export function cartTotals(lines: CartLine[]) {
  let totalCents = 0;
  let vatCents = 0;
  let itemCount = 0;
  for (const l of lines) {
    const line = l.priceCents * l.quantity;
    totalCents += line;
    vatCents += vatOf(line, l.taxRate);
    itemCount += l.quantity;
  }
  return { totalCents, vatCents, itemCount };
}
