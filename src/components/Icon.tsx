import type { ReactNode, SVGProps } from "react";

// Line icons drawn on a 24px grid, used for booking tiles, add-ons and the
// portal navigation. Service and add-on rows store the icon's name.

const PATHS: Record<string, ReactNode> = {
  bug: (
    <>
      <ellipse cx="12" cy="13.5" rx="4.5" ry="6" />
      <path d="M12 9v10.5M10 7.6a2 2 0 0 1 4 0M9.5 6.5 7 3.5M14.5 6.5 17 3.5M7.6 11 4 9.5M7.5 14H3.5M7.8 17 4.5 19M16.4 11 20 9.5M16.5 14h4M16.2 17l3.3 2" />
    </>
  ),
  termite: (
    <>
      <circle cx="12" cy="5.5" r="2" />
      <ellipse cx="12" cy="10.5" rx="2" ry="2.5" />
      <ellipse cx="12" cy="17" rx="3" ry="4" />
      <path d="M10.6 4 8.5 2M13.4 4l2.1-2M10.2 9.5 6 8M10 11.5l-4.5 1M10.2 13 7 16.5M13.8 9.5 18 8M14 11.5l4.5 1M13.8 13l3.2 3.5" />
    </>
  ),
  inspect: (
    <>
      <path d="M3 11.5 11 4.5l8 7M5 10v9.5h6" />
      <circle cx="16" cy="16" r="3.2" />
      <path d="m18.4 18.4 2.6 2.6" />
    </>
  ),
  rodent: (
    <>
      <path d="M4 17c0-4.4 3.6-8 8-8 2.2 0 4 1 5 2.5l2.5.5c.8.2 1.5 1 1.5 1.8 0 .7-.6 1.2-1.3 1.2H18c-.6 1.2-2 2-3.5 2z" />
      <circle cx="15.5" cy="9.5" r="1.8" />
      <path d="M4 17c-2 .5-2.5 2.5-1 3.5" />
    </>
  ),
  spray: (
    <>
      <path d="M9 9h5l1 3v8.5a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V12zM10 9V6.5h3V9M10 6.5 9 4h5.5L16 6.5M18.5 4.5h2M18.5 7H21M18.5 9.5h2" />
    </>
  ),
  spider: (
    <>
      <circle cx="12" cy="9.5" r="2" />
      <ellipse cx="12" cy="15" rx="3" ry="3.5" />
      <path d="M9.5 13.5 4 10V6M14.5 13.5 20 10V6M9 15.5l-5.5-.5-1 4M15 15.5l5.5-.5 1 4M9.8 17.5 6 21M14.2 17.5 18 21M10.5 8.5 7 5M13.5 8.5 17 5" />
    </>
  ),
  wasp: (
    <>
      <ellipse cx="12" cy="15" rx="3.5" ry="5" />
      <circle cx="12" cy="7.5" r="2" />
      <path d="M8.6 13.5h6.8M8.8 16.5h6.4M10.5 9.5C7 7 4 8 4.5 10.5S9 12 10 11M13.5 9.5C17 7 20 8 19.5 10.5S15 12 14 11M12 20v2" />
    </>
  ),
  aircon: (
    <>
      <rect x="2.5" y="5" width="19" height="9" rx="2" />
      <path d="M5.5 11h13M8 17.5c0 1 .8 1.5.8 2.5M12 17.5c0 1 .8 1.5.8 2.5M16 17.5c0 1 .8 1.5.8 2.5" />
    </>
  ),
  snowflake: <path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5" />,
  fan: (
    <>
      <circle cx="12" cy="12" r="1.5" />
      <path d="M12 10.5c-1-3 0-6.5 2.5-6.5 2 0 2.5 2.5.5 4.5zM13.4 12.6c3 .6 5.6 3.2 4.3 5.4-1 1.7-3.4 1-4.2-1.7zM10.6 12.5c-2.4 2.1-6 2.6-7 .3-.8-1.8 1-3.6 3.8-3z" />
    </>
  ),
  gutter: <path d="M2 11 12 4l10 7M3.5 12.5h17v2h-17zM6 18v.5M10 17v.5M14 19v.5M18 17.5v.5" />,
  window: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M12 3v18M4 12h16" />
    </>
  ),
  solar: <path d="M3 16 6 6h14l-3 10zM4.5 11h14M9.5 6l-2 10M14.5 6l-2 10M10 16v4M7 20h6" />,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />,
  bucket: <path d="M5 8h14l-1.5 12.5a1 1 0 0 1-1 .9h-9a1 1 0 0 1-1-.9zM5 8a7 4 0 0 1 14 0M8 12.5h8" />,
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8.5-8.5M16 7l2.5 2.5M14 9l2 2" />
    </>
  ),
  carpet: (
    <>
      <rect x="3" y="12" width="18" height="8" rx="1.5" />
      <path d="M6 9c0-1.5 1.5-1.5 1.5-3S6 4.5 6 3M12 9c0-1.5 1.5-1.5 1.5-3S12 4.5 12 3M18 9c0-1.5 1.5-1.5 1.5-3S18 4.5 18 3" />
    </>
  ),
  oven: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <rect x="7" y="11" width="10" height="7" rx="1" />
      <path d="M4 8h16M8 5.5h.01M11 5.5h.01" />
    </>
  ),
  fridge: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="2" />
      <path d="M6 10h12M9 6v1.5M9 13v3" />
    </>
  ),
  pool: <path d="M2 18c1.7 0 1.7 1.2 3.3 1.2S7 18 8.7 18s1.6 1.2 3.3 1.2 1.7-1.2 3.3-1.2 1.7 1.2 3.4 1.2S20.3 18 22 18M8 15V5a2 2 0 0 1 4 0M14 15V5a2 2 0 0 1 4 0M8 8.5h6M8 12h6" />,
  droplet: <path d="M12 3c3.5 4.2 6 7.6 6 10.7A6 6 0 0 1 6 13.7C6 10.6 8.5 7.2 12 3zM9.5 14a2.5 2.5 0 0 0 2.5 2.5" />,
  filter: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M7 7h10M7 17h10M10 7v10M14 7v10" />
    </>
  ),
  lawn: <path d="M3 21h18M5 21c0-4-1-7-2.5-9M8 21c0-5 .5-9 2.5-12M12 21c0-5-1-8-3-10M15 21c0-4.5 1-8 3.5-10.5M19 21c0-3 .5-5.5 2-7" />,
  leaf: <path d="M5 19C5 11 10 5 20 5c0 10-6 15-14 15M5 19l8-8" />,
  truck: (
    <>
      <path d="M2 6h11v10H2zM13 9h4.5L21 12.5V16h-8" />
      <circle cx="6.5" cy="17.5" r="2" />
      <circle cx="17" cy="17.5" r="2" />
    </>
  ),
  wrench: <path d="M14.5 6.5a4 4 0 0 0-5.3 5.2l-5.7 5.7a1.6 1.6 0 0 0 2.3 2.3l5.7-5.7a4 4 0 0 0 5.2-5.3l-2.4 2.4-2.1-.3-.3-2.1z" />,
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <rect x="9" y="2.5" width="6" height="3" rx="1" />
      <path d="M8.5 10h7M8.5 13.5h7M8.5 17h4" />
    </>
  ),
  camera: (
    <>
      <path d="M4 7.5h3l1.5-2h7l1.5 2h3a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  shield: <path d="M12 3 5 6v5.5c0 4.3 3 7.8 7 9.5 4-1.7 7-5.2 7-9.5V6zM9 12l2 2 4-4" />,
  home: <path d="M3 11 12 4l9 7M5 9.5V20h14V9.5M10 20v-5h4v5" />,
  tag: (
    <>
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  // Interface icons
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  left: <path d="m15 18-6-6 6-6" />,
  right: <path d="m9 18 6-6-6-6" />,
  send: <path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" />,
  phone: <path d="M5 3.5h3.5L10 8 7.8 9.5a11 11 0 0 0 6.7 6.7l1.5-2.2 4.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5A16.5 16.5 0 0 1 3.5 5 1.5 1.5 0 0 1 5 3.5z" />,
  message: <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />,
  chart: <path d="M3 20h18M6 16v-5M11 16V6M16 16v-8M21 16v-3" />,
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  plus: <path d="M12 5v14M5 12h14" />,
};

/** Icons an owner can pick for a service or add-on, in picker order. */
export const PICKER_ICONS: { id: string; label: string }[] = [
  { id: "bug", label: "Bugs" },
  { id: "termite", label: "Termites" },
  { id: "spider", label: "Spiders" },
  { id: "wasp", label: "Wasps" },
  { id: "rodent", label: "Rodents" },
  { id: "spray", label: "Spray" },
  { id: "inspect", label: "Inspection" },
  { id: "shield", label: "Protection" },
  { id: "aircon", label: "Air-con" },
  { id: "snowflake", label: "Cooling" },
  { id: "fan", label: "Fan" },
  { id: "gutter", label: "Gutters" },
  { id: "window", label: "Windows" },
  { id: "solar", label: "Solar" },
  { id: "sparkle", label: "Clean" },
  { id: "bucket", label: "Bucket" },
  { id: "key", label: "Keys" },
  { id: "carpet", label: "Carpet" },
  { id: "oven", label: "Oven" },
  { id: "fridge", label: "Fridge" },
  { id: "pool", label: "Pool" },
  { id: "droplet", label: "Water" },
  { id: "filter", label: "Filter" },
  { id: "lawn", label: "Lawn" },
  { id: "leaf", label: "Garden" },
  { id: "truck", label: "Van" },
  { id: "wrench", label: "Repairs" },
  { id: "zap", label: "Electrical" },
  { id: "home", label: "Home" },
  { id: "clipboard", label: "Quote" },
  { id: "camera", label: "Photos" },
  { id: "clock", label: "Time" },
  { id: "tag", label: "Price" },
];

export function hasIcon(name: string | null | undefined): name is string {
  return Boolean(name && PATHS[name]);
}

export function Icon({
  name,
  size = 24,
  strokeWidth = 1.75,
  ...rest
}: { name: string; size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {PATHS[name] ?? PATHS.wrench}
    </svg>
  );
}
