import Link from "next/link";
import { requireOwner } from "@/lib/data";
import { APP_NAME, appUrl } from "@/lib/env";
import { signOut } from "@/app/login/actions";
import { NavLink } from "@/components/dashboard/NavLink";

const NAV = [
  { href: "/dashboard", label: "Today", mobile: true },
  { href: "/dashboard/bookings", label: "Bookings", mobile: true },
  { href: "/dashboard/enquiries", label: "Quotes", mobile: true },
  { href: "/dashboard/services", label: "Services", mobile: true },
  { href: "/dashboard/hours", label: "Hours", mobile: false },
  { href: "/dashboard/share", label: "Share your page", mobile: true },
  { href: "/dashboard/settings", label: "Settings", mobile: false },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { business } = await requireOwner();
  const pageUrl = `${appUrl()}/${business.slug}`;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r border-line bg-paper md:flex md:min-h-dvh md:flex-col md:px-4 md:py-6">
        <Link href="/dashboard" className="type-display mb-1 px-2 text-xl">
          {APP_NAME}
        </Link>
        <p className="mb-6 truncate px-2 text-sm text-steel">{business.name}</p>
        <nav aria-label="Dashboard" className="grid gap-0.5">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto grid gap-2 px-2 pt-6">
          <a href={pageUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
            View my page
          </a>
          <form action={signOut}>
            <button className="text-sm text-steel underline">Sign out</button>
          </form>
        </div>
      </aside>

      <header className="flex items-center justify-between border-b border-line bg-paper px-4 py-3 md:hidden">
        <Link href="/dashboard" className="type-display text-lg">
          {APP_NAME}
        </Link>
        <div className="flex items-center gap-3">
          <a href={pageUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold underline">
            My page
          </a>
          <Link href="/dashboard/settings" className="text-sm font-semibold underline">
            Settings
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">{children}</main>

      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-line bg-paper md:hidden"
      >
        {NAV.filter((n) => n.mobile).map((n) => (
          <NavLink key={n.href} href={n.href} compact>
            {n.label === "Share your page" ? "Share" : n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
