import Link from "next/link";
import { brandStyle } from "@/lib/color";
import { APP_NAME } from "@/lib/env";
import { PLAN_FEATURES, type Business } from "@/lib/types";

/** Frame for every customer-facing page of a business. */
export function PublicShell({
  business,
  back,
  children,
}: {
  business: Business;
  back?: { href: string; label: string };
  children: React.ReactNode;
}) {
  const showBadge = PLAN_FEATURES[business.plan].badge;
  return (
    <div style={brandStyle(business.brand_color)} className="min-h-dvh bg-surface">
      <div className="mx-auto max-w-xl px-4 pb-28 pt-4 sm:pt-8">
        {back && (
          <Link
            href={back.href}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-steel hover:text-ink"
          >
            <span aria-hidden>‹</span> {back.label}
          </Link>
        )}
        {children}
        {showBadge && (
          <p className="mt-10 text-center text-xs text-mist">
            Online bookings by{" "}
            <Link href="/" className="font-semibold underline-offset-2 hover:underline">
              {APP_NAME}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export function BusinessMark({ business, size = 56 }: { business: Business; size?: number }) {
  if (business.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={business.logo_url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-md border border-line bg-paper object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  const letters = business.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className="type-display grid shrink-0 place-items-center rounded-md"
      style={{ width: size, height: size, background: "var(--brand)", color: "var(--brand-ink)", fontSize: size * 0.38 }}
    >
      {letters}
    </span>
  );
}
