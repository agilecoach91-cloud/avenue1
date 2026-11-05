import "./shims/globals";
import { createRoot } from "react-dom/client";
import { installApi, runCron, scheduleCron } from "./demo/api";
import { clearSignInEmails, onSignInLink, signInAsId, signInWithEmail, signOutDemo } from "./demo/auth";
import { subscribeDb, tables } from "./demo/db";
import { installLinkInterception } from "./demo/intercept";
import { onOutbox } from "./demo/outbox";
import { resolveRoute } from "./demo/routes";
import { bootstrap, getRoute, navigate, onPathChange, setResolver } from "./demo/router-core";
import { SAMPLE_OWNER_ID, SAMPLE_SLUG, seed } from "./demo/seed";
import { openView, setCurrentBusiness, viewOf } from "./demo/state";
import { dismiss, toast } from "./demo/toasts";
import { App } from "./demo/ui/App";
import { drawer, outboxCount, sessionStart } from "./demo/ui/Messages";

const { businessId } = seed();
setCurrentBusiness(businessId);
installApi();
installLinkInterception();
setResolver(resolveRoute);
onOutbox(() => scheduleCron());

// Magic-link emails open straight from a notice, so sign-up can be tried end to end.
onSignInLink((item) => {
  toast(`We emailed a sign-in link to ${item.email}. In the demo you can open it right here.`, {
    sticky: true,
    action: {
      label: "Open the link",
      run: () => {
        signInWithEmail(item.email);
        void navigate(item.next);
      },
    },
  });
});

// A short notice whenever the app sends texts or emails.
const bootAt = Date.now();
let lastSeen = 0;
let pending: ReturnType<typeof setTimeout> | undefined;
let outboxToast = 0;
subscribeDb(() => {
  const fresh = tables.message_log.filter((m) => (m.created_at as string) >= sessionStart);
  if (fresh.length < lastSeen) lastSeen = 0;
  if (fresh.length === lastSeen) return;
  clearTimeout(pending);
  pending = setTimeout(() => {
    const now = tables.message_log.filter((m) => (m.created_at as string) >= sessionStart);
    const added = now.slice(lastSeen);
    lastSeen = now.length;
    if (!added.length || drawer.get().open || Date.now() - bootAt < 2500) return;
    const sent = added.filter((m) => m.status === "sent");
    const texts = sent.filter((m) => m.channel === "sms").length;
    const emails = sent.filter((m) => m.channel === "email").length;
    const skipped = added.length - sent.length;
    const parts = [texts ? `${texts} text${texts === 1 ? "" : "s"}` : "", emails ? `${emails} email${emails === 1 ? "" : "s"}` : ""].filter(Boolean);
    const message = parts.length
      ? `The app sent ${parts.join(" and ")}${skipped ? `. ${skipped} text${skipped === 1 ? " wasn't" : "s weren't"} sent on the Free plan` : ""}.`
      : `${skipped} text${skipped === 1 ? " wasn't" : "s weren't"} sent: texting customers isn't on the Free plan.`;
    if (outboxToast) dismiss(outboxToast);
    outboxToast = toast(message, { action: { label: "View", run: () => drawer.set((d) => ({ ...d, open: true })) } });
  }, 700);
});

// Keep the address bar on the view being shown (#website, #booking, #dashboard).
onPathChange((path) => {
  try {
    history.replaceState(null, "", `#${viewOf(path)}`);
  } catch {
    // Some embedded viewers don't allow it; the demo works without it.
  }
});

// Links like …#booking switch views without reloading.
window.addEventListener("hashchange", () => {
  const view = location.hash.replace("#", "");
  if ((view === "website" || view === "booking" || view === "dashboard") && viewOf(getRoute().path) !== view) {
    void openView(view);
  }
});

function startPath(): string {
  const hash = location.hash.replace("#", "");
  if (hash === "dashboard") {
    signInAsId(SAMPLE_OWNER_ID);
    return "/dashboard";
  }
  if (hash === "booking") return `/${SAMPLE_SLUG}?src=google`;
  return "/";
}

function reset() {
  const view = viewOf(getRoute().path);
  const { businessId: id } = seed();
  clearSignInEmails();
  signOutDemo();
  setCurrentBusiness(id);
  void runCron().then(() => {
    lastSeen = tables.message_log.filter((m) => (m.created_at as string) >= sessionStart).length;
    drawer.set({ open: false, seen: outboxCount() });
  });
  void openView(view);
  toast("Demo reset to the sample data.");
}

// Run the reminder job once before showing anything, and count what it sent as
// already seen, so visitors aren't greeted by notices they didn't cause.
void runCron()
  .then(() => bootstrap(startPath()))
  .then((initial) => {
    lastSeen = tables.message_log.filter((m) => (m.created_at as string) >= sessionStart).length;
    drawer.set((d) => ({ ...d, seen: outboxCount() }));
    createRoot(document.getElementById("app")!).render(<App initial={initial} onReset={reset} />);
  });
