// pure date helpers (none read the current time)
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const BUSINESS_TZ = "Africa/Nairobi";

// "2026-10-12" + n days (calendar arithmetic on the date string, no time zones involved)
export function addDays(date: string, n: number): string {
  const t = new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

export function shortDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}

export function formatLongDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// trend buckets arrive as "YYYY-MM-DDTHH:mm" in business-local time
export function bucketLabel(
  bucket: string,
  interval: "hour" | "day" | "week" | "month",
): string {
  if (interval === "hour") return bucket.slice(11, 16);
  if (interval === "month")
    return `${MONTHS[Number(bucket.slice(5, 7)) - 1]} ${bucket.slice(0, 4)}`;
  return shortDate(bucket.slice(0, 10));
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// "14:05" for today's sales, "11 Oct 14:05" for older ones
export function formatSaleTime(iso: string, today: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-CA", { timeZone: BUSINESS_TZ }); // YYYY-MM-DD
  const time = d.toLocaleTimeString("en-GB", {
    timeZone: BUSINESS_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
  return day === today ? time : `${shortDate(day)} ${time}`;
}

// "13 Oct 08:42", in business time
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-CA", { timeZone: BUSINESS_TZ });
  const time = d.toLocaleTimeString("en-GB", {
    timeZone: BUSINESS_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${shortDate(day)} ${time}`;
}

// A business day as exact instants for the API. Nairobi has no daylight saving, so the offset is fixed.
export const startOfDayISO = (date: string) => `${date}T00:00:00+03:00`;
export const endOfDayISO = (date: string) => `${date}T23:59:59.999+03:00`;

// Today's business date. Call only from event handlers, never during render.
export const businessToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ }).format(
    new Date(),
  );
