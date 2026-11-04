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
};

export type TradeTemplate = {
  id: string;
  label: string;
  tagline: string;
  services: ServiceTemplate[];
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
        price_type: "from",
        price_cents: 22000,
        duration_min: 60,
        booking_mode: "instant",
        questions: [propertyType],
      },
      {
        name: "Termite treatment",
        description: "Priced after an inspection of the property.",
        price_type: "quote",
        duration_min: 240,
        booking_mode: "quote",
      },
    ],
  },
  {
    id: "air_con",
    label: "Air-con servicing",
    tagline: "Split system cleaning and servicing, booked online.",
    services: [
      {
        name: "Split system clean (1 unit)",
        price_type: "fixed",
        price_cents: 14900,
        duration_min: 60,
        booking_mode: "instant",
        repeat_months: 12,
      },
      {
        name: "Split system clean (2 units)",
        price_type: "fixed",
        price_cents: 26900,
        duration_min: 120,
        booking_mode: "instant",
        repeat_months: 12,
      },
      {
        name: "Ducted system service",
        price_type: "from",
        price_cents: 22900,
        duration_min: 120,
        booking_mode: "instant",
        questions: [storeys],
        repeat_months: 12,
      },
      {
        name: "New installation",
        description: "Supply and install, priced to the room size.",
        price_type: "quote",
        duration_min: 240,
        booking_mode: "quote",
      },
    ],
  },
  {
    id: "gutters_windows",
    label: "Gutter & window cleaning",
    tagline: "Gutters and windows done, booked online.",
    services: [
      {
        name: "Gutter clean",
        price_type: "from",
        price_cents: 22000,
        duration_min: 120,
        booking_mode: "instant",
        questions: [storeys],
        repeat_months: 12,
      },
      {
        name: "Window clean (inside and out)",
        price_type: "from",
        price_cents: 25000,
        duration_min: 180,
        booking_mode: "instant",
        questions: [storeys],
      },
      {
        name: "Roof or solar panel clean",
        price_type: "quote",
        duration_min: 180,
        booking_mode: "quote",
      },
    ],
  },
  {
    id: "cleaning",
    label: "Cleaning",
    tagline: "Home cleaning, booked online.",
    services: [
      {
        name: "Regular clean",
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
        price_type: "from",
        price_cents: 12000,
        duration_min: 90,
        booking_mode: "instant",
      },
    ],
  },
  {
    id: "pool",
    label: "Pool care",
    tagline: "Pool cleaning and servicing, booked online.",
    services: [
      {
        name: "Pool clean and water test",
        price_type: "fixed",
        price_cents: 9900,
        duration_min: 60,
        booking_mode: "instant",
        repeat_months: 1,
      },
      {
        name: "Green pool recovery",
        price_type: "from",
        price_cents: 25000,
        duration_min: 120,
        booking_mode: "instant",
      },
      {
        name: "Equipment repair",
        price_type: "quote",
        duration_min: 120,
        booking_mode: "quote",
      },
    ],
  },
  {
    id: "lawn_garden",
    label: "Lawn & garden",
    tagline: "Mowing and garden care, booked online.",
    services: [
      {
        name: "Lawn mow and edge",
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
        price_type: "from",
        price_cents: 15000,
        duration_min: 180,
        booking_mode: "instant",
      },
      {
        name: "Landscaping",
        price_type: "quote",
        duration_min: 240,
        booking_mode: "quote",
      },
    ],
  },
  {
    id: "general",
    label: "Other home service",
    tagline: "Book online in under a minute.",
    services: [
      {
        name: "Standard service",
        price_type: "from",
        price_cents: 15000,
        duration_min: 60,
        booking_mode: "instant",
      },
      {
        name: "Request a quote",
        price_type: "quote",
        duration_min: 60,
        booking_mode: "quote",
      },
    ],
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
