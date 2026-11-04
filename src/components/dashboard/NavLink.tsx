"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children, compact }: { href: string; children: React.ReactNode; compact?: boolean }) {
  const path = usePathname();
  const active = href === "/dashboard" ? path === href : path.startsWith(href);
  if (compact) {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`py-3 text-center text-xs font-semibold ${active ? "text-ink" : "text-steel"}`}
      >
        <span className={`mx-auto mb-1 block h-1 w-6 rounded-full ${active ? "bg-amber" : "bg-transparent"}`} />
        {children}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-2 py-2 font-semibold ${active ? "bg-surface text-ink" : "text-steel hover:text-ink"}`}
    >
      {children}
    </Link>
  );
}
