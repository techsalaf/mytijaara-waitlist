import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { CmsProvider, useCmsData, useCmsSectionEnabled, useFaqs, useTestimonials } from "./cms-context";
import type { CmsSection, Faq, Testimonial } from "@/lib/api";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Minimal valid CmsSection for test fixtures. */
function makeSection(data: Record<string, unknown>, overrides: Partial<CmsSection> = {}): CmsSection {
  return {
    section: "test",
    title: "Test",
    data,
    draft: null,
    enabled: true,
    published: true,
    order: 0,
    scheduledAt: null,
    ...overrides,
  } as unknown as CmsSection;
}

/**
 * Render a component that calls `useCmsData` inside a CmsProvider with the
 * given sections and return whatever the hook produced. `null` is a real
 * result, not a failure: it is how the hook reports "the administrator switched
 * this section off".
 */
function renderWithCms(
  sections: Record<string, CmsSection>,
  section: string,
  fallback: Record<string, unknown>,
): Record<string, unknown> | null {
  let captured: Record<string, unknown> | null = null;

  function Consumer() {
    captured = useCmsData(section, fallback);
    return <>{JSON.stringify(captured)}</>;
  }

  renderToStaticMarkup(
    <CmsProvider sections={sections} faqs={[]} testimonials={[]}>
      <Consumer />
    </CmsProvider>,
  );

  return captured;
}

/**
 * Same as `renderWithCms` but for the enabled path, where `null` would mean the
 * hook wrongly hid a live section. Narrows the type so tests can read fields.
 */
function renderEnabled(
  sections: Record<string, CmsSection>,
  section: string,
  fallback: Record<string, unknown>,
): Record<string, unknown> {
  const result = renderWithCms(sections, section, fallback);
  if (result === null) {
    throw new Error(`useCmsData("${section}") returned null for an enabled section`);
  }
  return result;
}

// ─── useCmsData ───────────────────────────────────────────────────────────────

describe("useCmsData", () => {
  const fallback = { heading: "Default heading", subheading: "Default sub", extra: "kept" };

  it("returns the fallback when no sections are loaded", () => {
    const result = renderWithCms({}, "hero", fallback);
    expect(result).toEqual(fallback);
  });

  it("returns the fallback when the section key is missing", () => {
    const result = renderWithCms(
      { footer: makeSection({ heading: "Footer" }) },
      "hero",
      fallback,
    );
    expect(result).toEqual(fallback);
  });

  it("returns the fallback when the section's data is an empty object", () => {
    const result = renderWithCms({ hero: makeSection({}) }, "hero", fallback);
    expect(result).toEqual(fallback);
  });

  it("overrides fallback keys with CMS data", () => {
    const result = renderEnabled(
      { hero: makeSection({ heading: "CMS heading" }) },
      "hero",
      fallback,
    );
    expect(result.heading).toBe("CMS heading");
  });

  it("preserves fallback keys that are absent from CMS data", () => {
    // Only 'heading' is in the DB — 'subheading' and 'extra' must come from fallback.
    const result = renderEnabled(
      { hero: makeSection({ heading: "CMS heading" }) },
      "hero",
      fallback,
    );
    expect(result.subheading).toBe("Default sub");
    expect(result.extra).toBe("kept");
  });

  it("CMS data fully overrides when all keys are present", () => {
    const cms = { heading: "CMS heading", subheading: "CMS sub", extra: "CMS extra" };
    const result = renderWithCms({ hero: makeSection(cms) }, "hero", fallback);
    expect(result).toEqual(cms);
  });

  it("CMS data can add keys not in the fallback", () => {
    const result = renderEnabled(
      { hero: makeSection({ heading: "H", brandNew: true }) },
      "hero",
      fallback,
    );
    expect(result.brandNew).toBe(true);
  });

  it("merges correctly across different sections in the same provider", () => {
    const sections = {
      hero: makeSection({ heading: "Hero CMS" }, { section: "hero" }),
      footer: makeSection({ tagline: "Footer CMS" }, { section: "footer" }),
    };
    const heroResult = renderEnabled(sections, "hero", { heading: "Hero fallback" });
    const footerResult = renderEnabled(sections, "footer", { tagline: "Footer fallback" });

    expect(heroResult.heading).toBe("Hero CMS");
    expect(footerResult.tagline).toBe("Footer CMS");
  });
});

