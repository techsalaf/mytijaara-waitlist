import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { cmsApi } from "@/lib/api";
import { useCmsSection } from "./useCmsSection";

vi.mock("@/lib/api", () => ({
  cmsApi: { section: vi.fn(), updateSection: vi.fn() },
}));

// vi.mock is hoisted above the imports, so the spies it closes over have to be
// created inside vi.hoisted rather than as plain top-level consts.
const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

const section = vi.mocked(cmsApi.section);
const updateSection = vi.mocked(cmsApi.updateSection);

/** The shape an editor declares: two scalars and one nested object. */
const DEFAULTS = {
  heading: "Bundled heading",
  eyebrowLive: "Now live",
  webApp: { enabled: true, url: "https://app.mytijaara.com", label: "Order Online" },
};

/** `GET /cms-admin/{slug}` as the hook consumes it. */
function response(data: Record<string, unknown> | null, overrides: Record<string, unknown> = {}) {
  return {
    data: {
      section: "hero",
      title: "Hero",
      data,
      draft: null,
      enabled: true,
      published: true,
      order: 2,
      scheduledAt: null,
      ...overrides,
    },
  } as never;
}

beforeEach(() => {
  section.mockReset();
  updateSection.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  updateSection.mockResolvedValue({ data: {} } as never);
});

async function loaded(data: Record<string, unknown> | null, overrides?: Record<string, unknown>) {
  section.mockResolvedValue(response(data, overrides));
  const view = renderHook(() => useCmsSection("hero", DEFAULTS));
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

describe("useCmsSection load", () => {
  it("shows a default for a field the stored row predates", async () => {
    // The row was written before `eyebrowLive` existed. Replacing state with the
    // row left the new input blank, and the next save wrote that blank to the
    // database — an editor field that destroys content instead of editing it.
    const { result } = await loaded({ heading: "Saved heading" });

    expect(result.current.data.eyebrowLive).toBe("Now live");
    expect(result.current.data.heading).toBe("Saved heading");
  });

  it("fills the whole form from defaults when the row is an empty object", async () => {
    // `{}` does not trigger `??`, so the old load path put an empty object into
    // state and every input on the tab rendered blank.
    const { result } = await loaded({});

    expect(result.current.data).toEqual(DEFAULTS);
  });

  it("fills the form from defaults when the row has no data at all", async () => {
    const { result } = await loaded(null);

    expect(result.current.data).toEqual(DEFAULTS);
  });

  it("merges nested objects instead of dropping their untouched keys", async () => {
    const { result } = await loaded({ webApp: { url: "https://staging.mytijaara.com" } });

    expect(result.current.data.webApp).toEqual({
      enabled: true,
      url: "https://staging.mytijaara.com",
      label: "Order Online",
    });
  });

  it("keeps an empty string the administrator saved on purpose", async () => {
    const { result } = await loaded({ heading: "" });

    expect(result.current.data.heading).toBe("");
  });

  it("reads the section's flags, defaulting a missing flag to on", async () => {
    const { result } = await loaded({ heading: "x" }, { enabled: false, published: false, title: "Hero band" });

    expect(result.current.enabled).toBe(false);
    expect(result.current.published).toBe(false);
    expect(result.current.title).toBe("Hero band");
  });

  it("reports a failed load and stops loading", async () => {
    section.mockRejectedValue(new Error("boom"));
    const view = renderHook(() => useCmsSection("hero", DEFAULTS));

    await waitFor(() => expect(view.result.current.loading).toBe(false));

    expect(toastError).toHaveBeenCalledWith("Unable to load CMS section");
    // Falls back to the bundled copy rather than an empty form.
    expect(view.result.current.data).toEqual(DEFAULTS);
  });
});

describe("useCmsSection save", () => {
  it("sends the merged data plus both flags", async () => {
    const { result } = await loaded({ heading: "Saved heading" });

    await act(async () => {
      result.current.setEnabled(false);
    });
    await act(async () => {
      await result.current.save();
    });

    expect(updateSection).toHaveBeenCalledWith("hero", {
      data: { ...DEFAULTS, heading: "Saved heading" },
      enabled: false,
      published: true,
    });
    expect(toastSuccess).toHaveBeenCalledWith("Changes saved");
  });

  it("does not write a blank over a field the row predates", async () => {
    // Load a legacy row, change something unrelated, save. `eyebrowLive` must go
    // back as the default it displayed, never as "".
    const { result } = await loaded({ heading: "Saved heading" });

    await act(async () => {
      result.current.setData({ ...result.current.data, heading: "Edited" });
    });
    await act(async () => {
      await result.current.save();
    });

    const [, patch] = updateSection.mock.calls[0];
    expect(patch.data).toMatchObject({ heading: "Edited", eyebrowLive: "Now live" });
  });

  it("keeps stored keys the editor does not declare", async () => {
    // `navigation.cta` lives in seeded rows no editor field writes. A save must
    // not delete it.
    const { result } = await loaded({ heading: "h", cta: { label: "Join the Waitlist" } });

    await act(async () => {
      await result.current.save();
    });

    const [, patch] = updateSection.mock.calls[0];
    expect(patch.data).toHaveProperty("cta", { label: "Join the Waitlist" });
  });

  it("reports a failed save and clears the saving flag", async () => {
    updateSection.mockRejectedValue(new Error("nope"));
    const { result } = await loaded({ heading: "h" });

    await act(async () => {
      await result.current.save();
    });

    expect(toastError).toHaveBeenCalledWith("Unable to save section");
    expect(result.current.saving).toBe(false);
  });
});
