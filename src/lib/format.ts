import { formatInTimeZone } from "date-fns-tz";
import type { PriceType } from "@/lib/types";

export function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "";
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars.toLocaleString("en-AU")}` : `$${dollars.toFixed(2)}`;
}

export function formatPrice(type: PriceType | null, cents: number | null): string {
  if (type === "quote" || cents == null) return "Quote";
  if (type === "from") return `From ${formatMoney(cents)}`;
  return formatMoney(cents);
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function formatWhen(iso: string, timezone: string): string {
  return formatInTimeZone(new Date(iso), timezone, "EEE d MMM, h:mm a").replace(/AM|PM/, (s) => s.toLowerCase());
}

export function formatDay(iso: string, timezone: string): string {
  return formatInTimeZone(new Date(iso), timezone, "EEEE d MMMM");
}

export function formatShortDay(iso: string, timezone: string): string {
  return formatInTimeZone(new Date(iso), timezone, "EEE d MMM");
}

export function formatTime(iso: string, timezone: string): string {
  return formatInTimeZone(new Date(iso), timezone, "h:mm a").toLowerCase();
}

export function countryFor(timezone: string): "AU" | "NZ" {
  return timezone.startsWith("Pacific/Auckland") || timezone.startsWith("Pacific/Chatham") ? "NZ" : "AU";
}

/**
 * Normalises an Australian or New Zealand phone number to E.164 (+61..., +64...).
 * Returns null if it doesn't look like a valid number.
 */
export function toE164(raw: string, country: "AU" | "NZ" = "AU"): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) {
    return /^\+\d{8,15}$/.test(digits) ? digits : null;
  }
  const cc = country === "NZ" ? "64" : "61";
  if (digits.startsWith(cc) && digits.length >= 10) return `+${digits}`;
  if (digits.startsWith("0")) {
    const rest = digits.slice(1);
    if (country === "AU" && rest.length === 9) return `+61${rest}`;
    if (country === "NZ" && rest.length >= 7 && rest.length <= 10) return `+64${rest}`;
  }
  return null;
}

export function isMobile(e164: string): boolean {
  return /^\+614\d{8}$/.test(e164) || /^\+642\d{7,9}$/.test(e164);
}

/** Displays +61412345678 as 0412 345 678. */
export function formatPhone(e164: string | null): string {
  if (!e164) return "";
  if (/^\+614\d{8}$/.test(e164)) {
    const n = `0${e164.slice(3)}`;
    return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  }
  if (e164.startsWith("+61")) return `0${e164.slice(3)}`;
  if (e164.startsWith("+64")) return `0${e164.slice(3)}`;
  return e164;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export const TIMEZONES = [
  { id: "Australia/Sydney", label: "NSW, ACT" },
  { id: "Australia/Melbourne", label: "Victoria" },
  { id: "Australia/Hobart", label: "Tasmania" },
  { id: "Australia/Brisbane", label: "Queensland" },
  { id: "Australia/Adelaide", label: "South Australia" },
  { id: "Australia/Darwin", label: "Northern Territory" },
  { id: "Australia/Perth", label: "Western Australia" },
  { id: "Pacific/Auckland", label: "New Zealand" },
];
