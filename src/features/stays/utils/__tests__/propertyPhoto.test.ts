import { describe, expect, it } from "vitest";
import { resolvePropertyPhoto } from "../propertyPhoto";

describe("resolvePropertyPhoto", () => {
  it("reads coverPhoto, photo and the first non-empty photo", () => {
    expect(resolvePropertyPhoto({ coverPhoto: "https://cdn/cover.jpg" })).toBe("https://cdn/cover.jpg");
    expect(resolvePropertyPhoto({ photo: " https://cdn/photo.jpg " })).toBe("https://cdn/photo.jpg");
    expect(resolvePropertyPhoto({ photos: ["", "https://cdn/first.jpg"] })).toBe("https://cdn/first.jpg");
  });

  it("prefers an explicit cover over the gallery", () => {
    expect(
      resolvePropertyPhoto({
        coverPhoto: "https://cdn/cover.jpg",
        photo: "https://cdn/photo.jpg",
        photos: ["https://cdn/gallery.jpg"],
      }),
    ).toBe("https://cdn/cover.jpg");
  });

  it("accepts image objects from the media service", () => {
    expect(resolvePropertyPhoto({ photos: [{ url: "https://cdn/url.jpg" }] })).toBe("https://cdn/url.jpg");
    expect(resolvePropertyPhoto({ coverPhoto: { src: "https://cdn/src.jpg" } })).toBe("https://cdn/src.jpg");
  });

  it("returns an empty string when there is no usable image", () => {
    expect(resolvePropertyPhoto(null)).toBe("");
    expect(resolvePropertyPhoto({})).toBe("");
    expect(resolvePropertyPhoto({ photos: [] })).toBe("");
    expect(resolvePropertyPhoto({ photo: { bad: true }, photos: [null, 42, { url: 7 }] })).toBe("");
  });
});
