// Links that would leave the demo (phone calls, texts, other sites, downloads)
// get a short explanation instead; links to the app's own pages stay inside.
import { formatPhone } from "@/lib/format";
import { APP_ORIGIN, navigate, toPath } from "./router-core";
import { currentBusiness, signInAsOwnerOf } from "./state";
import { toast } from "./toasts";

function describe(host: string, href: string): string {
  if (href.includes("writereview")) return "In the live app this opens the business's Google review form.";
  if (host.includes("instagram")) return "In the live app this opens the business's Instagram.";
  if (host.includes("facebook")) return "In the live app this opens the business's Facebook page.";
  if (host.includes("google")) return "In the live app this opens Google Maps.";
  return `In the live app this opens ${host}.`;
}

export function installLinkInterception() {
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented) return;
    const a = (e.target as Element | null)?.closest?.("a");
    if (!a) return;
    const href = a.getAttribute("href") ?? "";
    if (a.hasAttribute("download")) {
      e.preventDefault();
      toast("In the live app this downloads the file.");
      return;
    }
    if (href.startsWith(APP_ORIGIN) || (href.startsWith("/") && !href.startsWith("//"))) {
      e.preventDefault();
      const path = toPath(href);
      if (path.startsWith("/api/")) {
        toast(path.endsWith("/ics") ? "On a phone this adds the job to the customer's calendar." : "In the live app this downloads a file.");
        return;
      }
      if (path.startsWith("/dashboard")) signInAsOwnerOf(currentBusiness());
      void navigate(path);
      return;
    }
    if (href.startsWith("#")) {
      e.preventDefault();
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const scheme = /^(tel|sms|mailto):(.*)$/.exec(href);
    if (scheme) {
      e.preventDefault();
      const value = decodeURIComponent(scheme[2]);
      toast(
        scheme[1] === "tel"
          ? `On a phone this calls ${formatPhone(value)}.`
          : scheme[1] === "sms"
            ? `On a phone this starts a text to ${formatPhone(value)}.`
            : `This opens an email to ${value}.`,
      );
      return;
    }
    if (/^https?:\/\//.test(href)) {
      e.preventDefault();
      toast(describe(new URL(href).host, href));
    }
  });
}
