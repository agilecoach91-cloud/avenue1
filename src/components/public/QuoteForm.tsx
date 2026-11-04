"use client";

import { useState } from "react";

const MAX_PHOTOS = 5;

/** Shrinks a photo to at most 1600px on the long side as JPEG (keeps uploads small). */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/heic" || file.type === "image/heif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function QuoteForm(props: {
  slug: string;
  source: string;
  services: { id: string; name: string }[];
  selectedServiceId: string | null;
}) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function addPhotos(list: FileList | null) {
    if (!list) return;
    const chosen = Array.from(list).slice(0, MAX_PHOTOS - photos.length);
    const resized = await Promise.all(chosen.map(shrink));
    setPhotos((p) => [...p, ...resized].slice(0, MAX_PHOTOS));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    form.delete("photo-picker");
    photos.forEach((p) => form.append("photos", p));
    form.set("slug", props.slug);
    form.set("source", props.source);
    const res = await fetch("/api/public/enquiries", { method: "POST", body: form });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setSending(false);
    if (!res.ok) {
      setError(json.error ?? "That didn't go through. Try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="panel p-6" role="status">
        <h2 className="type-heading text-xl">Request sent</h2>
        <p className="mt-2">We&apos;ll get back to you with a price, usually within one business day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="panel grid gap-4 p-5">
      {error && <p role="alert" className="rounded-md bg-stop-soft p-3 text-sm text-stop">{error}</p>}
      {props.services.length > 0 && (
        <div>
          <label className="label" htmlFor="serviceId">What do you need?</label>
          <select id="serviceId" name="serviceId" className="field" defaultValue={props.selectedServiceId ?? ""}>
            <option value="">Something else</option>
            {props.services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="label" htmlFor="message">Describe the job</label>
        <textarea id="message" name="message" required className="field" placeholder="What's the problem, how big is the area, any access issues?" />
      </div>
      <div>
        <span className="label">Photos <span className="font-normal text-steel">(up to {MAX_PHOTOS})</span></span>
        {photos.length > 0 && (
          <ul className="mb-2 grid grid-cols-5 gap-2">
            {photos.map((p, i) => (
              <li key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(p)} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-md border border-line object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((all) => all.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink text-xs text-paper"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {photos.length < MAX_PHOTOS && (
          <label className="btn btn-ghost w-full cursor-pointer">
            Add photos
            <input
              name="photo-picker"
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                void addPhotos(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      <div>
        <label className="label" htmlFor="name">Your name</label>
        <input id="name" name="name" required autoComplete="name" className="field" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input id="phone" name="phone" required type="tel" autoComplete="tel" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email <span className="font-normal text-steel">(optional)</span></label>
          <input id="email" name="email" type="email" autoComplete="email" className="field" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="address">Suburb or address <span className="font-normal text-steel">(optional)</span></label>
        <input id="address" name="address" autoComplete="street-address" className="field" />
      </div>
      <div aria-hidden className="absolute -left-[9999px]">
        <label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <button className="btn btn-brand" disabled={sending}>{sending ? "Sending…" : "Send quote request"}</button>
    </form>
  );
}
