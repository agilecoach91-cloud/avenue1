# Bookd: booking pages for home-service trades

A branded booking page that works as a business's Google "Book" link, Instagram bio link and a website button.
Customers see fixed prices, pick a time and get SMS confirmations and reminders. Owners get the job, a calendar
feed and an automatic Google review request after each job.

The product name "Bookd" is a placeholder; change `NEXT_PUBLIC_APP_NAME`.

## What's in the MVP

**Customer side**

- Public page at `/{slug}`: logo, star rating, service area, licence, price list, call and text buttons
- Booking flow: job questions (e.g. property type, storeys), day and time picker, contact details
- Quote requests with up to 5 photos (resized in the browser)
- Booking page at `/b/{token}`: details, add to calendar, cancel
- Floating "Book online" widget for any website (`public/embed.js`)
- Traffic source tracking via `?src=google|instagram|facebook|website|widget|qr`

**Owner dashboard** (`/dashboard`)

- Email magic-link sign-in; two-minute signup with trade templates (pest control, air-con, gutters and windows,
  cleaning, pools, lawn and garden, other)
- Optional Google Places lookup at signup: copies name, phone, rating and the review link
- Today: visits, bookings, after-hours bookings, review requests, next 7 days
- Bookings: confirm, cancel, mark done, no-show
- Quote requests with photos and status
- Services and prices: fixed, from or quote; duration; custom questions
- Working hours, days off, notice period, booking window, auto-confirm
- Share: Google Business Profile steps, Instagram and Facebook links, embed code, QR code, private calendar feed
- Settings: profile, logo, brand colour, notifications, review link

**Messages** (Twilio SMS and Resend email)

- Customer: confirmation or request received, confirmed, cancelled, reminders 24 hours and 1 hour before, Google
  review request after the job
- Owner: new booking, new quote request, customer cancellation
- Every message is logged in `message_log`. Without provider keys, messages are printed to the server log instead.

**Plans** (set the `plan` column by hand until billing is added)

| Plan | Customer SMS | Badge on page |
| --- | --- | --- |
| `free` | No (email only) | Yes |
| `starter` | 200 a month | No |
| `pro` | 600 a month | No |

## Stack

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres, Auth, Storage), Twilio,
Resend, Zod, date-fns-tz.

## Run it locally

1. **Install:** `npm install`
2. **Create a Supabase project** at supabase.com (Sydney region recommended).
3. **Apply the schema:** paste `supabase/migrations/20261104000000_init.sql` into the SQL editor and run it, or use the
   CLI: `npx supabase link --project-ref YOUR_REF` then `npx supabase db push`.
4. **Auth settings** (Authentication → URL configuration): set Site URL to your app URL and add
   `http://localhost:3000/auth/callback` and `https://YOUR-DOMAIN/auth/callback` to Redirect URLs.
5. **Environment:** `cp .env.example .env.local` and fill in the Supabase URL, publishable key and secret key. SMS,
   email and Google keys are optional for development.
6. **Start:** `npm run dev`, open http://localhost:3000, sign in and create a page.

Tests: `npm test` (slot engine, time zones, daylight saving).

## Deploy (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Add every variable from `.env.example`, with `NEXT_PUBLIC_APP_URL` set to your domain.
3. Reminders and review requests run from `/api/cron/reminders`, which needs calling every 10–15 minutes with
   `Authorization: Bearer $CRON_SECRET`. `vercel.json` schedules it every 15 minutes, which needs a Vercel Pro plan.
   On the Hobby plan, use a free scheduler such as cron-job.org, or Supabase `pg_cron` with `pg_net`, to call the URL
   with that header.

## Providers

- **Twilio:** buy an Australian mobile number, or register an alphanumeric sender ID (one-way only). Australia's
  SMS sender ID rules are tightening, so check Twilio's current Australian guidelines before launch. Set
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM`.
- **Resend:** verify a sending domain and set `RESEND_API_KEY` and `EMAIL_FROM`.
- **Google Places (optional):** enable "Places API (New)" in Google Cloud and set `GOOGLE_PLACES_API_KEY`.
  Restrict the key to that API.

## How it fits together

```
src/
  app/
    [slug]/                 public page, booking flow (book/[serviceId]), quote form
    b/[token]/              customer's booking page (view, cancel)
    api/public/             slots, bookings, enquiries, page tracking, booking .ics
    api/cron/reminders/     reminders and review requests
    api/ics/[token]/        owner's private calendar feed
    dashboard/              owner screens and server actions (actions.ts)
    onboarding/, login/, auth/callback/
  lib/
    slots.ts                availability engine (time zone and DST safe), with tests
    notify/                 message templates, plan limits, Twilio and Resend
    data.ts                 data loading; templates.ts  trade starter menus
  proxy.ts                  session refresh and dashboard sign-in redirect
supabase/migrations/        schema, row level security, storage buckets
public/embed.js             website widget
```

**Security model.** Owners use their own session, and row level security limits them to their own business.
Public pages and APIs run on the server with the secret key and validate every input. A database trigger stops
owners changing their own plan or calendar token. A Postgres exclusion constraint makes double bookings impossible,
even when two customers book the same time at once.

## Not built yet (phase 2)

- Stripe billing and plan upgrades; deposits at booking
- Push bookings into ServiceM8, Tradify and Fergus
- Two-way SMS inbox; repeat-service reminders (the `repeat_months` field is stored already)
- Multiple staff or vehicles (the MVP assumes one person, so bookings never overlap)
- Reserve with Google partner integration (needs Google approval)
- Changing the page address after signup; generated database types
