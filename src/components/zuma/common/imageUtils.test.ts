import { describe, it, expect } from "vitest";
import { buildOptimizedImageUrl, getImageLoadingMode } from "./imageUtils";

describe("buildOptimizedImageUrl", () => {
  it("returns remote image URLs unchanged, at full source quality", () => {
    expect(buildOptimizedImageUrl("https://example.com/a.jpg", 600)).toBe("https://example.com/a.jpg");
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
