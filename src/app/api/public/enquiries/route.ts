import { after } from "next/server";
import { z } from "zod";
import { getPublicBusiness } from "@/lib/data";
import { countryFor, toE164 } from "@/lib/format";
import { notifyEnquiryCreated } from "@/lib/notify";
import { parseSource } from "@/lib/source";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enquiry } from "@/lib/types";

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // photos are resized in the browser first
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

const Fields = z.object({
  slug: z.string().min(3).max(40),
  serviceId: z.string().optional().nullable(),
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().min(8, "Enter your phone number").max(20),
  email: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .pipe(z.email("Check your email address").nullable()),
  address: z.string().trim().max(200).optional().nullable(),
  message: z.string().trim().min(5, "Tell us a little about the job").max(2000),
  source: z.string().max(20).optional().nullable(),
  company: z.string().optional().nullable(), // honeypot
});

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "Check your details and try again." }, { status: 400 });

  const parsed = Fields.safeParse(
    Object.fromEntries(
      ["slug", "serviceId", "name", "phone", "email", "address", "message", "source", "company"].map((k) => [
        k,
        form.get(k),
      ]),
    ),
  );
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Check your details." }, { status: 400 });
  }
  const input = parsed.data;
  if (input.company) return Response.json({ error: "Request rejected." }, { status: 400 });

  const data = await getPublicBusiness(input.slug);
  if (!data) return Response.json({ error: "Business not found." }, { status: 404 });
  const { business, services } = data;
  const service = services.find((s) => s.id === input.serviceId) ?? null;

  const phone = toE164(input.phone, countryFor(business.timezone));
  if (!phone) return Response.json({ error: "Check your phone number." }, { status: 400 });

  const photos = form
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_PHOTOS);
  for (const photo of photos) {
    if (!IMAGE_TYPES[photo.type]) return Response.json({ error: "Photos must be JPG, PNG or HEIC." }, { status: 400 });
    if (photo.size > MAX_PHOTO_BYTES) return Response.json({ error: "One of the photos is too large." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: enquiry, error } = await admin
    .from("enquiries")
    .insert({
      business_id: business.id,
      service_id: service?.id ?? null,
      service_name: service?.name ?? null,
      customer_name: input.name,
      customer_phone: phone,
      customer_email: input.email,
      address: input.address || null,
      message: input.message,
      source: parseSource(input.source),
    })
    .select("*")
    .single<Enquiry>();
  if (error || !enquiry) {
    console.error("Enquiry insert failed", error);
    return Response.json({ error: "We couldn't send your request. Try again or call us." }, { status: 500 });
  }

  const paths: string[] = [];
  for (const [i, photo] of photos.entries()) {
    const path = `${business.id}/${enquiry.id}/${i + 1}.${IMAGE_TYPES[photo.type]}`;
    const { error: uploadError } = await admin.storage
      .from("enquiry-photos")
      .upload(path, photo, { contentType: photo.type, upsert: false });
    if (uploadError) console.error("Photo upload failed", uploadError);
    else paths.push(path);
  }
  if (paths.length) {
    await admin.from("enquiries").update({ photo_paths: paths }).eq("id", enquiry.id);
    enquiry.photo_paths = paths;
  }

  after(() => notifyEnquiryCreated(business, enquiry));
  return Response.json({ ok: true }, { status: 201 });
}
