-- Avenue-style booking: multiple locations, add-ons, multi-service bookings,
-- "I'm flexible" requests, daily booking limits and a two-way SMS inbox.

-- ---------------------------------------------------------------------------
-- Locations. Every business has at least one; hours, booking notice, daily
-- limits and blocked dates are set per location.
-- ---------------------------------------------------------------------------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  address text,
  phone text,
  -- Minimum notice before a booking, in hours.
  lead_time_hours integer not null default 12 check (lead_time_hours between 0 and 336),
  -- Most bookings per day, keyed by weekday ("0" = Sunday ... "6" = Saturday). Missing = no limit.
  daily_limits jsonb not null default '{}'::jsonb check (jsonb_typeof(daily_limits) = 'object'),
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index locations_business_idx on public.locations (business_id, sort);

insert into public.locations (business_id, name, address, lead_time_hours)
select id, coalesce(nullif(service_area, ''), name), address, lead_time_hours
from public.businesses;

alter table public.businesses drop column lead_time_hours;
alter table public.businesses add column cover_url text;

-- Hours and blocked dates belong to a location.
alter table public.availability
  add column location_id uuid references public.locations (id) on delete cascade;
update public.availability a set location_id = l.id
from public.locations l where l.business_id = a.business_id;
alter table public.availability alter column location_id set not null;
create index availability_location_idx on public.availability (location_id, weekday);

alter table public.time_off
  add column location_id uuid references public.locations (id) on delete cascade;
update public.time_off t set location_id = l.id
from public.locations l where l.business_id = t.business_id;
alter table public.time_off alter column location_id set not null;

-- ---------------------------------------------------------------------------
-- Services get an icon for the booking tiles; add-ons are offered after the
-- customer picks a time ("Do you need anything else?").
-- ---------------------------------------------------------------------------
alter table public.services add column icon text;

create table public.addons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  -- Shown after the price, e.g. "a day" or "per unit".
  price_note text,
  icon text,
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index addons_business_idx on public.addons (business_id, sort);

-- ---------------------------------------------------------------------------
-- Bookings and quote requests: location, several services, add-ons, and
-- whether the customer is flexible on the time.
--   items:  [{ "service_id", "name", "price_type", "price_cents", "duration_min" }]
--   addons: [{ "addon_id", "name", "price_cents", "price_note" }]
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column location_id uuid references public.locations (id) on delete set null,
  add column items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  add column addons jsonb not null default '[]'::jsonb check (jsonb_typeof(addons) = 'array'),
  add column flexible boolean not null default false;
update public.bookings b set location_id = l.id
from public.locations l where l.business_id = b.business_id;
create index bookings_location_start_idx on public.bookings (location_id, starts_at);

-- One job at a time per location (each location has its own crew).
alter table public.bookings drop constraint bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap exclude using gist (
  location_id with =,
  tstzrange(starts_at, ends_at) with &&
) where (status in ('pending', 'confirmed') and location_id is not null);

alter table public.enquiries
  add column location_id uuid references public.locations (id) on delete set null,
  add column items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  add column addons jsonb not null default '[]'::jsonb check (jsonb_typeof(addons) = 'array');
update public.enquiries e set location_id = l.id
from public.locations l where l.business_id = e.business_id;

-- ---------------------------------------------------------------------------
-- Two-way SMS inbox: one conversation per customer phone per business.
-- Automated texts (confirmations, reminders, review requests) are added to the
-- thread too, so the owner sees the whole history.
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  customer_phone text not null,
  customer_name text,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  unread_count integer not null default 0 check (unread_count >= 0),
  created_at timestamptz not null default now(),
  unique (business_id, customer_phone)
);
create index conversations_business_idx on public.conversations (business_id, last_message_at desc);
create index conversations_phone_idx on public.conversations (customer_phone, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  body text not null,
  -- Automated message kind (e.g. reminder_24h); null for messages typed by a person.
  kind text,
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped', 'received')),
  error text,
  provider_id text,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Row level security for the new tables.
-- ---------------------------------------------------------------------------
alter table public.locations enable row level security;
alter table public.addons enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "owners manage locations" on public.locations
  for all to authenticated
  using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

create policy "owners manage add-ons" on public.addons
  for all to authenticated
  using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

create policy "owners manage conversations" on public.conversations
  for all to authenticated
  using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

create policy "owners manage messages" on public.messages
  for all to authenticated
  using (public.owns_business(business_id))
  with check (public.owns_business(business_id));
