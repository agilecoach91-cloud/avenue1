import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { AvailabilityRule } from "@/lib/types";

export type Interval = { start: Date; end: Date };

export type SlotOptions = {
  timezone: string;
  rules: AvailabilityRule[];
  /** Existing active bookings and time off. */
  busy: Interval[];
  durationMin: number;
  intervalMin: number;
  leadTimeHours: number;
  windowDays: number;
  now?: Date;
  /** Most bookings per day by weekday (0 = Sunday). Missing = no limit. */
  dailyLimits?: Record<number, number>;
  /** Active bookings already on each local date (YYYY-MM-DD). */
  dayCounts?: Record<string, number>;
};

export type Slot = { start: string; end: string; label: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Weekday (0 = Sunday) of a calendar date string, independent of time zones. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Converts a local date + minutes-from-midnight in `timezone` to a UTC instant. */
export function localToUtc(date: string, minute: number, timezone: string): Date {
  if (minute >= 1440) return fromZonedTime(`${addDays(date, 1)}T00:00:00`, timezone);
  return fromZonedTime(`${date}T${minutesToHHMM(minute)}:00`, timezone);
}

export function todayIn(timezone: string, now = new Date()): string {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

/** Calendar dates customers may book: today through today + windowDays. */
export function bookableDates(timezone: string, windowDays: number, now = new Date()): string[] {
  const first = todayIn(timezone, now);
  return Array.from({ length: windowDays + 1 }, (_, i) => addDays(first, i));
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** All free start times on one local calendar date. */
export function slotsForDate(date: string, opts: SlotOptions): Slot[] {
  if (!DATE_RE.test(date)) return [];
  const now = opts.now ?? new Date();
  const dates = bookableDates(opts.timezone, opts.windowDays, now);
  if (!dates.includes(date)) return [];

  const weekday = weekdayOf(date);
  const limit = opts.dailyLimits?.[weekday];
  if (limit != null && (opts.dayCounts?.[date] ?? 0) >= limit) return [];

  const earliest = new Date(now.getTime() + opts.leadTimeHours * 3_600_000);
  const durationMs = opts.durationMin * 60_000;
  const seen = new Set<string>();
  const slots: Slot[] = [];

  const rules = opts.rules
    .filter((r) => r.weekday === weekday)
    .sort((a, b) => a.start_minute - b.start_minute);

  for (const rule of rules) {
    for (
      let minute = rule.start_minute;
      minute + opts.durationMin <= rule.end_minute;
      minute += opts.intervalMin
    ) {
      const start = localToUtc(date, minute, opts.timezone);
      const candidate = { start, end: new Date(start.getTime() + durationMs) };
      if (start < earliest) continue;
      if (opts.busy.some((b) => overlaps(candidate, b))) continue;
      const iso = start.toISOString();
      if (seen.has(iso)) continue;
      seen.add(iso);
      slots.push({
        start: iso,
        end: candidate.end.toISOString(),
        label: formatInTimeZone(start, opts.timezone, "h:mm a").toLowerCase(),
      });
    }
  }
  return slots;
}

/** Dates in the booking window that have at least one free slot. */
export function datesWithSlots(opts: SlotOptions): string[] {
  return bookableDates(opts.timezone, opts.windowDays, opts.now).filter(
    (d) => slotsForDate(d, opts).length > 0,
  );
}

/** True if `startIso` is still a free slot (used to re-check before saving a booking). */
export function isSlotAvailable(startIso: string, opts: SlotOptions): boolean {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return false;
  const date = formatInTimeZone(start, opts.timezone, "yyyy-MM-dd");
  return slotsForDate(date, opts).some((s) => s.start === start.toISOString());
}

/** Local calendar date (YYYY-MM-DD) of an instant in `timezone`. */
export function localDate(iso: string | Date, timezone: string): string {
  return formatInTimeZone(new Date(iso), timezone, "yyyy-MM-dd");
}

/** Reads a location's daily_limits JSON ({"1": 4}) into weekday numbers, ignoring blanks. */
export function parseDailyLimits(raw: Record<string, unknown> | null | undefined): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) continue;
    const day = Number(k);
    const n = Number(v);
    if (Number.isInteger(day) && day >= 0 && day <= 6 && Number.isInteger(n) && n >= 0) out[day] = n;
  }
  return out;
}

/** Is a booking outside the business's usual hours (evenings, weekends, before 7am)? */
export function isAfterHours(createdAt: Date, timezone: string): boolean {
  const hour = Number(formatInTimeZone(createdAt, timezone, "H"));
  const day = Number(formatInTimeZone(createdAt, timezone, "i")); // 1 = Mon .. 7 = Sun
  return day >= 6 || hour < 7 || hour >= 18;
}
