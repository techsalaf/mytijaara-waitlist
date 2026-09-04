import { describe, expect, it } from "vitest";
import { isPlainObject, mergeSectionData } from "./merge";

/**
 * The merge decides what an administrator sees in the editor and what the public
 * page renders, from the same stored row. Both sides call this, so the rules
 * below are the contract between them.
 */
describe("mergeSectionData", () => {
  it("keeps a default the stored row has no key for", () => {
    // The bug this fixes: `hero.eyebrowLive` was added to the editor's defaults,
    // rows seeded earlier had no such key, and the field rendered blank until
    // someone reseeded — then a save wrote the blank back.
    const merged = mergeSectionData(
      { eyebrow: "before", eyebrowLive: "after" },
      { eyebrow: "saved before" },
    );

    expect(merged).toEqual({ eyebrow: "saved before", eyebrowLive: "after" });
  });

  it("lets a saved value win over the default", () => {
    expect(mergeSectionData({ heading: "bundled" }, { heading: "edited" })).toEqual({ heading: "edited" });
  });

  it("keeps an empty string, a zero and a false the administrator saved", () => {
    // These are the values a `??`-based load path silently discards.
    const merged = mergeSectionData(
      { label: "Default", count: 5, enabled: true },
      { label: "", count: 0, enabled: false },
    );

    expect(merged).toEqual({ label: "", count: 0, enabled: false });
  });

  it("merges nested objects key by key", () => {
    const merged = mergeSectionData(
      { webApp: { enabled: true, url: "https://a", label: "Order Online" } },
      { webApp: { url: "https://b" } },
    );

    expect(merged).toEqual({ webApp: { enabled: true, url: "https://b", label: "Order Online" } });
  });

  it("replaces arrays wholesale so a shortened list stays short", () => {
    const merged = mergeSectionData(
      { items: [{ title: "a" }, { title: "b" }, { title: "c" }] },
      { items: [{ title: "x" }] },
    );

    expect(merged.items).toEqual([{ title: "x" }]);
  });

  it("keeps a deliberately emptied list empty", () => {
    // `download.features: []` means "render the bundled cards"; `footer.columns:
    // []` means "no columns". Restoring the defaults here would make deleting the
    // last row impossible.
    expect(mergeSectionData({ columns: [{ title: "Product" }] }, { columns: [] })).toEqual({ columns: [] });
  });

  it("does not treat an array default as an object to merge into", () => {
    const merged = mergeSectionData({ items: [] as unknown[] }, { items: { 0: "not a list" } });

    expect(merged.items).toEqual({ 0: "not a list" });
  });

  it("keeps stored keys the current editor no longer declares", () => {
    // `navigation.cta` and `navigation.logo` still sit in seeded rows that no
    // editor field writes. Dropping them here would delete stored content on the
    // administrator's next save.
    const merged = mergeSectionData({ links: [] }, { links: [], cta: { label: "Join" } });

    expect(merged).toHaveProperty("cta", { label: "Join" });
  });

  it("does not mutate either input", () => {
    const fallback = { nested: { a: 1 } };
    const saved = { nested: { b: 2 } };

    mergeSectionData(fallback, saved);

    expect(fallback).toEqual({ nested: { a: 1 } });
    expect(saved).toEqual({ nested: { b: 2 } });
  });

  it("returns the default object's shape for an empty row", () => {
    const fallback = { heading: "h", items: [1, 2] };

    expect(mergeSectionData(fallback, {})).toEqual(fallback);
  });

  it("survives a null nested value without throwing", () => {
    expect(mergeSectionData({ webApp: { url: "https://a" } }, { webApp: null })).toEqual({ webApp: null });
  });
});

describe("isPlainObject", () => {
  it("accepts plain objects only", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject("s")).toBe(false);
    expect(isPlainObject(1)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
  });
});
