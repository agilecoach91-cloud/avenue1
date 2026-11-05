import { formatMoney } from "@/lib/format";
import type { Addon, BookedAddon, BookedItem, PriceType, Service } from "@/lib/types";

/** Snapshot of the chosen services, kept on the booking so later price changes don't alter it. */
export function toItems(services: Service[]): BookedItem[] {
  return services.map((s) => ({
    service_id: s.id,
    name: s.name,
    price_type: s.price_type,
    price_cents: s.price_cents,
    duration_min: s.duration_min,
  }));
}

export function toBookedAddons(addons: Addon[]): BookedAddon[] {
  return addons.map((a) => ({
    addon_id: a.id,
    name: a.name,
    price_cents: a.price_cents,
    price_note: a.price_note,
  }));
}

/** Total time to block out for several services. */
export function totalDuration(items: { duration_min: number }[]): number {
  return items.reduce((sum, i) => sum + i.duration_min, 0);
}

/**
 * Combined price of services plus add-ons. Any "from" price makes the total a
 * "from" price; any quote-only service makes the whole job a quote.
 */
export function totalPrice(
  items: { price_type: PriceType | null; price_cents: number | null }[],
  addons: { price_cents: number | null }[] = [],
): { price_type: PriceType; price_cents: number | null } {
  if (items.length === 0 || items.some((i) => i.price_type === "quote" || i.price_cents == null)) {
    return { price_type: "quote", price_cents: null };
  }
  const cents =
    items.reduce((sum, i) => sum + (i.price_cents ?? 0), 0) + addons.reduce((sum, a) => sum + (a.price_cents ?? 0), 0);
  return { price_type: items.some((i) => i.price_type === "from") ? "from" : "fixed", price_cents: cents };
}

/** "Gutter clean", "Gutter clean and Downpipe flush", "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "$120", "$30 a day", "Free". */
export function formatAddonPrice(a: { price_cents: number | null; price_note?: string | null }): string {
  if (a.price_cents == null) return a.price_note ?? "";
  if (a.price_cents === 0) return "Free";
  return a.price_note ? `${formatMoney(a.price_cents)} ${a.price_note}` : formatMoney(a.price_cents);
}
