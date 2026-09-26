import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PrivacyPolicyContent } from "../routes/privacy";

describe("PrivacyPolicyContent", () => {
  it("identifies the app and discloses its main data categories", () => {
    render(<PrivacyPolicyContent />);

    for (const heading of [
      "2. Personal data we collect",
      "3. How we use personal data",
      "5. When we share data",
      "7. Retention",
      "10. Security",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }

    expect(
      screen.getByText(/MyTijaara mobile application, website, waitlist/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Voice search:/)).toBeInTheDocument();
    expect(screen.getByText(/prescription files/i)).toBeInTheDocument();
    expect(screen.getByText(/push-notification token/i)).toBeInTheDocument();
  });

  it("offers in-app and external account deletion request instructions", () => {
    render(<PrivacyPolicyContent />);

    expect(
      screen.getByRole("heading", { name: "8. Account and data deletion" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/open your Profile, and choose the delete-account option/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/without signing in/i)).toBeInTheDocument();
    const deletionLink = screen
      .getAllByRole("link", { name: "privacy@mytijaara.com" })
      .find((link) => link.getAttribute("href")?.includes("subject=Request%20MyTijaara"));
    expect(deletionLink).toBeDefined();
    expect(screen.getByText(/active order, payment, refund, dispute/i)).toBeInTheDocument();
  });

  it("does not claim unverified certifications or technical and retention guarantees", () => {
    render(<PrivacyPolicyContent />);

    expect(screen.queryByText(/NDPR 2019 Compliant/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AES-256|bcrypt|6 years|24 months/i)).not.toBeInTheDocument();
  });
});
