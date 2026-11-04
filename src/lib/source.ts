const SOURCES = ["google", "instagram", "facebook", "tiktok", "website", "widget", "qr", "sms", "email"] as const;
export type Source = (typeof SOURCES)[number] | "direct";

/** Normalises the ?src= value carried through the booking flow. */
export function parseSource(raw: unknown): Source {
  const v = typeof raw === "string" ? raw.toLowerCase() : "";
  return (SOURCES as readonly string[]).includes(v) ? (v as Source) : "direct";
}

export const SOURCE_LABELS: Record<Source, string> = {
  google: "Google",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  website: "Website",
  widget: "Website button",
  qr: "QR code",
  sms: "SMS",
  email: "Email",
  direct: "Direct link",
};
