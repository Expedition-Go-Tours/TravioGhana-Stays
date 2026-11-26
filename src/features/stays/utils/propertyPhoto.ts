/** A photo can arrive as a URL string or as an object from an image service. */
type PhotoValue = string | { url?: unknown; src?: unknown } | null | undefined;

type PhotoSource = {
  photo?: unknown;
  coverPhoto?: unknown;
  photos?: unknown;
};

function photoUrl(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as { url?: unknown; src?: unknown };
    const candidate = record.url ?? record.src;
    return typeof candidate === "string" ? candidate.trim() : "";
  }
  return "";
}

/**
 * Resolve the first usable cover image for a property, whichever field the
 * payload uses. The dashboard exposes `photo`, the properties list exposes
 * `photos`, and older responses use `coverPhoto`; all three can be a string or
 * an `{ url }` object. Returns an empty string when there is no image so
 * callers can render their placeholder.
 */
export function resolvePropertyPhoto(source: PhotoSource | null | undefined): string {
  if (!source) return "";

  const direct = photoUrl(source.coverPhoto) || photoUrl(source.photo);
  if (direct) return direct;

  if (Array.isArray(source.photos)) {
    for (const value of source.photos) {
      const url = photoUrl(value as PhotoValue);
      if (url) return url;
    }
  }

  return "";
}
