/**
 * Gate tests for the shared data room admin bits.
 *
 * `ConfirmationModal`'s phrase gate is a speed bump in front of a human, not a
 * security control, but a broken speed bump is worse than none: an operator who
 * believes the button is locked will click it. These pin the three properties that
 * matter — locked until an exact match, case sensitive, and cleared on reopen so a
 * phrase typed for one action cannot confirm a different one.
 *
 * `LoadState`'s 403 branch is pinned too. A 403 rendered as a retryable error
 * sends the operator round a loop that can never succeed.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmationModal, LoadState, StatusPill } from "./bits";
import { grantStatusView } from "@/lib/dataroom/admin-format";

function renderModal(overrides: Partial<Parameters<typeof ConfirmationModal>[0]> = {}) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  const props = {
    open: true,
    onOpenChange,
    title: "Lock the entire data room",
    effect: "Every live session is destroyed and no visitor can sign in.",
    reversal: "Unlock the room to let visitors back in.",
    confirmLabel: "Lock the entire data room",
    onConfirm,
    ...overrides,
  };
  const view = render(<ConfirmationModal {...props} />);
  return { ...view, onConfirm, onOpenChange, props };
}

function confirmButton(label: string) {
  return screen.getByRole("button", { name: label });
}

describe("ConfirmationModal", () => {
  it("shows the effect and the reversal before anything can be confirmed", () => {
    renderModal();
    expect(
      screen.getByText("Every live session is destroyed and no visitor can sign in."),
    ).toBeInTheDocument();
    expect(screen.getByText("Unlock the room to let visitors back in.")).toBeInTheDocument();
  });

  it("confirms on one click when no phrase is required", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();
    const button = confirmButton("Lock the entire data room");
    expect(button).toBeEnabled();
    await user.click(button);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("keeps the button disabled until the phrase matches exactly", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal({ phrase: "LOCK DATA ROOM" });
    const button = confirmButton("Lock the entire data room");
    expect(button).toBeDisabled();

    const input = screen.getByRole("textbox");
    await user.type(input, "LOCK DATA");
    expect(button).toBeDisabled();

    await user.type(input, " ROOM");
    expect(button).toBeEnabled();

    await user.click(button);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("is case sensitive", async () => {
    const user = userEvent.setup();
    renderModal({ phrase: "LOCK DATA ROOM" });
    await user.type(screen.getByRole("textbox"), "lock data room");
    expect(confirmButton("Lock the entire data room")).toBeDisabled();
  });

  it("ignores surrounding whitespace but nothing inside the phrase", async () => {
    const user = userEvent.setup();
    renderModal({ phrase: "REVOKE ALL SESSIONS" });
    const input = screen.getByRole("textbox");
    await user.type(input, "  REVOKE ALL SESSIONS  ");
    expect(confirmButton("Lock the entire data room")).toBeEnabled();

    await user.clear(input);
    await user.type(input, "REVOKE  ALL SESSIONS");
    expect(confirmButton("Lock the entire data room")).toBeDisabled();
  });

  it("clears the typed phrase when it closes, so reopening starts locked", async () => {
    const user = userEvent.setup();
    const { rerender, props } = renderModal({ phrase: "DISABLE ALL DOWNLOADS" });
    await user.type(screen.getByRole("textbox"), "DISABLE ALL DOWNLOADS");
    expect(confirmButton("Lock the entire data room")).toBeEnabled();

    rerender(<ConfirmationModal {...props} phrase="DISABLE ALL DOWNLOADS" open={false} />);
    rerender(<ConfirmationModal {...props} phrase="DISABLE ALL DOWNLOADS" open />);

    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(confirmButton("Lock the entire data room")).toBeDisabled();
  });

  it("disables both buttons while the request is in flight", () => {
    renderModal({ busy: true });
    expect(confirmButton("Lock the entire data room")).toBeDisabled();
    expect(confirmButton("Cancel")).toBeDisabled();
  });
});

describe("LoadState", () => {
  it("announces the load with a status role", () => {
    render(<LoadState loading error={null} label="the audit log" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading the audit log…");
  });

  it("tells the operator a 403 is not retryable and offers no retry button", () => {
    const onRetry = vi.fn();
    render(
      <LoadState
        loading={false}
        error="This action is unauthorized."
        forbidden
        onRetry={onRetry}
        label="the settings"
      />,
    );
    expect(screen.getByText("Your role does not include this permission")).toBeInTheDocument();
    expect(screen.getByText(/Retrying will not change the answer/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    // The raw backend message is not what the operator needs here.
    expect(screen.queryByText("This action is unauthorized.")).not.toBeInTheDocument();
  });

  it("offers a retry for an ordinary failure", () => {
    render(
      <LoadState
        loading={false}
        error="Network request failed."
        onRetry={vi.fn()}
        label="the grants"
      />,
    );
    expect(screen.getByText("Network request failed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("renders nothing once there is data to show", () => {
    const { container } = render(<LoadState loading={false} error={null} label="anything" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("StatusPill", () => {
  it("carries the explanation in the title so a status is self-describing", () => {
    const view = grantStatusView("exhausted");
    render(<StatusPill view={view} />);
    const pill = screen.getByText(view.label);
    expect(pill).toHaveAttribute("title", view.explanation);
  });
});
