"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";

export function NavLink({
  href,
  icon,
  badge,
  children,
  compact,
}: {
  href: string;
  icon: string;
  badge?: number;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const path = usePathname();
  const active = href === "/dashboard" ? path === href : path.startsWith(href);
  const count = badge ? (
    <span className="ml-auto min-w-5 rounded-full bg-stop px-1.5 text-center text-xs font-bold leading-5 text-paper">
      {badge > 99 ? "99+" : badge}
    </span>
  ) : null;
  if (compact) {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[0.7rem] font-semibold ${active ? "text-ink" : "text-steel"}`}
      >
        <span className={`grid h-7 w-12 place-items-center rounded-full ${active ? "bg-amber/25" : ""}`}>
          <Icon name={icon} size={20} />
        </span>
        {children}
        {badge ? (
          <span className="absolute right-[calc(50%-1.6rem)] top-1.5 min-w-4 rounded-full bg-stop px-1 text-center text-[0.65rem] font-bold leading-4 text-paper">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-md px-2 py-2 font-semibold ${active ? "bg-surface text-ink" : "text-steel hover:text-ink"}`}
    >
      <Icon name={icon} size={19} />
      {children}
      {count}
    </Link>
  );
}
