// Demo stand-in for the Google Places lookup at signup.
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

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  await new Promise((r) => setTimeout(r, 450));
  const name = query
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  if (name.length < 3) return [];
  return [
    {
      placeId: "demo-place",
      name,
      address: "Example result: the live app searches Google",
      phone: null,
      website: null,
      rating: 4.8,
      reviewCount: 57,
      mapsUrl: null,
      reviewUrl: "https://search.google.com/local/writereview?placeid=demo-place",
    },
  ];
}
