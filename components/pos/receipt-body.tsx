// one layout, used for the on-screen preview and the printed slip
"use client";

import { QRCodeSVG } from "qrcode.react";
import type { Paper } from "@/hooks/use-paper-width";
import { formatKsh, toCents } from "@/lib/pos/money";
import type { Receipt } from "@/lib/pos/types";
import { cn } from "cn";

const METHOD: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MPESA: "M-Pesa",
};
const CLASS_LABEL: Record<string, string> = {
  A: "Exempt",
  B: "VAT",
  C: "Zero-rated",
  D: "Non-VAT",
  E: "VAT",
};
const money = (v: string) => formatKsh(toCents(v));

// KRA's yyyyMMddHHmmss -> dd/MM/yyyy HH:mm:ss
const scuTime = (s: string | null) =>
  s && /^\d{14}$/.test(s)
    ? `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)} ${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}`
    : (s ?? "");

function Row({
  left,
  right,
  bold,
}: {
  left: string;
  right: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "font-bold" : ""}`}>
      <span>{left}</span>
      <span className="whitespace-nowrap tabular-nums">{right}</span>
    </div>
  );
}

const Rule = () => <hr className="my-2 border-dashed border-black" />;

const Box = ({ children }: { children: React.ReactNode }) => (
  <div className="my-2 border-2 border-black p-1 text-center font-bold leading-4">
    {children}
  </div>
);

export function ReceiptBody({
  r,
  paper = "80mm",
}: {
  r: Receipt;
  paper?: Paper;
}) {
  const e = r.etims;
  const filed = e?.status === "ACCEPTED"; // confirmed by KRA
  const mock = e?.status === "MOCK_ACCEPTED"; // accepted by the development mock only
  const unconfirmed = e?.status === "PENDING" || e?.status === "FAILED";
  const hasScu = (filed || mock) && !!e?.signature;

  const when = new Date(r.date).toLocaleString("en-GB", {
    timeZone: "Africa/Nairobi",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const narrow = paper === "58mm";

  return (
    <div
      className={`mx-auto w-full ${narrow ? "max-w-[48mm]" : "max-w-[72mm]"} font-mono text-xs leading-5 text-black`}
    >
      <div className="text-center">
        <p className="text-sm font-bold">{r.store.name}</p>
        {r.store.address && <p>{r.store.address}</p>}
        {r.store.phone && <p>{r.store.phone}</p>}
        {(e?.tin ?? r.store.taxPin) && <p>PIN: {e?.tin ?? r.store.taxPin}</p>}
      </div>

      {unconfirmed && (
        <Box>
          <p>PROVISIONAL RECEIPT</p>
          <p>NOT A TAX INVOICE</p>
          <p className="font-normal">eTIMS: {e?.status}</p>
        </Box>
      )}
      {mock && (
        <Box>
          <p>MOCK eTIMS</p>
          <p>NOT FILED WITH KRA</p>
          <p>NOT A TAX INVOICE</p>
        </Box>
      )}
      {r.status !== "COMPLETED" && (
        <Box>
          <p>*** {r.status === "VOIDED" ? "VOIDED" : "REFUNDED"} ***</p>
        </Box>
      )}

      <p className="mt-1 text-center font-bold">
        {filed ? "TAX INVOICE" : "SALES RECEIPT"}
      </p>
      {filed && e!.copy > 0 && <p className="text-center font-bold">COPY</p>}

      <Rule />
      <Row left="Receipt" right={r.receiptNo} />
      <Row left="Date" right={when} />
      <Row left="Cashier" right={r.cashier} />
      {r.customer && <Row left="Customer" right={r.customer} />}
      {r.customerPin && <Row left="Customer PIN" right={r.customerPin} />}

      <Rule />
      {r.items.map((i, n) => (
        <div key={n} className="mb-1">
          <p>
            {i.name} [{i.taxTyCd}]
          </p>
          <Row
            left={`  ${i.quantity} x ${money(i.unitPrice)}`}
            right={money(i.lineTotal)}
          />
        </div>
      ))}

      <Rule />
      <Row left="Net (excl. VAT)" right={money(r.subtotal)} />
      <Row left="VAT included" right={money(r.taxTotal)} />
      <Row left="TOTAL" right={money(r.total)} bold />

      <Rule />
      <p className="font-bold">Tax summary</p>
      {r.taxBreakdown.map((t) => (
        <div key={t.code} className="mb-1">
          <p>
            {t.code} {CLASS_LABEL[t.code] ?? ""}{" "}
            {Number(t.rate) > 0 ? `${Number(t.rate)}%` : ""}
          </p>
          <Row left="  Net" right={money(t.net)} />
          <Row left="  VAT" right={money(t.vat)} />
        </div>
      ))}

      <Rule />
      {r.payments.map((p, n) => (
        <div key={n}>
          <Row
            left={`${METHOD[p.method] ?? p.method}${p.reference ? ` (Ref:${p.reference})` : ""}`}
            right={money(p.amount)}
          />
        </div>
      ))}
      {toCents(r.changeDue) > 0 && (
        <Row left="Change" right={money(r.changeDue)} bold />
      )}

      {hasScu && e && (
        <>
          <Rule />
          <p className="text-center font-bold">
            {mock ? "MOCK DATA, NOT FROM KRA" : "KRA eTIMS"}
          </p>
          <Row left="Invoice No" right={String(e.invoiceNo ?? "")} />
          <Row
            left="Receipt No"
            right={`${e.scuReceiptNo}/${e.scuTotalReceiptNo}`}
          />
          <Row left="SCU ID" right={e.sdcId ?? ""} />
          {e.mrcNo && <Row left="MRC No" right={e.mrcNo} />}
          <Row left="SCU time" right={scuTime(e.sdcDateTime)} />
          <p
            className={cn(
              "flex justify-between items-baseline-last",
              paper === "80mm" ? "" : "flex-col items-stretch",
            )}
          >
            <span className="break-all">
              Internal <br /> data:
            </span>
            <span className="shrink-0">{e.internalData}</span>
          </p>
          <p className="break-all flex justify-between">
            Signature: <span>{e.signature}</span>
          </p>
          {e.qrPayload ? (
            <div className="mt-2 flex flex-col items-center gap-1">
              <div className={narrow ? "w-[26mm]" : "w-[32mm]"}>
                <QRCodeSVG
                  value={e.qrPayload}
                  level="M"
                  marginSize={2}
                  style={{ width: "100%", height: "auto" }}
                />
              </div>
              {filed && (
                <p className="text-center">Scan to verify this invoice</p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-center">
              QR code not available. Use the signature above to verify.
            </p>
          )}
        </>
      )}

      {r.store.footer && <p className="mt-3 text-center">{r.store.footer}</p>}
    </div>
  );
}
