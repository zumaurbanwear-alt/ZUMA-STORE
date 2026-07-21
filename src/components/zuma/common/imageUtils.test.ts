import { describe, it, expect } from "vitest";
import { buildOptimizedImageUrl, getImageLoadingMode } from "./imageUtils";

describe("buildOptimizedImageUrl", () => {
  it("routes remote images through the proxy with the requested size", () => {
    const out = buildOptimizedImageUrl("https://example.com/a.jpg", 600);
    expect(out.startsWith("https://wsrv.nl/?")).toBe(true);
    expect(out).toContain("url=https%3A%2F%2Fexample.com%2Fa.jpg");
    expect(out).toContain("w=600");
    expect(out).toContain("output=webp");
  });

  it("passes through non-http input unchanged", () => {
    expect(buildOptimizedImageUrl("", 600)).toBe("");
    expect(buildOptimizedImageUrl("/local/path.jpg", 600)).toBe("/local/path.jpg");
  });
});

describe("getImageLoadingMode", () => {
  it("uses eager and high priority for hero or priority images", () => {
    expect(getImageLoadingMode({ priority: true })).toEqual({
      loading: "eager",
      fetchPriority: "high",
    });
  });

  it("uses lazy and auto for secondary images", () => {
    expect(getImageLoadingMode({ priority: false })).toEqual({
      loading: "lazy",
      fetchPriority: "auto",
    });
  });
});
