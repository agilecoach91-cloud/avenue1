"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** A select that updates one query parameter, e.g. ?loc= on the bookings table. */
export function FilterSelect({
  param,
  label,
  value,
  options,
}: {
  param: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      <span className="sr-only">{label}</span>
      <select
        className="field min-h-[38px] w-auto py-1.5 text-sm"
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value) next.set(param, e.target.value);
          else next.delete(param);
          const qs = next.toString();
          router.push(`${pathname}${qs ? `?${qs}` : ""}`);
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
