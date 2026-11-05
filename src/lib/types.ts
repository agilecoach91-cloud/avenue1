// Row types matching supabase/migrations. Kept by hand for the MVP; switch to
// `npx supabase gen types typescript` once the schema settles.

export type Plan = "free" | "starter" | "pro";
export type PriceType = "fixed" | "from" | "quote";
export type BookingMode = "instant" | "quote";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type EnquiryStatus = "new" | "contacted" | "quoted" | "won" | "lost";

export type Question = {
  id: string;
  label: string;
  type: "text" | "select" | "number";
  options?: string[];
  required?: boolean;
};

export type Business = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  trade: string;
  tagline: string | null;
  about: string | null;
  phone: string | null;
  email: string | null;
  service_area: string | null;
  address: string | null;
  licence_number: string | null;
  abn: string | null;
  timezone: string;
  brand_color: string;
  logo_url: string | null;
  google_place_id: string | null;
  google_review_url: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  instagram_url: string | null;
  facebook_url: string | null;
  website_url: string | null;
  cover_url: string | null;
  booking_window_days: number;
  slot_interval_min: number;
  auto_confirm: boolean;
  review_delay_hours: number;
  notify_owner_sms: boolean;
  notify_owner_email: boolean;
  plan: Plan;
  published: boolean;
  ics_token: string;
  created_at: string;
};

export type Service = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price_type: PriceType;
  price_cents: number | null;
  duration_min: number;
  booking_mode: BookingMode;
  questions: Question[];
  repeat_months: number | null;
  icon: string | null;
  sort: number;
  active: boolean;
};

/** Extras offered after the customer picks a time ("Do you need anything else?"). */
export type Addon = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  price_note: string | null;
  icon: string | null;
  sort: number;
  active: boolean;
};

export type Location = {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  lead_time_hours: number;
  /** Most bookings per day, keyed by weekday ("0" = Sunday). Missing = no limit. */
  daily_limits: Record<string, number>;
  sort: number;
  active: boolean;
};

export type AvailabilityRule = {
  id?: string;
  business_id?: string;
  location_id?: string;
  weekday: number; // 0 = Sunday
  start_minute: number;
  end_minute: number;
};

export type TimeOff = {
  id: string;
  business_id: string;
  location_id: string;
  starts_at: string;
  ends_at: string;
  note: string | null;
};

/** A service as it was when booked (prices can change later). */
export type BookedItem = {
  service_id: string;
  name: string;
  price_type: PriceType;
  price_cents: number | null;
  duration_min: number;
};

export type BookedAddon = {
  addon_id: string;
  name: string;
  price_cents: number | null;
  price_note: string | null;
};

export type Booking = {
  id: string;
  business_id: string;
  location_id: string | null;
  service_id: string | null;
  service_name: string;
  price_type: PriceType | null;
  price_cents: number | null;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  address: string | null;
  answers: Record<string, string>;
  notes: string | null;
  source: string | null;
  items: BookedItem[];
  addons: BookedAddon[];
  flexible: boolean;
  manage_token: string;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  reminder_24h_at: string | null;
  reminder_1h_at: string | null;
  review_requested_at: string | null;
  created_at: string;
};

export type Enquiry = {
  id: string;
  business_id: string;
  location_id: string | null;
  service_id: string | null;
  service_name: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  address: string | null;
  message: string | null;
  answers: Record<string, string>;
  items: BookedItem[];
  addons: BookedAddon[];
  photo_paths: string[];
  status: EnquiryStatus;
  source: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  business_id: string;
  location_id: string | null;
  customer_phone: string;
  customer_name: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  business_id: string;
  direction: "in" | "out";
  body: string;
  kind: string | null;
  status: "sent" | "failed" | "skipped" | "received";
  error: string | null;
  created_at: string;
};

export const PLAN_FEATURES: Record<Plan, { customerSms: boolean; badge: boolean; smsPerMonth: number }> = {
  free: { customerSms: false, badge: true, smsPerMonth: 0 },
  starter: { customerSms: true, badge: false, smsPerMonth: 200 },
  pro: { customerSms: true, badge: false, smsPerMonth: 600 },
};