// ─── the active/inactive toggle ───────────────────────────────────────────────

/**
 * These are the regression tests for the bug the audit started from: an
 * administrator switching a section to Inactive changed nothing on the public
 * site.
 *
 * Two layers had to agree. The backend used to drop disabled rows from
 * `GET /cms` entirely, so the payload said "absent" — and "absent" is also what
 * a never-seeded section looks like, which legitimately falls back to the
 * bundled copy. The result was that switching a section off rendered the
 * hardcoded default instead of hiding it. `CmsController::presentPublic()` now
 * keeps the row and sends `enabled: false`, and the assertions below pin the
 * distinction so the two cases can never collapse into one again.
 */
describe("useCmsData section toggle", () => {
  const fallback = { heading: "Default heading" };

  it("hides a section the administrator switched off", () => {
    const result = renderWithCms(
      { hero: makeSection({ heading: "CMS heading" }, { enabled: false }) },
      "hero",
      fallback,
    );
    expect(result).toBeNull();
  });

  it("hides a disabled section even when it still carries data", () => {
    // Belt and braces: the API strips `data` for disabled sections, but a stale
    // cached payload or an older backend may still include it.
    const result = renderWithCms(
      { hero: makeSection({ heading: "Left over" }, { enabled: false }) },
      "hero",
      fallback,
    );
    expect(result).toBeNull();
  });

  it("hides an unpublished section", () => {
    const result = renderWithCms(
      { hero: makeSection({ heading: "Draft only" }, { published: false }) },
      "hero",
      fallback,
    );
    expect(result).toBeNull();
  });

  it("shows the section again when it is switched back on", () => {
    const result = renderEnabled(
      { hero: makeSection({ heading: "CMS heading" }, { enabled: true }) },
      "hero",
      fallback,
    );
    expect(result.heading).toBe("CMS heading");
  });

  it("does NOT hide a section that is merely absent from the payload", () => {
    // The bug: absent and disabled used to be indistinguishable. Absent must
    // still render bundled copy so a fresh install or a failed /cms request
    // shows a page rather than a blank screen.
    const result = renderWithCms({}, "hero", fallback);
    expect(result).toEqual(fallback);
  });

  it("hides only the section that is off, not its neighbours", () => {
    const sections = {
      hero: makeSection({ heading: "Hero CMS" }, { section: "hero", enabled: false }),
      footer: makeSection({ tagline: "Footer CMS" }, { section: "footer" }),
    };
    expect(renderWithCms(sections, "hero", fallback)).toBeNull();
    expect(renderEnabled(sections, "footer", { tagline: "x" }).tagline).toBe("Footer CMS");
  });
});

// ─── useCmsSectionEnabled ─────────────────────────────────────────────────────

describe("useCmsSectionEnabled", () => {
  function renderEnabledFlag(sections: Record<string, CmsSection>, section: string): boolean {
    let captured = false;

    function Consumer() {
      captured = useCmsSectionEnabled(section);
      return null;
    }

    renderToStaticMarkup(
      <CmsProvider sections={sections} faqs={[]} testimonials={[]}>
        <Consumer />
      </CmsProvider>,
    );

    return captured;
  }

  it("reports a live section as on", () => {
    expect(renderEnabledFlag({ announcement: makeSection({ text: "Hi" }) }, "announcement")).toBe(true);
  });

  it("reports a disabled section as off", () => {
    expect(
      renderEnabledFlag({ announcement: makeSection({ text: "Hi" }, { enabled: false }) }, "announcement"),
    ).toBe(false);
  });

  it("reports an unpublished section as off", () => {
    expect(
      renderEnabledFlag({ announcement: makeSection({ text: "Hi" }, { published: false }) }, "announcement"),
    ).toBe(false);
  });

  it("treats an absent section as on, matching useCmsData's fallback", () => {
    expect(renderEnabledFlag({}, "announcement")).toBe(true);
  });
});

// ─── deep merge ───────────────────────────────────────────────────────────────

