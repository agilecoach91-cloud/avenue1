import { useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/Icon";
import { authStore } from "../auth";
import { getVersion, subscribeDb, tables } from "../db";
import { openView, setCurrentBusiness, useDemoState, viewOf, type View } from "../state";
import { drawer, outboxCount } from "./Messages";

const TABS: { id: View; label: string; short: string }[] = [
  { id: "website", label: "Website", short: "Website" },
  { id: "booking", label: "Booking page", short: "Booking" },
  { id: "dashboard", label: "Owner portal", short: "Portal" },
];

export function DemoBar({ path, onReset }: { path: string; onReset: () => void }) {
  useSyncExternalStore(subscribeDb, getVersion, getVersion);
  const { currentId } = useDemoState();
  const auth = useSyncExternalStore(authStore.subscribe, authStore.get, authStore.get);
  const d = useSyncExternalStore(drawer.subscribe, drawer.get, drawer.get);
  const [confirming, setConfirming] = useState(false);
  const view = viewOf(path);
  const unseen = Math.max(0, outboxCount() - d.seen);
  const businesses = tables.businesses;
  void auth;

  return (
    <header className="demo-bar">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
          <span className="type-display text-[1.05rem]">Bookd</span>
          <span className="rounded bg-amber px-1.5 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-ink">Demo</span>
          {businesses.length > 1 && (
            <label className="ml-1 min-w-0 flex-1 md:flex-none">
              <span className="sr-only">Business</span>
              <select
                className="demo-select w-full truncate"
                value={currentId ?? (businesses[0]?.id as string)}
                onChange={(e) => {
                  setCurrentBusiness(e.target.value);
                  void openView(view === "website" ? "booking" : view);
                }}
              >
                {businesses.map((b) => (
                  <option key={b.id as string} value={b.id as string}>
                    {b.name as string}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <nav aria-label="Demo views" className="order-last grid w-full grid-cols-3 gap-1 rounded-[10px] bg-white/10 p-1 md:order-none md:ml-auto md:w-auto">
          {TABS.map((t) => (
            <button key={t.id} type="button" aria-pressed={view === t.id} className="demo-tab" onClick={() => void openView(t.id)}>
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="demo-btn"
            onClick={() => drawer.set((s) => ({ ...s, open: true }))}
            aria-label={`Texts and emails${unseen ? `, ${unseen} new` : ""}`}
          >
            <Icon name="message" size={17} />
            <span className="hidden sm:inline">Texts &amp; emails</span>
            {unseen > 0 && <span className="demo-badge">{unseen}</span>}
          </button>
          <button
            type="button"
            className="demo-link"
            onClick={() => {
              if (!confirming) {
                setConfirming(true);
                setTimeout(() => setConfirming(false), 3500);
                return;
              }
              setConfirming(false);
              onReset();
            }}
          >
            {confirming ? "Tap again to reset" : "Reset"}
          </button>
        </div>
      </div>
    </header>
  );
}
