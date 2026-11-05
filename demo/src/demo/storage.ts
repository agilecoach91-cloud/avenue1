// File storage for logos, booking-page photos and quote photos: kept in memory
// and shown through object URLs.
const blobs = new Map<string, Blob>();
const urls = new Map<string, string>();

function urlFor(bucket: string, path: string): string {
  const key = `${bucket}/${path}`;
  let url = urls.get(key);
  if (!url) {
    const blob = blobs.get(key);
    if (!blob) return "";
    url = URL.createObjectURL(blob);
    urls.set(key, url);
  }
  return url;
}

export function bucket(name: string) {
  return {
    async upload(path: string, file: Blob) {
      blobs.set(`${name}/${path}`, file);
      return { data: { path }, error: null };
    },
    getPublicUrl(path: string) {
      return { data: { publicUrl: urlFor(name, path) } };
    },
    async createSignedUrls(paths: string[], _ttl: number) {
      return { data: paths.map((p) => ({ path: p, signedUrl: urlFor(name, p), error: null })), error: null };
    },
    async createSignedUrl(path: string, _ttl: number) {
      return { data: { signedUrl: urlFor(name, path) }, error: null };
    },
  };
}

export function clearStorage() {
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls.clear();
  blobs.clear();
}
