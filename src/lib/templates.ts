import type { BookingMode, PriceType, Question } from "@/lib/types";

// Starter menus for fixed-price home-service trades. Owners edit prices after
// signup; these exist so a new page looks complete in under a minute.

export type ServiceTemplate = {
  name: string;
  description?: string;
  price_type: PriceType;
  price_cents?: number;
  duration_min: number;
  booking_mode: BookingMode;
  questions?: Question[];
  repeat_months?: number;
  icon: string;
};

export type AddonTemplate = {
  name: string;
  description?: string;
  price_cents?: number;
  price_note?: string;
  icon: string;
};

export type TradeTemplate = {
  id: string;
  label: string;
  tagline: string;
  services: ServiceTemplate[];
  addons: AddonTemplate[];
};

const propertyType: Question = {
  id: "property_type",
  label: "Property type",
  type: "select",
  options: ["House", "Townhouse", "Unit / apartment", "Commercial"],
  required: true,
};

const storeys: Question = {
  id: "storeys",
  label: "How many storeys?",
  type: "select",
  options: ["1", "2", "3+"],
  required: true,
};

export const TRADE_TEMPLATES: TradeTemplate[] = [
  {
    id: "pest_control",
    label: "Pest control",
    tagline: "Licensed pest control, booked online.",
    services: [
      {
        name: "General pest treatment",
        icon: "bug",
        description: "Inside and out: cockroaches, spiders, ants and silverfish.",
        price_type: "from",
        price_cents: 19900,
        duration_min: 90,
        booking_mode: "instant",
        questions: [propertyType, storeys],
        repeat_months: 12,
      },
      {
        name: "Termite inspection",
        icon: "termite",
        description: "Visual and thermal inspection with a written report.",
        price_type: "fixed",
        price_cents: 29900,
        duration_min: 120,
        booking_mode: "instant",
        questions: [propertyType],
        repeat_months: 12,
      },
      {
        name: "Pre-purchase pest inspection",
        icon: "inspect",
        description: "Report delivered within 24 hours, for buyers and agents.",
        price_type: "fixed",
        price_cents: 34900,
        duration_min: 120,
        booking_mode: "instant",
        questions: [
          propertyType,
          { id: "settlement", label: "Settlement or cooling-off date", type: "text" },
        ],
      },
      {
        name: "Rodent control",
        icon: "rodent",
        price_type: "from",
        price_cents: 22000,
        duration_min: 60,
        booking_mode: "instant",
        questions: [propertyType],
      },
      {
        name: "Termite treatment",
        icon: "shield",
        description: "Priced after an inspection of the property.",
        price_type: "quote",
        duration_min: 240,
        booking_mode: "quote",
      },
    ],
    addons: [
      { name: "Wasp nest removal", price_cents: 12000, icon: "wasp" },
      { name: "Spider treatment for shed or pergola", price_cents: 6000, icon: "spider" },
      { name: "Rodent bait stations (set of 4)", price_cents: 9000, icon: "rodent" },
      { name: "Written report for real estate", price_cents: 4000, icon: "clipboard" },
    ],
  },
  {
    id: "air_con",
    label: "Air-con servicing",
    tagline: "Split system cleaning and servicing, booked online.",
    services: [
      {
        name: "Split system clean (1 unit)",
        icon: "aircon",
        price_type: "fixed",
        price_cents: 14900,
        duration_min: 60,
        booking_mode: "instant",
        repeat_months: 12,
      },
      {
        name: "Split system clean (2 units)",
        icon: "snowflake",
        price_type: "fixed",
        price_cents: 26900,
        duration_min: 120,
        booking_mode: "instant",
        repeat_months: 12,
      },
      {
        name: "Ducted system service",
        icon: "fan",
        price_type: "from",
        price_cents: 22900,
        duration_min: 120,
        booking_mode: "instant",
        questions: [storeys],
        repeat_months: 12,
      },
      {
        name: "New installation",
        icon: "wrench",
        description: "Supply and install, priced to the room size.",
        price_type: "quote",
        duration_min: 240,
        booking_mode: "quote",
      },
    ],
    addons: [
      { name: "Extra unit clean", price_cents: 11900, price_note: "per unit", icon: "aircon" },
      { name: "Anti-bacterial coil treatment", price_cents: 4000, icon: "sparkle" },
      { name: "Remote control check", description: "New batteries and a function test.", price_cents: 1500, icon: "zap" },
    ],
  },
  {
    id: "gutters_windows",
    label: "Gutter & window cleaning",
    tagline: "Gutters and windows done, booked online.",
    services: [
      {
        name: "Gutter clean",
        icon: "gutter",
        price_type: "from",
        price_cents: 22000,
        duration_min: 120,
        booking_mode: "instant",
        questions: [storeys],
        repeat_months: 12,
      },
      {
        name: "Window clean (inside and out)",
        icon: "window",
        price_type: "from",
        price_cents: 25000,
        duration_min: 180,
        booking_mode: "instant",
        questions: [storeys],
      },
      {
        name: "Roof or solar panel clean",
        icon: "solar",
        price_type: "quote",
        duration_min: 180,
        booking_mode: "quote",
      },
    ],
    addons: [
      { name: "Downpipe flush", price_cents: 6000, icon: "droplet" },
      { name: "Window tracks and screens", price_cents: 5000, icon: "window" },
      { name: "Before and after photos", price_cents: 0, icon: "camera" },
    ],
  },
  {
    id: "cleaning",
    label: "Cleaning",
    tagline: "Home cleaning, booked online.",
    services: [
      {
        name: "Regular clean",
        icon: "sparkle",
        price_type: "from",
        price_cents: 16000,
        duration_min: 180,
        booking_mode: "instant",
        questions: [
          { id: "bedrooms", label: "Bedrooms", type: "select", options: ["1", "2", "3", "4", "5+"], required: true },
        ],
      },
      {
        name: "End-of-lease clean",
        icon: "key",
        price_type: "from",
        price_cents: 39000,
        duration_min: 300,
        booking_mode: "instant",
        questions: [
          { id: "bedrooms", label: "Bedrooms", type: "select", options: ["1", "2", "3", "4", "5+"], required: true },
        ],
      },
      {
        name: "Carpet steam clean",
        icon: "carpet",
        price_type: "from",
        price_cents: 12000,
        duration_min: 90,
        booking_mode: "instant",
      },
    ],
    addons: [
      { name: "Oven clean", price_cents: 8000, icon: "oven" },
      { name: "Inside the fridge", price_cents: 4000, icon: "fridge" },
      { name: "Window tracks", price_cents: 3000, icon: "window" },
      { name: "Balcony or patio", price_cents: 4000, icon: "home" },
    ],
  },
  {
    id: "pool",
    label: "Pool care",
    tagline: "Pool cleaning and servicing, booked online.",
    services: [
      {
        name: "Pool clean and water test",
        icon: "pool",
        price_type: "fixed",
        price_cents: 9900,
        duration_min: 60,
        booking_mode: "instant",
        repeat_months: 1,
      },
      {
        name: "Green pool recovery",
        icon: "droplet",
        price_type: "from",
        price_cents: 25000,
        duration_min: 120,
        booking_mode: "instant",
      },
      {
        name: "Equipment repair",
        icon: "wrench",
        price_type: "quote",
        duration_min: 120,
        booking_mode: "quote",
      },
    ],
    addons: [
      { name: "Filter cartridge clean", price_cents: 4500, icon: "filter" },
      { name: "Salt top-up (per bag)", price_cents: 2500, price_note: "per bag", icon: "droplet" },
      { name: "Vacuum and brush walls", price_cents: 3500, icon: "pool" },
    ],
  },
  {
    id: "lawn_garden",
    label: "Lawn & garden",
    tagline: "Mowing and garden care, booked online.",
    services: [
      {
        name: "Lawn mow and edge",
        icon: "lawn",
        price_type: "from",
        price_cents: 6000,
        duration_min: 60,
        booking_mode: "instant",
        questions: [
          { id: "yard_size", label: "Yard size", type: "select", options: ["Small", "Medium", "Large"], required: true },
        ],
        repeat_months: 1,
      },
      {
        name: "Garden tidy-up",
        icon: "leaf",
        price_type: "from",
        price_cents: 15000,
        duration_min: 180,
        booking_mode: "instant",
      },
      {
        name: "Landscaping",
        icon: "home",
        price_type: "quote",
        duration_min: 240,
        booking_mode: "quote",
      },
    ],
    addons: [
      { name: "Green waste removal", price_cents: 4000, price_note: "per trailer", icon: "truck" },
      { name: "Hedge trim", price_cents: 6000, icon: "leaf" },
      { name: "Lawn fertiliser", price_cents: 3500, icon: "lawn" },
    ],
  },
  {
    id: "general",
    label: "Other home service",
    tagline: "Book online in under a minute.",
    services: [
      {
        name: "Standard service",
        icon: "wrench",
        price_type: "from",
        price_cents: 15000,
        duration_min: 60,
        booking_mode: "instant",
      },
      {
        name: "Request a quote",
        icon: "clipboard",
        price_type: "quote",
        duration_min: 60,
        booking_mode: "quote",
      },
    ],
    addons: [],
  },
];

export function templateFor(id: string): TradeTemplate {
  return TRADE_TEMPLATES.find((t) => t.id === id) ?? TRADE_TEMPLATES[TRADE_TEMPLATES.length - 1];
}

/** Mon–Fri 7:30am–4:30pm, Sat 8am–12pm. */
export const DEFAULT_HOURS = [
  ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, start_minute: 7 * 60 + 30, end_minute: 16 * 60 + 30 })),
  { weekday: 6, start_minute: 8 * 60, end_minute: 12 * 60 },
];
