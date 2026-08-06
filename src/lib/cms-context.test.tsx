import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { CmsProvider, useCmsData, useFaqs, useTestimonials } from "./cms-context";
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
 * given sections. Returns the rendered text so tests can assert on the output.
 */
function renderWithCms(
  sections: Record<string, CmsSection>,
  section: string,
  fallback: Record<string, unknown>,
): Record<string, unknown> {
  let captured: Record<string, unknown> = {};

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
    const result = renderWithCms(
      { hero: makeSection({ heading: "CMS heading" }) },
      "hero",
      fallback,
    );
    expect(result.heading).toBe("CMS heading");
  });

  it("preserves fallback keys that are absent from CMS data", () => {
    // Only 'heading' is in the DB — 'subheading' and 'extra' must come from fallback.
    const result = renderWithCms(
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
    const result = renderWithCms(
      { hero: makeSection({ heading: "H", brandNew: true }) },
      "hero",
      fallback,
    );
    expect((result as Record<string, unknown>).brandNew).toBe(true);
  });

  it("merges correctly across different sections in the same provider", () => {
    const sections = {
      hero: makeSection({ heading: "Hero CMS" }, { section: "hero" }),
      footer: makeSection({ tagline: "Footer CMS" }, { section: "footer" }),
    };
    const heroResult = renderWithCms(sections, "hero", { heading: "Hero fallback" });
    const footerResult = renderWithCms(sections, "footer", { tagline: "Footer fallback" });

    expect(heroResult.heading).toBe("Hero CMS");
    expect(footerResult.tagline).toBe("Footer CMS");
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
    let result: typeof fallback = { heading: "" };

    function Consumer() {
      result = useCmsData("hero", fallback);
      return null;
    }

    // No CmsProvider wrapping — the default context value has empty sections.
    renderToStaticMarkup(<Consumer />);

    expect(result).toEqual(fallback);
  });
});
