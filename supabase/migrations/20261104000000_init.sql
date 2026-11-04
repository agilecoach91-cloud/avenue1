-- Initial schema for the tradie booking page app.
-- Run with `npx supabase db push` (linked project) or paste into the SQL editor.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Businesses: one per owner in the MVP.
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  slug text not null unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  name text not null check (char_length(name) between 2 and 80),
  trade text not null default 'general',
  tagline text,
  about text,
  phone text,
  email text,
  service_area text,
  address text,
  licence_number text,
  abn text,
  timezone text not null default 'Australia/Sydney',
  brand_color text not null default '#F2A900'
    check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_url text,
  google_place_id text,
  google_review_url text,
  google_rating numeric(2, 1),
  google_review_count integer,
  instagram_url text,
  facebook_url text,
  website_url text,
  -- Booking rules
  lead_time_hours integer not null default 12 check (lead_time_hours between 0 and 336),
  booking_window_days integer not null default 28 check (booking_window_days between 1 and 180),
  slot_interval_min integer not null default 30 check (slot_interval_min in (15, 30, 60, 120)),
  auto_confirm boolean not null default true,
  review_delay_hours integer not null default 2 check (review_delay_hours between 0 and 168),
  -- Notifications to the owner
  notify_owner_sms boolean not null default true,
  notify_owner_email boolean not null default true,
  -- Billing (set manually until Stripe billing is added)
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro')),
  published boolean not null default true,
  ics_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Services shown on the booking page.
-- ---------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text,
  price_type text not null default 'fixed' check (price_type in ('fixed', 'from', 'quote')),
  price_cents integer check (price_cents is null or price_cents >= 0),
  duration_min integer not null default 60 check (duration_min between 15 and 600),
  -- 'instant' = customer picks a time; 'quote' = customer sends a quote request
  booking_mode text not null default 'instant' check (booking_mode in ('instant', 'quote')),
  -- [{ "id": "storeys", "label": "How many storeys?", "type": "select", "options": ["1","2"], "required": true }]
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  -- Months until a repeat-service reminder (phase 2); null = none
  repeat_months integer check (repeat_months is null or repeat_months between 1 and 36),
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index services_business_idx on public.services (business_id, sort);

-- ---------------------------------------------------------------------------
-- Weekly working hours, in the business's local time.
-- weekday: 0 = Sunday ... 6 = Saturday. Minutes are from local midnight.
-- ---------------------------------------------------------------------------
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_minute integer not null check (start_minute between 0 and 1439),
  end_minute integer not null check (end_minute between 1 and 1440),
  check (end_minute > start_minute)
);
create index availability_business_idx on public.availability (business_id, weekday);

create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text,
  check (ends_at > starts_at)
);
create index time_off_business_idx on public.time_off (business_id, starts_at);

-- ---------------------------------------------------------------------------
-- Bookings.
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  service_name text not null,
  price_type text,
  price_cents integer,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  address text,
  answers jsonb not null default '{}'::jsonb,
  notes text,
  source text,
  manage_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  reminder_24h_at timestamptz,
  reminder_1h_at timestamptz,
  review_requested_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- One person per business in the MVP: no two active bookings may overlap.
  constraint bookings_no_overlap exclude using gist (
    business_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending', 'confirmed'))
);
create index bookings_business_start_idx on public.bookings (business_id, starts_at);
create index bookings_status_start_idx on public.bookings (status, starts_at);

-- ---------------------------------------------------------------------------
-- Quote requests / enquiries.
-- ---------------------------------------------------------------------------
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  service_name text,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  address text,
  message text,
  answers jsonb not null default '{}'::jsonb,
  photo_paths text[] not null default '{}',
  status text not null default 'new'
    check (status in ('new', 'contacted', 'quoted', 'won', 'lost')),
  source text,
  created_at timestamptz not null default now()
);
create index enquiries_business_idx on public.enquiries (business_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Outbound message log (SMS + email) and page analytics.
-- ---------------------------------------------------------------------------
create table public.message_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  enquiry_id uuid references public.enquiries (id) on delete set null,
  kind text not null,
  channel text not null check (channel in ('sms', 'email')),
  recipient text not null,
  body text not null,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);
create index message_log_business_idx on public.message_log (business_id, created_at desc);

create table public.page_events (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null check (kind in ('view', 'start_booking', 'start_quote')),
  source text,
  created_at timestamptz not null default now()
);
create index page_events_business_idx on public.page_events (business_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_updated_at before update on public.businesses
for each row execute function public.set_updated_at();

-- Signed-in owners can edit their profile but not their plan, calendar token or
-- ownership. Those change only through the secret key (server code, billing).
create or replace function public.protect_business_fields() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'authenticated' then
    if tg_op = 'INSERT' then
      new.plan = 'free';
      new.owner_id = auth.uid();
    else
      new.plan = old.plan;
      new.owner_id = old.owner_id;
      new.ics_token = old.ics_token;
    end if;
  end if;
  return new;
end;
$$;

create trigger businesses_protect before insert or update on public.businesses
for each row execute function public.protect_business_fields();

-- ---------------------------------------------------------------------------
-- Row level security.
-- Public booking pages are served by the server with the secret key, so
-- anonymous visitors get no direct table access at all.
-- ---------------------------------------------------------------------------
create or replace function public.owns_business(bid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses where id = bid and owner_id = auth.uid());
$$;

alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.availability enable row level security;
alter table public.time_off enable row level security;
alter table public.bookings enable row level security;
alter table public.enquiries enable row level security;
alter table public.message_log enable row level security;
alter table public.page_events enable row level security;

create policy "owners manage their business" on public.businesses
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners manage services" on public.services
  for all to authenticated
  using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

create policy "owners manage availability" on public.availability
  for all to authenticated
  using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

create policy "owners manage time off" on public.time_off
  for all to authenticated
  using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

create policy "owners manage bookings" on public.bookings
  for all to authenticated
  using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

create policy "owners manage enquiries" on public.enquiries
  for all to authenticated
  using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

create policy "owners read message log" on public.message_log
  for select to authenticated
  using (public.owns_business(business_id));

create policy "owners read page events" on public.page_events
  for select to authenticated
  using (public.owns_business(business_id));

-- ---------------------------------------------------------------------------
-- Storage: public logos, private quote-request photos.
-- Uploads go through the server, so no storage policies are needed.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('enquiry-photos', 'enquiry-photos', false, 8388608, array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;
