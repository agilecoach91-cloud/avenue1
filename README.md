# Bookd: booking software for home-service trades

A Book online button for a business's Google listing, Instagram bio and website. Customers pick services from
picture tiles, request a time, add extras and get text confirmations and reminders. The owner gets the job, a
two-way text inbox, analytics and an automatic Google review request after each job.

The product name "Bookd" is a placeholder; change `NEXT_PUBLIC_APP_NAME`.

## What's in it

**Booking journey** (`/{slug}/book`, also opened as a pop-up by the website widget)

1. Location, when the business has more than one
2. Services as picture tiles; customers can pick more than one
3. Day and time, with an "I'm flexible" switch
4. Add-ons ("Do you need anything else?"), added to the visit and the total price
5. Job questions and contact details; quote-only jobs collect a description and up to 5 photos instead of a time

The left panel carries the business's brand colour, tagline, Google rating, licence and an optional photo. Other
customer pages:

- Bio page at `/{slug}`: logo, rating, price list, call and text buttons, locations, Book online
- Booking page at `/b/{token}`: details, add to calendar, cancel
- Website widget (`public/embed.js`): floating "Book online" button and prompt that open the wizard in a pop-up
- Traffic source tracking via `?src=google|instagram|facebook|website|widget|qr`

**Owner portal** (`/dashboard`)

- Today: visits, bookings, after-hours bookings, review requests, unread texts, next 7 days
- Bookings: one table of bookings and quote requests, with tabs (upcoming, today, to confirm, quotes, past,
  cancelled), search and a location filter; detail pages with actions and the texts and emails sent
- Inbox: two-way texting, one thread per customer, including automatic confirmations and reminders
- Analytics: bookings over time, where bookings come from, by service, add-ons chosen, by location
- Calendar: for each location, working hours, booking notice, daily booking limits and blocked dates
- Services and add-ons, with tile icons, prices, durations and custom questions
- Share: Google booking link (one per location), Instagram and Facebook links, website widget code, QR code,
  private calendar feed
- Settings: profile, logo, booking-page photo, booking window, start-time interval, auto-confirm, notifications,
  review link

**Messages** (Twilio SMS and Resend email)

- Customer: confirmation or request received, confirmed, cancelled, reminders 24 hours and 1 hour before, Google
  review request after the job, quote request received
- Owner: new booking, new quote request, customer cancellation, new text from a customer (email)
- Every message is logged in `message_log`, and customer texts also appear in the inbox thread. Without provider
  keys, messages are printed to the server log instead.

**Plans** (set the `plan` column by hand until billing is added)

| Plan | Customer texts and inbox replies | Badge on page |
| --- | --- | --- |
| `free` | No (email only) | Yes |
| `starter` | 200 a month | No |
| `pro` | 600 a month | No |

## Clickable demo

`demo/` builds a single HTML page that runs the real pages, forms, booking rules and message templates in the
browser, with sample data (Harbour Pest Co., two locations) and in-memory stand-ins for Supabase, Twilio and
Resend. Nothing is sent or stored. A bar across the top switches between the website, the booking page and the
owner portal, and a "Texts & emails" panel shows every message the app sends, with replies as the customer.

```
npm install            # the app's dependencies, once
cd demo && npm install && npm run build
open dist/test.html    # or publish dist/bookd-demo.html
```

Rebuild it after changing the app so the demo stays in step.

## Stack

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres, Auth, Storage), Twilio,
Resend, Zod, date-fns-tz.

## Run it locally

1. **Install:** `npm install`
2. **Create a Supabase project** at supabase.com (Sydney region recommended).
3. **Apply the schema:** run both files in `supabase/migrations`, in order, in the SQL editor, or use the CLI:
   `npx supabase link --project-ref YOUR_REF` then `npx supabase db push`.
4. **Auth settings** (Authentication → URL configuration): set Site URL to your app URL and add
   `http://localhost:3000/auth/callback` and `https://YOUR-DOMAIN/auth/callback` to Redirect URLs.
5. **Environment:** `cp .env.example .env.local` and fill in the Supabase URL, publishable key and secret key. SMS,
   email and Google keys are optional for development.
6. **Start:** `npm run dev`, open http://localhost:3000, sign in and create a page.

Tests: `npm test` (slot engine, daily limits, time zones, daylight saving, Twilio signatures).

## Deploy (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Add every variable from `.env.example`, with `NEXT_PUBLIC_APP_URL` set to your domain.
3. Reminders and review requests run from `/api/cron/reminders`, which needs calling every 10–15 minutes with
   `Authorization: Bearer $CRON_SECRET`. `vercel.json` schedules it every 15 minutes, which needs a Vercel Pro plan.
   On the Hobby plan, use a free scheduler such as cron-job.org, or Supabase `pg_cron` with `pg_net`, to call the URL
   with that header.

## Providers

- **Twilio (texts and the inbox):** buy an Australian mobile number. Two-way texting needs a real number; an
  alphanumeric sender ID can't receive replies. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM`.
  Then, on the number's settings in the Twilio console, set **A message comes in** to
  `https://YOUR-DOMAIN/api/sms/inbound` (HTTP POST). The route checks Twilio's signature with your auth token, so
  `NEXT_PUBLIC_APP_URL` must match the domain exactly. With one shared number, a reply goes to the business that
  most recently texted that customer. Australia's SMS sender rules are tightening, so check Twilio's current
  Australian guidelines before launch.
- **Resend:** verify a sending domain and set `RESEND_API_KEY` and `EMAIL_FROM`.
- **Google Places (optional):** enable "Places API (New)" in Google Cloud and set `GOOGLE_PLACES_API_KEY`.
  Restrict the key to that API.

## How it fits together

```
src/
  app/
    page.tsx                marketing site
    [slug]/                 bio page; book/ is the booking wizard (old book/[id] and quote links redirect)
    b/[token]/              customer's booking page (view, cancel)
    api/public/             slots, bookings, enquiries, page tracking, booking .ics
    api/sms/inbound/        Twilio webhook for customer replies
    api/cron/reminders/     reminders and review requests
    api/ics/[token]/        owner's private calendar feed
    dashboard/              portal screens and server actions (actions.ts)
    onboarding/, login/, auth/callback/
  components/
    public/BookingWizard.tsx  the booking steps
    dashboard/                tables, inbox list, charts, forms
    Icon.tsx                  tile and interface icons
  lib/
    slots.ts                availability engine (time zone, DST and daily-limit aware), with tests
    pricing.ts              totals for several services plus add-ons
    inbox.ts                conversation threads; notify/ sends and logs every message
    data.ts                 data loading; templates.ts trade starter menus and add-ons
  proxy.ts                  session refresh and dashboard sign-in redirect
supabase/migrations/        schema, row level security, storage buckets
public/embed.js             website widget
```

**Security model.** Owners use their own session, and row level security limits them to their own business.
Public pages and APIs run on the server with the secret key and validate every input. A database trigger stops
owners changing their own plan or calendar token. A Postgres exclusion constraint makes double bookings at the same
location impossible, even when two customers book the same time at once. The inbound text webhook only accepts
requests signed by Twilio.

## Not built yet

- Stripe billing and plan upgrades; deposits at booking
- AI phone answering for missed and after-hours calls, and call logs
- A texting number per business (replies currently route by the last business to text the customer)
- Push bookings into ServiceM8, Tradify and Fergus
- Repeat-service reminders (the `repeat_months` field is stored already)
- Several jobs at once at one location (each location takes one job at a time)
- Reserve with Google partner integration (needs Google approval)
- Changing the page address after signup; generated database types
