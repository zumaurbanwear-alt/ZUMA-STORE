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
  it("routes a valid http(s) URL through the wsrv.nl proxy with the requested size", () => {
    const out = transformImage("https://example.com/a.jpg", 600);
    expect(out.startsWith("https://wsrv.nl/?")).toBe(true);
    expect(out).toContain("url=https%3A%2F%2Fexample.com%2Fa.jpg");
    expect(out).toContain("w=600");
    expect(out).toContain("output=webp");
  });

  it("uses the provided quality, defaulting to 75", () => {
    expect(transformImage("https://example.com/a.jpg", 600)).toContain("q=75");
    expect(transformImage("https://example.com/a.jpg", 600, 90)).toContain("q=90");
  });

  it("passes through non-http input unchanged instead of building a proxy URL", () => {
    expect(transformImage("", 600)).toBe("");
    expect(transformImage("/local/path.jpg", 600)).toBe("/local/path.jpg");
  });
});
