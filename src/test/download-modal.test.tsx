import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DownloadModal } from "../routes/download";

describe("DownloadModal component", () => {
  it("renders modal header, customer and store download choices with correct APK links", () => {
    const handleOpenChange = vi.fn();
    render(<DownloadModal open={true} onOpenChange={handleOpenChange} />);

    // Header copy
    expect(screen.getByText("Get MyTijaara")).toBeInTheDocument();
    expect(screen.getByText("What would you like to do?")).toBeInTheDocument();

    // Customer App Card
    expect(screen.getByText("Shop on MyTijaara")).toBeInTheDocument();
    expect(screen.getByText("Order food, groceries and more.")).toBeInTheDocument();
    const customerLink = screen.getByRole("link", { name: /Shop on MyTijaara/i });
    expect(customerLink).toHaveAttribute(
      "href",
      "https://dashboard.mytijaara.com/downloads/mytijaara-user.apk"
    );
    expect(customerLink).toHaveAttribute("download", "mytijaara-user.apk");

    // Store App Card
    expect(screen.getByText("Sell on MyTijaara")).toBeInTheDocument();
    expect(screen.getByText("Manage your store and orders.")).toBeInTheDocument();
    const storeLink = screen.getByRole("link", { name: /Sell on MyTijaara/i });
    expect(storeLink).toHaveAttribute(
      "href",
      "https://dashboard.mytijaara.com/downloads/mytijaara-store.apk"
    );
    expect(storeLink).toHaveAttribute("download", "mytijaara-store.apk");

    // Micro footer copy
    expect(screen.getByText(/Android APK/i)).toBeInTheDocument();
    expect(screen.getByText(/Official MyTijaara Release/i)).toBeInTheDocument();
    expect(screen.getByText(/Google Play version coming shortly/i)).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when 'Maybe later' is clicked", () => {
    const handleOpenChange = vi.fn();
    render(<DownloadModal open={true} onOpenChange={handleOpenChange} />);

    const dismissButton = screen.getByRole("button", { name: /Maybe later/i });
    fireEvent.click(dismissButton);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
