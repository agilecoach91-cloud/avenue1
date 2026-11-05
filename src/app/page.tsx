import Link from "next/link";
import { Icon } from "@/components/Icon";
import { APP_NAME } from "@/lib/env";

// Set NEXT_PUBLIC_DEMO_SLUG to a sample business to show "Try a sample booking".
const DEMO_SLUG = process.env.NEXT_PUBLIC_DEMO_SLUG || "";

const TILES = [
  { icon: "bug", name: "General pest treatment", price: "From $199" },
  { icon: "termite", name: "Termite inspection", price: "$299" },
  { icon: "rodent", name: "Rodent control", price: "From $220" },
  { icon: "shield", name: "Termite treatment", price: "Quote" },
];

const FEATURES = [
  {
    icon: "calendar",
    title: "Book online from Google",
    body: "A Book online button on your Google listing in Search and Maps, plus your Instagram bio and website. Customers pick a service and a time in under a minute.",
  },
  {
    icon: "message",
    title: "Two-way texting",
    body: "Confirmations and reminders go out by text, and customers can text back. Replies land in one inbox, next to the booking.",
  },
  {
    icon: "sparkle",
    title: "Reviews on autopilot",
    body: "Mark a job done and the customer gets a link to review you on Google. More five-star reviews, more bookings from Google.",
  },
];

const EVERYTHING = [
  { icon: "tag", title: "Add-ons at checkout", body: "Offer extras after the customer picks a time: a second unit, a downpipe flush, a written report." },
  { icon: "clipboard", title: "Quote requests with photos", body: "Jobs you can't price up front collect a description and up to five photos." },
  { icon: "pin", title: "Multiple locations", body: "Each depot or crew gets its own hours, calendar and Google booking link." },
  { icon: "clock", title: "Notice and daily limits", body: "Set how much notice you need and how many jobs you'll take each day." },
  { icon: "chart", title: "Analytics", body: "See bookings over time, which links bring them in, and which add-ons sell." },
  { icon: "phone", title: "Works on your phone", body: "Confirm, reschedule and reply from the van. Bookings sync to your phone's calendar." },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    note: "To try it out",
    features: ["Booking page and Google link", "Email confirmations", "Quote requests with photos", "“Powered by” badge on your page"],
  },
  {
    name: "Starter",
    price: "$49",
    note: "per month",
    features: ["Everything in Free", "200 texts a month", "Text reminders and two-way inbox", "Google review requests by text", "No badge"],
    featured: true,
  },
  {
    name: "Pro",
    price: "$99",
    note: "per month",
    features: ["Everything in Starter", "600 texts a month", "Best for busy teams and several locations"],
  },
];

const FAQ = [
  {
    q: "Do I need a website?",
    a: "No. Your booking page works on its own as the link on your Google listing and Instagram bio. If you do have a website, one line of code adds a Book online button to it.",
  },
  {
    q: "How does the Google Book online button work?",
    a: "In your Google Business Profile you add your booking link under Bookings. Google then shows a Book online button on your listing in Search and Maps. We show you the steps; it takes about two minutes.",
  },
  {
    q: "Can customers text me back?",
    a: "Yes. On Starter and Pro, customers can reply to any text and it lands in your inbox, next to their booking. You reply from the app.",
  },
  {
    q: "What if I'm flat out and can't take more jobs?",
    a: "Set a daily limit for each day of the week and block out holidays. Customers only see times you can actually do.",
  },
  {
    q: "Is there a lock-in contract?",
    a: "No. Pay month to month and cancel any time.",
  },
];

