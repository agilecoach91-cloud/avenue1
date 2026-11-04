import "server-only";

export type PlaceResult = {
  placeId: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  mapsUrl: string | null;
  reviewUrl: string;
};

/**
 * Looks up a business on Google with the Places API (New) Text Search.
 * Used at signup to prefill the page from the owner's Google listing.
 */
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || query.trim().length < 3) return [];

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri",
    },
    body: JSON.stringify({ textQuery: query, regionCode: "AU", maxResultCount: 5 }),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("Places search failed", res.status, await res.text().catch(() => ""));
    return [];
  }
  const json = (await res.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text: string };
      formattedAddress?: string;
      nationalPhoneNumber?: string;
      internationalPhoneNumber?: string;
      websiteUri?: string;
      rating?: number;
      userRatingCount?: number;
      googleMapsUri?: string;
    }>;
  };
  return (json.places ?? []).map((p) => ({
    placeId: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? null,
    phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    mapsUrl: p.googleMapsUri ?? null,
    reviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(p.id)}`,
  }));
}