describe("useCmsData deep merge", () => {
  it("merges nested objects key by key instead of replacing them", () => {
    // /about saves `hero.heading` only. `hero.subheading` must survive.
    const fallback = { hero: { heading: "Default H", subheading: "Default S" } };
    const result = renderEnabled(
      { about: makeSection({ hero: { heading: "CMS H" } }) },
      "about",
      fallback,
    );
    expect(result.hero).toEqual({ heading: "CMS H", subheading: "Default S" });
  });

  it("replaces arrays wholesale rather than overlaying them", () => {
    // An admin who deletes two of four list items must end up with two items,
    // not two new ones layered over the old four.
    const fallback = { items: [{ t: "a" }, { t: "b" }, { t: "c" }, { t: "d" }] };
    const result = renderEnabled(
      { services: makeSection({ items: [{ t: "x" }, { t: "y" }] }) },
      "services",
      fallback,
    );
    expect(result.items).toEqual([{ t: "x" }, { t: "y" }]);
  });

  it("lets an empty array clear a list", () => {
    const result = renderEnabled(
      { services: makeSection({ items: [] }) },
      "services",
      { items: [{ t: "a" }] },
    );
    expect(result.items).toEqual([]);
  });

  it("merges three levels deep", () => {
    const fallback = { a: { b: { c: 1, d: 2 } } };
    const result = renderEnabled({ x: makeSection({ a: { b: { c: 9 } } }) }, "x", fallback);
    expect(result.a).toEqual({ b: { c: 9, d: 2 } });
  });

  it("lets a saved null override a fallback object", () => {
    const result = renderEnabled({ x: makeSection({ a: null }) }, "x", { a: { b: 1 } });
    expect(result.a).toBeNull();
  });

  it("does not mutate the fallback object", () => {
    const fallback = { hero: { heading: "Default H" } };
    renderEnabled({ x: makeSection({ hero: { heading: "CMS H" } }) }, "x", fallback);
    expect(fallback.hero.heading).toBe("Default H");
  });
});

// ─── useFaqs / useTestimonials ─────────────────────────────────────────────────

describe("useFaqs", () => {
  it("returns an empty array when the provider has no FAQs", () => {
    let result: Faq[] = [];

    function Consumer() {
      result = useFaqs();
      return null;
    }

    renderToStaticMarkup(
      <CmsProvider sections={{}} faqs={[]} testimonials={[]}>
        <Consumer />
      </CmsProvider>,
    );

    expect(result).toEqual([]);
  });

  it("returns the FAQ array supplied to the provider", () => {
    const faqs: Faq[] = [
      { id: "1", question: "Q1", answer: "A1", published: true, order: 0 } as unknown as Faq,
      { id: "2", question: "Q2", answer: "A2", published: true, order: 1 } as unknown as Faq,
    ];
    let result: Faq[] = [];

    function Consumer() {
      result = useFaqs();
      return null;
    }

    renderToStaticMarkup(
      <CmsProvider sections={{}} faqs={faqs} testimonials={[]}>
        <Consumer />
      </CmsProvider>,
    );

    expect(result).toHaveLength(2);
    expect(result[0].question).toBe("Q1");
  });
});

describe("useTestimonials", () => {
  it("returns the testimonials array supplied to the provider", () => {
    const testimonials: Testimonial[] = [
      { id: "1", name: "User", body: "Great app", published: true } as unknown as Testimonial,
    ];
    let result: Testimonial[] = [];

    function Consumer() {
      result = useTestimonials();
      return null;
    }

    renderToStaticMarkup(
      <CmsProvider sections={{}} faqs={[]} testimonials={testimonials}>
        <Consumer />
      </CmsProvider>,
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("User");
  });
});

// ─── default context (no provider) ────────────────────────────────────────────

describe("useCmsData outside a provider", () => {
  it("returns the fallback when consumed outside a CmsProvider", () => {
    const fallback = { heading: "Default" };
    let result: typeof fallback | null = null;

    function Consumer() {
      result = useCmsData("hero", fallback);
      return null;
    }

    // No CmsProvider wrapping — the default context value has empty sections.
    renderToStaticMarkup(<Consumer />);

    expect(result).toEqual(fallback);
  });
});
