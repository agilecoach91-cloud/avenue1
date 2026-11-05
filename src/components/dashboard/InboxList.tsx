import Link from "next/link";
import { formatPhone, formatRelativeDay, formatTime } from "@/lib/format";
import type { Conversation, Location } from "@/lib/types";

function when(iso: string, tz: string) {
  const day = formatRelativeDay(iso, tz);
  return day === "Today" ? formatTime(iso, tz) : day;
}

function initials(name: string | null, phone: string) {
  if (!name) return phone.slice(-2);
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function InboxList({
  conversations,
  activeId,
  timezone,
  locations,
  filter,
  loc,
}: {
  conversations: Conversation[];
  activeId?: string;
  timezone: string;
  locations: Location[];
  filter: "all" | "unread";
  loc: string;
}) {
  const multi = locations.length > 1;
  const link = (f: string, l: string) => {
    const q = new URLSearchParams();
    if (f !== "all") q.set("filter", f);
    if (l) q.set("loc", l);
    const s = q.toString();
    return `/dashboard/inbox${s ? `?${s}` : ""}`;
  };
  const shown = filter === "unread" ? conversations.filter((c) => c.unread_count > 0) : conversations;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line p-3">
        {(["all", "unread"] as const).map((f) => (
          <Link
            key={f}
            href={link(f, loc)}
            aria-current={filter === f ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${filter === f ? "bg-ink text-paper" : "text-steel hover:text-ink"}`}
          >
            {f === "all" ? "All" : "Unread"}
          </Link>
        ))}
        {multi && (
          <span className="ml-auto flex flex-wrap gap-1">
            {[{ id: "", name: "All locations" }, ...locations].map((l) => (
              <Link
                key={l.id || "all"}
                href={link(filter, l.id)}
                aria-current={loc === l.id ? "page" : undefined}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  loc === l.id ? "border-ink text-ink" : "border-line text-steel hover:text-ink"
                }`}
              >
                {l.name}
              </Link>
            ))}
          </span>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="p-5 text-sm text-steel">
          {filter === "unread" ? "No unread messages." : "Texts with customers show up here, including booking confirmations and reminders."}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
          {shown.map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/inbox/${c.id}${loc ? `?loc=${loc}` : ""}`}
                aria-current={c.id === activeId ? "page" : undefined}
                className={`flex gap-3 p-3 ${c.id === activeId ? "bg-surface" : "hover:bg-surface"}`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-paper">
                  {initials(c.customer_name, c.customer_phone)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={`truncate ${c.unread_count ? "font-bold" : "font-semibold"}`}>
                      {c.customer_name || formatPhone(c.customer_phone)}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-steel">{when(c.last_message_at, timezone)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-sm ${c.unread_count ? "text-ink" : "text-steel"}`}>{c.last_message_preview}</span>
                    {c.unread_count > 0 && (
                      <span className="ml-auto shrink-0 rounded-full bg-stop px-1.5 text-xs font-bold leading-5 text-paper">{c.unread_count}</span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
