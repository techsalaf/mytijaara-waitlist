import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SettingsForm } from "./settings-form";

/** A settings-group state with every field defaulted to the happy path. */
function state(overrides: Partial<Parameters<typeof SettingsForm<{ siteName: string }>>[0]["state"]> = {}) {
  return {
    form: { siteName: "MyTijaara" },
    loading: false,
    saving: false,
    error: null as string | null,
    dirty: false,
    updatedAt: null as string | null,
    reload: vi.fn(),
    save: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function renderForm(s: ReturnType<typeof state>) {
  render(
    <SettingsForm
      title="General"
      description="Workspace basics."
      state={s}
      successMessage="General settings saved."
    >
      {(form) => <div data-testid="body">{form.siteName}</div>}
    </SettingsForm>,
  );
}

describe("SettingsForm states", () => {
  it("renders a skeleton and no body while loading", () => {
    renderForm(state({ loading: true, form: null }));

    expect(screen.queryByTestId("body")).not.toBeInTheDocument();
    // The skeleton is decorative, so it is identified by its pulse class.
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders the retry card and not the body when the load failed", () => {
    const s = state({ error: "Server error", form: null });
    renderForm(s);

    expect(screen.getByText("Could not load these settings")).toBeInTheDocument();
    expect(screen.getByText("Server error")).toBeInTheDocument();
    expect(screen.queryByTestId("body")).not.toBeInTheDocument();
  });

  it("prefers the error card over the skeleton when both could apply", () => {
    renderForm(state({ error: "Server error", loading: true, form: null }));

    expect(screen.getByText("Could not load these settings")).toBeInTheDocument();
  });

  it("calls reload from the Retry button", async () => {
    const s = state({ error: "Server error", form: null });
    renderForm(s);

    await userEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(s.reload).toHaveBeenCalledTimes(1);
  });

  it("renders the body once the form has landed", () => {
    renderForm(state());

    expect(screen.getByTestId("body")).toHaveTextContent("MyTijaara");
  });

  it("shows the last-saved timestamp only when the server reported one", () => {
    renderForm(state({ updatedAt: "2026-08-05T09:00:00Z" }));
    expect(screen.getByText(/last saved/i)).toBeInTheDocument();
  });

  it("omits the last-saved line when the group has never been written", () => {
    renderForm(state());
    expect(screen.queryByText(/last saved/i)).not.toBeInTheDocument();
  });
});

describe("SettingsForm save button", () => {
  it("is disabled with a reason when nothing is dirty", () => {
    renderForm(state({ dirty: false }));

    const button = screen.getByRole("button", { name: /save changes/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", "No changes to save");
  });

  it("enables once the form is dirty and drops the disabled reason", () => {
    renderForm(state({ dirty: true }));

    const button = screen.getByRole("button", { name: /save changes/i });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute("title");
  });

  it("passes the tab's success message through to save", async () => {
    const s = state({ dirty: true });
    renderForm(s);

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(s.save).toHaveBeenCalledWith("General settings saved.");
  });

  it("is disabled while a save is in flight, so a double click cannot post twice", async () => {
    const s = state({ dirty: true, saving: true });
    renderForm(s);

    const button = screen.getByRole("button", { name: /saving/i });
    expect(button).toBeDisabled();
    await userEvent.click(button, { pointerEventsCheck: 0 });
    expect(s.save).not.toHaveBeenCalled();
  });

  it("is disabled while loading, even if a stale dirty flag says otherwise", () => {
    renderForm(state({ loading: true, dirty: true, form: null }));

    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
  });

  it("renders extra actions next to Save", () => {
    render(
      <SettingsForm
        title="SMTP"
        state={state()}
        successMessage="Saved."
        actions={<button type="button">Send test email</button>}
      >
        {() => null}
      </SettingsForm>,
    );

    expect(screen.getByRole("button", { name: "Send test email" })).toBeInTheDocument();
  });
});
