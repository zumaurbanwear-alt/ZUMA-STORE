import { describe, it, expect } from "vitest";
import { computeCrop, focalToPosition, isHeroImageContent } from "./heroImage";

describe("computeCrop", () => {
  it("keeps a vertical strip of a landscape photo for the phone format", () => {
    const c = computeCrop(6000, 4000, 1080, 1920, { x: 0.5, y: 0.5 });
    expect(c).toMatchObject({ sw: 2250, sh: 4000, outW: 1080, outH: 1920 });
    expect(c.sx).toBe(Math.round(0.5 * (6000 - 2250)));
  });

  it("follows the focal point like CSS object-position", () => {
    expect(computeCrop(6000, 4000, 1080, 1920, { x: 0, y: 0 }).sx).toBe(0);
    const r = computeCrop(6000, 4000, 1080, 1920, { x: 1, y: 1 });
    expect(r.sx + r.sw).toBe(6000);
  });

  it("never upscales a small source", () => {
    const c = computeCrop(1200, 800, 2560, 1440, { x: 0.5, y: 0.5 });
    expect(c.outW).toBe(1200);
  });

  it("stays inside the image for invalid focal values", () => {
    const c = computeCrop(6000, 4000, 1080, 1920, { x: NaN, y: 2 });
    expect(c.sx + c.sw).toBeLessThanOrEqual(6000);
    expect(c.sy + c.sh).toBeLessThanOrEqual(4000);
  });
});

describe("focalToPosition", () => {
  it("formats as a CSS object-position", () => {
    expect(focalToPosition({ x: 0.4, y: 0.15 })).toBe("40% 15%");
  });
});

describe("isHeroImageContent", () => {
  const ok = {
    mobile: "https://a/b.webp",
    tablet: "https://a/c.webp",
    desktop: "https://a/d.webp",
    focal: { x: 0.5, y: 0.5 },
  };
  it("accepts valid content and rejects bad URLs or missing focal", () => {
    expect(isHeroImageContent(ok)).toBe(true);
    expect(isHeroImageContent({ ...ok, desktop: "javascript:alert(1)" })).toBe(false);
    expect(isHeroImageContent({ ...ok, focal: undefined })).toBe(false);
    expect(isHeroImageContent(null)).toBe(false);
  });
});