export default function Home() {
  return (
    <main className="bg-paper">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link href="/" className="type-display text-xl">
            {APP_NAME}
          </Link>
          <nav aria-label="Main" className="hidden gap-5 text-sm font-semibold text-steel md:flex">
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link href="/login?next=/onboarding" className="btn btn-primary btn-sm hidden sm:inline-flex">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-surface">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-10 md:grid-cols-[1.05fr_1fr] md:items-center md:pt-16">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-line bg-paper px-3 py-1 text-sm font-semibold text-steel">
              Booking software for home-service trades
            </p>
            <h1 className="type-display text-balance text-[2.6rem] sm:text-[3.6rem]">Get booked while you&apos;re on the tools.</h1>
            <p className="mt-5 max-w-[46ch] text-lg text-steel">
              A Book online button for your Google listing, Instagram bio and website. Customers see your prices, pick a
              time and get a text. You get the job, the reminders and the review.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login?next=/onboarding" className="btn btn-primary">
                Make my booking page
              </Link>
              {DEMO_SLUG && (
                <Link href={`/${DEMO_SLUG}/book?src=website`} className="btn btn-ghost">
                  Try a sample booking
                </Link>
              )}
            </div>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-steel">
              <li className="flex items-center gap-1.5"><Icon name="check" size={16} /> Free to start</li>
              <li className="flex items-center gap-1.5"><Icon name="check" size={16} /> No lock-in contract</li>
              <li className="flex items-center gap-1.5"><Icon name="check" size={16} /> Set up in two minutes</li>
            </ul>
          </div>

          <figure aria-label="Example booking steps" className="panel overflow-hidden shadow-[0_30px_70px_-40px_rgba(20,33,43,0.55)]">
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <span className="type-display grid h-10 w-10 place-items-center rounded-md bg-[#1f6f5c] text-sm text-white">HP</span>
              <div>
                <p className="type-heading leading-tight">Harbour Pest Co.</p>
                <p className="text-sm text-steel">★ 4.9 on Google from 212 reviews</p>
              </div>
            </div>
            <div className="px-5 pb-5 pt-4" style={{ ["--brand" as string]: "#1f6f5c", ["--brand-ink" as string]: "#fff" }}>
              <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface">
                <div className="h-full w-1/4 rounded-full bg-[var(--brand)]" />
              </div>
              <p className="type-heading mb-3 text-center text-lg">Select a service</p>
              <ul className="grid grid-cols-2 gap-2.5">
                {TILES.map((t, i) => (
                  <li key={t.name} className={`tile ${i === 0 ? "is-on" : ""}`} style={{ minHeight: "7rem" }}>
                    <span className="tile-check">{i === 0 && <Icon name="check" size={14} strokeWidth={2.5} />}</span>
                    <span className="tile-icon">
                      <Icon name={t.icon} size={22} />
                    </span>
                    <span className="type-heading text-[0.95rem] leading-snug">{t.name}</span>
                    <span className="text-sm text-steel">{t.price}</span>
                  </li>
                ))}
              </ul>
            </div>
          </figure>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="type-display max-w-[22ch] text-balance text-[2rem] sm:text-[2.4rem]">More jobs in. Less time on the phone.</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <span className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-amber/20 text-ink">
                <Icon name={f.icon} size={24} />
              </span>
              <h3 className="type-heading text-lg">{f.title}</h3>
              <p className="mt-2 text-steel">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="type-display text-[2rem] sm:text-[2.4rem]">How it works</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ["Pick your trade", "We set up your page with a starter price list, add-ons and opening hours. Change anything later."],
              ["Add your link", "Put it on your Google listing, Instagram bio and website. Each one is tracked, so you see what works."],
              ["Get booked", "Customers book a time and get a text. You confirm, do the job, and the review request goes out."],
            ].map(([title, body], i) => (
              <li key={title} className="panel p-6">
                <span className="type-display text-[2.2rem] leading-none text-amber-deep">{i + 1}</span>
                <h3 className="type-heading mt-3 text-lg">{title}</h3>
                <p className="mt-2 text-steel">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="type-display text-[2rem] sm:text-[2.4rem]">Everything in one app</h2>
        <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {EVERYTHING.map((f) => (
            <li key={f.title} className="flex gap-4">
              <Icon name={f.icon} size={24} className="mt-0.5 shrink-0" />
              <div>
                <h3 className="type-heading">{f.title}</h3>
                <p className="mt-1 text-steel">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="pricing" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="type-display text-[2rem] sm:text-[2.4rem]">Pricing</h2>
          <p className="mt-2 text-steel">Prices in AUD, including GST. Month to month.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.name} className={`panel flex flex-col p-6 ${p.featured ? "border-ink shadow-[0_0_0_1px_var(--color-ink)]" : ""}`}>
                <div className="flex items-center justify-between">
                  <h3 className="type-heading text-lg">{p.name}</h3>
                  {p.featured && <span className="rounded-full bg-amber px-2.5 py-0.5 text-xs font-bold">Most popular</span>}
                </div>
                <p className="mt-4">
                  <span className="type-display text-[2.6rem] leading-none">{p.price}</span>{" "}
                  <span className="text-steel">{p.note}</span>
                </p>
                <ul className="mt-5 grid gap-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Icon name="check" size={18} className="mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-7">
                  <Link href="/login?next=/onboarding" className={`btn w-full ${p.featured ? "btn-primary" : "btn-ghost"}`}>
                    Start with {p.name}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="type-display text-[2rem] sm:text-[2.4rem]">Questions</h2>
        <div className="mt-8 divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="type-heading flex cursor-pointer list-none items-center justify-between gap-4">
                {f.q}
                <Icon name="plus" size={20} className="shrink-0 transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-2 max-w-[65ch] text-steel">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-14">
          <h2 className="type-display max-w-[20ch] text-balance text-[2rem]">Your next job could book itself tonight.</h2>
          <Link href="/login?next=/onboarding" className="btn btn-primary">
            Make my booking page
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-4 py-8 text-sm text-steel">
        <span>{APP_NAME}. Built in Australia for home-service trades.</span>
        <Link href="/login" className="hover:text-ink">
          Sign in
        </Link>
      </footer>
    </main>
  );
}
