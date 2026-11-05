import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { NavLink } from "@/components/dashboard/NavLink";
import { BusinessMark } from "@/components/public/PublicShell";
import { requireOwner } from "@/lib/data";
import { APP_NAME, appUrl } from "@/lib/env";

const NAV = [
  { href: "/dashboard", label: "Today", icon: "sun" },
  { href: "/dashboard/bookings", label: "Bookings", icon: "list" },
  { href: "/dashboard/inbox", label: "Inbox", icon: "message" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "chart" },
  { href: "/dashboard/calendar", label: "Calendar", icon: "calendar" },
  { href: "/dashboard/services", label: "Services", icon: "tag" },
  { href: "/dashboard/share", label: "Share your page", icon: "share" },
  { href: "/dashboard/settings", label: "Settings", icon: "sliders" },
];

const MOBILE_NAV = [
  { href: "/dashboard", label: "Today", icon: "sun" },
  { href: "/dashboard/bookings", label: "Bookings", icon: "list" },
  { href: "/dashboard/inbox", label: "Inbox", icon: "message" },
  { href: "/dashboard/calendar", label: "Calendar", icon: "calendar" },
  { href: "/dashboard/more", label: "More", icon: "menu" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, business } = await requireOwner();
  const pageUrl = `${appUrl()}/${business.slug}`;
  const { count: unread } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .gt("unread_count", 0);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15.5rem_1fr]">
      <aside className="hidden border-r border-line bg-paper md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:px-4 md:py-5">
        <Link href="/dashboard" className="mb-5 flex items-center gap-2.5 rounded-md p-1.5 hover:bg-surface">
          <BusinessMark business={business} size={36} />
          <span className="min-w-0">
            <span className="type-heading block truncate text-[0.95rem]">{business.name}</span>
            <span className="block text-xs capitalize text-steel">{business.plan} plan</span>
          </span>
        </Link>
        <nav aria-label="Dashboard" className="grid gap-0.5">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} icon={n.icon} badge={n.href === "/dashboard/inbox" ? (unread ?? 0) : 0}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto grid gap-2 px-1 pt-6">
          <a href={pageUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
            View my page
          </a>
          <div className="flex items-center justify-between px-1">
            <span className="type-display text-sm text-mist">{APP_NAME}</span>
            <form action={signOut}>
              <button className="text-sm text-steel underline">Sign out</button>
            </form>
          </div>
        </div>
      </aside>

      <header className="flex items-center justify-between gap-3 border-b border-line bg-paper px-4 py-2.5 md:hidden">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          <BusinessMark business={business} size={32} />
          <span className="type-heading truncate">{business.name}</span>
        </Link>
        <a href={pageUrl} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-semibold underline">
          My page
        </a>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8">{children}</main>

      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {MOBILE_NAV.map((n) => (
          <NavLink key={n.href} href={n.href} icon={n.icon} badge={n.href === "/dashboard/inbox" ? (unread ?? 0) : 0} compact>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
