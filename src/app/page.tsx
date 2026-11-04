import Link from "next/link";
import { APP_NAME } from "@/lib/env";

const SAMPLE = [
  { name: "General pest treatment", price: "From $199", note: "About 1 hr 30 min" },
  { name: "Termite inspection", price: "$299", note: "About 2 hr" },
  { name: "Rodent control", price: "From $220", note: "About 1 hr" },
  { name: "Termite treatment", price: "Quote", note: "Send photos for a quote" },
];

export default function Home() {
  return (
    <main>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <span className="type-display text-xl">{APP_NAME}</span>
        <Link href="/login" className="btn btn-ghost btn-sm">
          Sign in
        </Link>
      </header>

      <section className="mx-auto grid max-w-5xl gap-10 px-4 pb-16 pt-6 md:grid-cols-[1.1fr_1fr] md:items-center md:pt-12">
        <div>
          <h1 className="type-display text-[2.6rem] sm:text-[3.6rem]">
            Get booked while you&apos;re on the tools.
          </h1>
          <p className="mt-5 max-w-[46ch] text-lg text-steel">
            One booking page for your Google listing, Instagram bio and website. Customers see your prices, pick a
            time and get a text confirmation. You get the job and a Google review afterwards.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login?next=/onboarding" className="btn btn-primary">
              Make my booking page
            </Link>
          </div>
          <p className="hint mt-3">Free to start. Takes about two minutes. No lock-in.</p>
        </div>

        <figure aria-label="Example booking page" className="panel overflow-hidden">
          <div className="border-b border-line p-5">
            <p className="type-display text-2xl leading-none">Harbour Pest Co.</p>
            <p className="mt-2 text-sm text-steel">★ 4.9 on Google from 212 reviews</p>
          </div>
          <ul className="divide-y divide-line">
            {SAMPLE.map((s) => (
              <li key={s.name} className="grid grid-cols-[1fr_auto] gap-x-4 px-5 py-3.5">
                <span className="type-heading">{s.name}</span>
                <span className="type-display text-right">{s.price}</span>
                <span className="text-sm text-steel">{s.note}</span>
              </li>
            ))}
          </ul>
        </figure>
      </section>

      <section className="border-t border-line bg-paper">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 md:grid-cols-3">
          <div>
            <h2 className="type-heading text-lg">Bookings from Google</h2>
            <p className="mt-2 text-steel">Your link sits on your Google listing in Search and Maps, where most jobs start.</p>
          </div>
          <div>
            <h2 className="type-heading text-lg">Fewer no-shows</h2>
            <p className="mt-2 text-steel">Customers get a text confirmation, a reminder the day before and one an hour out.</p>
          </div>
          <div>
            <h2 className="type-heading text-lg">More five-star reviews</h2>
            <p className="mt-2 text-steel">Mark a job done and the customer gets a link to review you on Google.</p>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-sm text-steel">
        {APP_NAME}. Built in Australia for home-service trades.
      </footer>
    </main>
  );
}
