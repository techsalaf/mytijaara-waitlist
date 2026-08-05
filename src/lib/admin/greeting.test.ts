import { describe, expect, it } from "vitest";

import { firstName, greeting } from "./greeting";

describe("greeting", () => {
  it("greets by time of day", () => {
    expect(greeting(new Date(2026, 7, 5, 0, 1))).toBe("Good morning");
    expect(greeting(new Date(2026, 7, 5, 11, 59))).toBe("Good morning");
    expect(greeting(new Date(2026, 7, 5, 12, 0))).toBe("Good afternoon");
    expect(greeting(new Date(2026, 7, 5, 16, 59))).toBe("Good afternoon");
    expect(greeting(new Date(2026, 7, 5, 17, 0))).toBe("Good evening");
    expect(greeting(new Date(2026, 7, 5, 23, 59))).toBe("Good evening");
  });
});

describe("firstName", () => {
  it("takes the first word of a full name", () => {
    expect(firstName("Adaeze Okonkwo")).toBe("Adaeze");
    expect(firstName("  Rasheed  Amuda ")).toBe("Rasheed");
    expect(firstName("Ada")).toBe("Ada");
  });

  // The header must not render "Good morning, undefined" before the session
  // effect resolves, or when a session has no name at all.
  it("returns null for a missing or blank name", () => {
    expect(firstName(null)).toBeNull();
    expect(firstName(undefined)).toBeNull();
    expect(firstName("")).toBeNull();
    expect(firstName("   ")).toBeNull();
  });
});
