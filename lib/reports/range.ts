import { addDays, businessToday } from "@/lib/dashboard/format";

export type Range = { from: string; to: string };
export type Preset = "today" | "7d" | "30d" | "month" | "custom";
export type FixedPreset = Exclude<Preset, "custom">;

export const PRESET_LABEL: Record<FixedPreset, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
};

// pure: the caller supplies today's date
export function rangeEndingAt(today: string, preset: FixedPreset): Range {
  if (preset === "today") return { from: today, to: today };
  if (preset === "7d") return { from: addDays(today, -6), to: today };
  if (preset === "30d") return { from: addDays(today, -29), to: today };
  return { from: `${today.slice(0, 8)}01`, to: today };
}

// reads the clock: call from event handlers only, never during render
export const rangeFor = (preset: FixedPreset): Range =>
  rangeEndingAt(businessToday(), preset);

export const spanDays = (r: Range) =>
  Math.round((Date.parse(r.to) - Date.parse(r.from)) / 86_400_000) + 1;

// matches the backend's automatic bucket size
export const intervalFor = (r: Range): "hour" | "day" | "month" => {
  const n = spanDays(r);
  return n === 1 ? "hour" : n <= 62 ? "day" : "month";
};
