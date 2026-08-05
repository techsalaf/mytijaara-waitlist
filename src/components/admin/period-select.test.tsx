import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PeriodSelect } from "./period-select";

describe("PeriodSelect", () => {
  it("shows the current window on the trigger", () => {
    render(<PeriodSelect value={90} onChange={() => {}} />);
    expect(screen.getByLabelText("Reporting period")).toHaveTextContent("Last 90 days");
  });

  it("shows the all-time window without a day count", () => {
    render(<PeriodSelect value={0} onChange={() => {}} />);
    expect(screen.getByLabelText("Reporting period")).toHaveTextContent("All time");
  });

  /**
   * The regression: the old control was a button flipping 30 <-> 7, so the 90-day
   * and all-time windows the backend already served were unreachable.
   */
  it("offers all four windows the backend accepts", async () => {
    render(<PeriodSelect value={30} onChange={() => {}} />);
    await userEvent.click(screen.getByLabelText("Reporting period"));

    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    const labels = screen.getAllByRole("option").map((o) => o.textContent);
    expect(labels).toEqual(["Last 7 days", "Last 30 days", "Last 90 days", "All time"]);
  });

  it("reports the picked window as a number, not a string", async () => {
    const onChange = vi.fn();
    render(<PeriodSelect value={30} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText("Reporting period"));
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("option", { name: "Last 90 days" }));

    expect(onChange).toHaveBeenCalledWith(90);
  });

  it("reports all time as 0", async () => {
    const onChange = vi.fn();
    render(<PeriodSelect value={7} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText("Reporting period"));
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("option", { name: "All time" }));

    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("cannot be changed while a refresh is in flight", async () => {
    const onChange = vi.fn();
    render(<PeriodSelect value={30} onChange={onChange} disabled />);

    const trigger = screen.getByLabelText("Reporting period");
    expect(trigger).toBeDisabled();
    await userEvent.click(trigger);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
