// Business pages live at the root (example.com/acme-pest), so app routes are reserved.
export const RESERVED_SLUGS = new Set([
  "api", "auth", "login", "logout", "signup", "dashboard", "onboarding", "embed", "embed-js",
  "b", "booking", "bookings", "admin", "settings", "help", "support", "pricing", "about",
  "terms", "privacy", "contact", "blog", "app", "www", "static", "public", "assets", "_next",
  "favicon", "robots", "sitemap", "manifest", "ics", "cron",
]);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug) && !RESERVED_SLUGS.has(slug);
}
