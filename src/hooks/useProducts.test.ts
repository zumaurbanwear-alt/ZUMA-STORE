import { describe, it, expect } from "vitest";
import { resolveImage, transformImage } from "./useProducts";

describe("resolveImage", () => {
  it("returns the image_url when it's a full http(s) URL", () => {
    expect(resolveImage({ slug: "x", image_url: "https://example.com/a.jpg" })).toBe(
      "https://example.com/a.jpg"
    );
    expect(resolveImage({ slug: "x", image_url: "http://example.com/a.jpg" })).toBe(
      "http://example.com/a.jpg"
    );
  });

  it("returns an empty string for a non-http path (e.g. a stale local asset path)", () => {
    expect(resolveImage({ slug: "x", image_url: "/src/assets/product-1.jpg" })).toBe("");
  });

  it("returns an empty string when image_url is empty", () => {
    expect(resolveImage({ slug: "x", image_url: "" })).toBe("");
  });
});

describe("transformImage", () => {
  it("returns a valid http(s) URL unchanged, at full source quality", () => {
    expect(transformImage("https://example.com/a.jpg", 600)).toBe("https://example.com/a.jpg");
    expect(transformImage("https://example.com/a.jpg", 600, 90)).toBe("https://example.com/a.jpg");
  });

  it("passes through non-http input unchanged", () => {
    expect(transformImage("", 600)).toBe("");
    expect(transformImage("/local/path.jpg", 600)).toBe("/local/path.jpg");
  });
});
