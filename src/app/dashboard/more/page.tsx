import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Icon } from "@/components/Icon";
import { PageTitle } from "@/components/dashboard/ui";
import { requireOwner } from "@/lib/data";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = { title: "More" };

const LINKS = [
  { href: "/dashboard/analytics", label: "Analytics", icon: "chart", hint: "Bookings, sources and add-ons" },
  { href: "/dashboard/services", label: "Services and add-ons", icon: "tag", hint: "Your price list" },
  { href: "/dashboard/share", label: "Share your page", icon: "share", hint: "Google, Instagram, website, QR code" },
  { href: "/dashboard/settings", label: "Settings", icon: "sliders", hint: "Profile, booking rules, notifications" },
];

export default async function MorePage() {
  const { business } = await requireOwner();
  return (
    <>
      <PageTitle title="More" />
      <ul className="panel divide-y divide-line">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex items-center gap-3 p-4 hover:bg-surface">
              <Icon name={l.icon} size={22} className="text-steel" />
              <span className="min-w-0 flex-1">
                <span className="type-heading block">{l.label}</span>
                <span className="block text-sm text-steel">{l.hint}</span>
              </span>
              <Icon name="right" size={18} className="text-mist" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a href={`${appUrl()}/${business.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost">
          View my page
        </a>
        <form action={signOut}>
          <button className="btn btn-ghost">Sign out</button>
        </form>
      </div>
    </>
  );
}
