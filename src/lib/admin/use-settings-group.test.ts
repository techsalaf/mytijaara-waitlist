import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { settingsApi } from "@/lib/api/settings";
import { ApiError } from "@/lib/api/client";
import { settingsError, useSettingsGroup } from "./use-settings-group";

vi.mock("@/lib/api/settings", () => ({
  settingsApi: { get: vi.fn(), update: vi.fn() },
}));

// vi.mock is hoisted above the imports, so the spies it closes over have to be
// created inside vi.hoisted rather than as plain top-level consts.
const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

const get = vi.mocked(settingsApi.get);
const update = vi.mocked(settingsApi.update);

const DEFAULTS = { siteName: "", tagline: "", noindex: false };

beforeEach(() => {
  get.mockReset();
  update.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});

/** Renders the hook and waits for the first load to settle. */
async function loaded(defaults: Record<string, unknown> = DEFAULTS) {
  const view = renderHook(() => useSettingsGroup("company", defaults));
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

describe("useSettingsGroup load", () => {
  it("merges server values over the declared defaults", async () => {
    get.mockResolvedValue({ data: { siteName: "MyTijaara" }, meta: { updated_at: "2026-08-01T10:00:00Z" } });

    const { result } = await loaded();

    expect(result.current.form).toEqual({ siteName: "MyTijaara", tagline: "", noindex: false });
    expect(result.current.updatedAt).toBe("2026-08-01T10:00:00Z");
    expect(result.current.error).toBeNull();
  });

  it("ignores keys the tab does not declare, so a shared group is not clobbered", async () => {
    // `supportEmail` belongs to another form writing the same row. Sending it
    // back from this tab is how the two forms used to revert each other.
    get.mockResolvedValue({ data: { siteName: "A", supportEmail: "x@y.z" } });

    const { result } = await loaded();

    expect(result.current.form).not.toHaveProperty("supportEmail");
  });

  it("treats a null server value as absent rather than overwriting the default", async () => {
    get.mockResolvedValue({ data: { tagline: null, noindex: null } });

    const { result } = await loaded();

    expect(result.current.form).toEqual({ siteName: "", tagline: "", noindex: false });
  });

  it("surfaces a load failure as an error string instead of a toast", async () => {
    get.mockRejectedValue(new ApiError("Server exploded", 500));

    const { result } = await loaded();

    expect(result.current.error).toBe("Server exploded");
    expect(result.current.form).toBeNull();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("refetches on reload", async () => {
    get.mockResolvedValue({ data: { siteName: "First" } });
    const { result } = await loaded();

    get.mockResolvedValue({ data: { siteName: "Second" } });
    act(() => result.current.reload());

    await waitFor(() => expect(result.current.form?.siteName).toBe("Second"));
    expect(get).toHaveBeenCalledTimes(2);
  });
});

describe("useSettingsGroup dirty tracking", () => {
  it("is clean right after load and dirty after an edit", async () => {
    get.mockResolvedValue({ data: { siteName: "MyTijaara" } });
    const { result } = await loaded();

    expect(result.current.dirty).toBe(false);

    act(() => result.current.set("siteName", "Changed"));
    expect(result.current.dirty).toBe(true);
  });

  it("goes clean again when an edit is reverted by hand", async () => {
    get.mockResolvedValue({ data: { siteName: "MyTijaara" } });
    const { result } = await loaded();

    act(() => result.current.set("siteName", "Changed"));
    act(() => result.current.set("siteName", "MyTijaara"));

    expect(result.current.dirty).toBe(false);
  });

  it("patch sets several fields in one render", async () => {
    get.mockResolvedValue({ data: {} });
    const { result } = await loaded();

    act(() => result.current.patch({ siteName: "A", tagline: "B" }));

    expect(result.current.form).toEqual({ siteName: "A", tagline: "B", noindex: false });
  });
});

describe("useSettingsGroup save", () => {
  it("posts the whole form and adopts the server echo", async () => {
    get.mockResolvedValue({ data: { siteName: "Old" } });
    const { result } = await loaded();

    act(() => result.current.set("siteName", "New"));
    // The server coerces and redacts, so the echo can differ from what was sent.
    update.mockResolvedValue({
      data: { siteName: "New", tagline: "", noindex: false },
      meta: { updated_at: "2026-08-05T09:00:00Z" },
    });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.save("General settings saved.");
    });

    expect(ok).toBe(true);
    expect(update).toHaveBeenCalledWith("company", { siteName: "New", tagline: "", noindex: false });
    expect(toastSuccess).toHaveBeenCalledWith("General settings saved.");
    expect(result.current.updatedAt).toBe("2026-08-05T09:00:00Z");
    // Adopting the echo is what makes the form clean again.
    expect(result.current.dirty).toBe(false);
  });

  it("adopts a server value that differs from what was sent", async () => {
    get.mockResolvedValue({ data: { siteName: "" } });
    const { result } = await loaded();

    act(() => result.current.set("siteName", "  Trailing  "));
    update.mockResolvedValue({ data: { siteName: "Trailing" } });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.form?.siteName).toBe("Trailing");
  });

  it("reports a rejected save and leaves the form dirty", async () => {
    get.mockResolvedValue({ data: { siteName: "Old" } });
    const { result } = await loaded();

    act(() => result.current.set("siteName", "x"));
    update.mockRejectedValue(
      new ApiError("The given data was invalid.", 422, { siteName: ["The site name is too short."] }),
    );

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.save();
    });

    expect(ok).toBe(false);
    // The field-level message is the useful one; the generic wrapper is not.
    expect(toastError).toHaveBeenCalledWith("The site name is too short.");
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(result.current.dirty).toBe(true);
  });

  it("does nothing when there is no form yet", async () => {
    get.mockRejectedValue(new ApiError("down", 500));
    const { result } = await loaded();

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.save();
    });

    expect(ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("clears the saving flag even when the request throws", async () => {
    get.mockResolvedValue({ data: {} });
    const { result } = await loaded();

    update.mockRejectedValue(new ApiError("nope", 500));
    await act(async () => {
      await result.current.save();
    });

    expect(result.current.saving).toBe(false);
  });
});

describe("settingsError", () => {
  it("prefers the first field-level validation message", () => {
    const err = new ApiError("The given data was invalid.", 422, {
      port: ["The port must be an integer."],
    });
    expect(settingsError(err, "fallback")).toBe("The port must be an integer.");
  });

  it("falls back to the top-level message when there are no field errors", () => {
    expect(settingsError(new ApiError("Server error", 500), "fallback")).toBe("Server error");
  });

  it("uses a plain Error message", () => {
    expect(settingsError(new Error("boom"), "fallback")).toBe("boom");
  });

  it("uses the fallback for a non-Error throw", () => {
    expect(settingsError("just a string", "fallback")).toBe("fallback");
  });
});
