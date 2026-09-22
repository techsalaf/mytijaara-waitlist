import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CARD_DIMENSIONS,
  getShareText,
  getWhatsAppShareUrl,
  renderLaunchPassToCanvas,
  shareLaunchPass,
} from "@/lib/launch-pass/canvas-renderer";
import { LaunchPassModal } from "@/components/launch-pass/launch-pass-modal";
import { LaunchPassLookupDialog } from "@/components/launch-pass/launch-pass-lookup-dialog";
import { PostSignupModal } from "@/components/landing/post-signup-modal";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { launchPassApi } from "@/lib/api/launch-pass";
import { DEFAULT_LAUNCH_PASS_CMS, type LaunchPassData } from "@/lib/types/launch-pass";
import { LaunchStateProvider } from "@/components/launch/launch-state-provider";
import { DEFAULT_LAUNCH_CONFIG } from "@/lib/launch/config";

// Mock launchPassApi
vi.mock("@/lib/api/launch-pass", () => ({
  launchPassApi: {
    get: vi.fn(),
    lookup: vi.fn(),
    updatePreference: vi.fn().mockResolvedValue({ data: { attending_natcon: true } }),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Launch Pass Feature Suite", () => {
  const samplePassData: LaunchPassData = {
    name: "Rasheed Techsalaf",
    firstName: "Rasheed",
    city: "Abuja",
    role: "vendor",
    launchPassNumber: "#00042",
    launchPassToken: "test-token-abcdef123456",
    referralCode: "RASHEED42",
    attendingNatcon: false,
    position: 42,
    joinedAt: "2026-09-22T10:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Canvas Renderer & Share Text Utilities", () => {
    it("exports correct high-res social card dimensions", () => {
      expect(CARD_DIMENSIONS.feed).toEqual({ width: 1080, height: 1350 });
      expect(CARD_DIMENSIONS.story).toEqual({ width: 1080, height: 1920 });
    });

    it("generates correct sharing text for General member (Variant A)", () => {
      const url = "https://mytijaara.com/launch-pass/test-token";
      const text = getShareText(
        { ...samplePassData, attendingNatcon: false },
        DEFAULT_LAUNCH_PASS_CMS,
        url,
      );

      expect(text).toContain(DEFAULT_LAUNCH_PASS_CMS.sharingMessage);
      expect(text).toContain(url);
    });

    it("generates correct sharing text for NATCON Attendee (Variant B)", () => {
      const url = "https://mytijaara.com/launch-pass/test-token";
      const text = getShareText(
        { ...samplePassData, attendingNatcon: true },
        DEFAULT_LAUNCH_PASS_CMS,
        url,
      );

      expect(text).toContain(DEFAULT_LAUNCH_PASS_CMS.sharingMessageAttendee);
      expect(text).toContain(url);
    });

    it("builds a direct WhatsApp share URL containing the message", () => {
      const url = "https://mytijaara.com/launch-pass/test-token";
      const waUrl = getWhatsAppShareUrl(samplePassData, DEFAULT_LAUNCH_PASS_CMS, url);
      expect(waUrl.startsWith("https://wa.me/?text=")).toBe(true);
      expect(decodeURIComponent(waUrl)).toContain(DEFAULT_LAUNCH_PASS_CMS.sharingMessage);
      expect(decodeURIComponent(waUrl)).toContain(url);
    });

    it("renders to canvas without throwing", async () => {
      const canvas = document.createElement("canvas");
      // Stub canvas 2d context for jsdom
      const mockContext = {
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arcTo: vi.fn(),
        arc: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 120 })),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
      };
      vi.spyOn(canvas, "getContext").mockReturnValue(mockContext as unknown as CanvasRenderingContext2D);

      await expect(
        renderLaunchPassToCanvas(canvas, {
          data: samplePassData,
          cms: DEFAULT_LAUNCH_PASS_CMS,
          format: "feed",
          launchStatus: "pre_launch",
          shareUrl: "https://mytijaara.com/launch-pass/test-token",
        }),
      ).resolves.not.toThrow();

      expect(canvas.width).toBe(1080);
      expect(canvas.height).toBe(1350);
    });

    it("uses navigator.share when available in shareLaunchPass", async () => {
      const canvas = document.createElement("canvas");
      canvas.toBlob = vi.fn((cb) => {
        cb(new Blob(["test"], { type: "image/png" }));
      });

      const mockShare = vi.fn().mockResolvedValue(undefined);
      const mockCanShare = vi.fn().mockReturnValue(true);

      Object.defineProperty(navigator, "share", { value: mockShare, configurable: true });
      Object.defineProperty(navigator, "canShare", { value: mockCanShare, configurable: true });

      const res = await shareLaunchPass({
        canvas,
        title: "My Launch Pass",
        text: "Join the launch!",
        url: "https://mytijaara.com",
      });

      expect(res.shared).toBe(true);
      expect(res.method).toBe("native");
      expect(mockShare).toHaveBeenCalled();
    });
  });

  describe("LaunchPassModal Component", () => {
    it("renders modal with campaign title and attendee controls", () => {
      render(
        <LaunchStateProvider initialConfig={DEFAULT_LAUNCH_CONFIG} initialNow={Date.now()}>
          <LaunchPassModal
            open={true}
            onClose={vi.fn()}
            entry={samplePassData}
            cms={DEFAULT_LAUNCH_PASS_CMS}
          />
        </LaunchStateProvider>,
      );

      expect(screen.getByText(DEFAULT_LAUNCH_PASS_CMS.campaignTitle)).toBeInTheDocument();
      expect(
        screen.getByText(`Will you be at ${DEFAULT_LAUNCH_PASS_CMS.eventName}?`),
      ).toBeInTheDocument();
      expect(screen.getByText("Yes — I'll be there LIVE")).toBeInTheDocument();
      expect(screen.getByText("No — Following the launch online")).toBeInTheDocument();
    });

    it("updates NATCON attendance preference when radio is selected", async () => {
      const user = userEvent.setup();

      render(
        <LaunchStateProvider initialConfig={DEFAULT_LAUNCH_CONFIG} initialNow={Date.now()}>
          <LaunchPassModal
            open={true}
            onClose={vi.fn()}
            entry={{ ...samplePassData, publicId: "entry-uuid-123" }}
            cms={DEFAULT_LAUNCH_PASS_CMS}
          />
        </LaunchStateProvider>,
      );

      const yesRadio = screen.getByLabelText(/Yes — I'll be there LIVE/i);
      await user.click(yesRadio);

      await waitFor(() => {
        expect(launchPassApi.updatePreference).toHaveBeenCalledWith("entry-uuid-123", true);
      });
    });

    it("allows switching between Feed (4:5) and Story (9:16) format tabs", async () => {
      const user = userEvent.setup();

      render(
        <LaunchStateProvider initialConfig={DEFAULT_LAUNCH_CONFIG} initialNow={Date.now()}>
          <LaunchPassModal
            open={true}
            onClose={vi.fn()}
            entry={samplePassData}
            cms={DEFAULT_LAUNCH_PASS_CMS}
          />
        </LaunchStateProvider>,
      );

      const storyTab = screen.getByRole("tab", { name: /Story \(9:16\)/i });
      expect(storyTab).toBeInTheDocument();
      await user.click(storyTab);
      expect(storyTab).toHaveAttribute("data-state", "active");
    });
  });

  describe("LaunchPassLookupDialog Component", () => {
    it("submits search identifier and calls onSuccess when entry is found", async () => {
      const user = userEvent.setup();
      const onSuccessMock = vi.fn();
      const onCloseMock = vi.fn();

      vi.mocked(launchPassApi.lookup).mockResolvedValueOnce({
        data: {
          id: "entry-123",
          name: "Rasheed Test",
          email: "rasheed@example.com",
          phone: "08012345678",
          city: "Abuja",
          state: "FCT",
          status: "active",
          verified: true,
          referrals: 5,
          source: "organic",
          device: "Web",
          tags: [],
          joinedAt: "2026-09-22T10:00:00Z",
          lastActive: "2026-09-22T10:00:00Z",
          position: 12,
          launchPassToken: "token-123",
        },
      });

      render(
        <LaunchPassLookupDialog
          open={true}
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />,
      );

      const input = screen.getByPlaceholderText(/you@email.com or 080.../i);
      await user.type(input, "rasheed@example.com");

      const submitBtn = screen.getByRole("button", { name: /Find My Pass/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(launchPassApi.lookup).toHaveBeenCalledWith("rasheed@example.com");
        expect(onSuccessMock).toHaveBeenCalled();
        expect(onCloseMock).toHaveBeenCalled();
      });
    });

    it("displays error message if lookup fails", async () => {
      const user = userEvent.setup();

      vi.mocked(launchPassApi.lookup).mockRejectedValueOnce(
        new Error("We couldn't find a waitlist entry with that email or phone."),
      );

      render(
        <LaunchPassLookupDialog
          open={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );

      const input = screen.getByPlaceholderText(/you@email.com or 080.../i);
      await user.type(input, "unknown@example.com");

      const submitBtn = screen.getByRole("button", { name: /Find My Pass/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText("We couldn't find a waitlist entry with that email or phone."),
        ).toBeInTheDocument();
      });
    });
  });

  describe("PostSignupModal Integration", () => {
    it("renders Launch Pass ready banner with button to view pass", () => {
      render(
        <LaunchStateProvider initialConfig={DEFAULT_LAUNCH_CONFIG} initialNow={Date.now()}>
          <PostSignupModal
            open={true}
            onClose={vi.fn()}
            data={{
              publicId: "entry-1",
              name: "Rasheed Techsalaf",
              email: "rasheed@test.com",
              city: "Abuja",
              role: "vendor",
              position: 42,
              launchPassNumber: "#00042",
              launchPassToken: "pass-token-42",
              attendingNatcon: false,
            }}
          />
        </LaunchStateProvider>,
      );

      expect(screen.getByText("Your Official Launch Pass is Ready!")).toBeInTheDocument();
      expect(screen.getByText("#00042")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /View & Share Launch Pass/i }),
      ).toBeInTheDocument();
    });

    it("notifies onPreferenceChange when attendee choice is toggled", async () => {
      const user = userEvent.setup();
      const onPrefSpy = vi.fn();
      render(
        <LaunchStateProvider initialConfig={DEFAULT_LAUNCH_CONFIG} initialNow={Date.now()}>
          <LaunchPassModal
            open={true}
            onClose={vi.fn()}
            entry={{
              publicId: "entry-99",
              name: "Zainab Ali",
              city: "Kano",
              launchPassToken: "token-99",
              attendingNatcon: false,
            }}
            onPreferenceChange={onPrefSpy}
          />
        </LaunchStateProvider>,
      );

      const yesRadio = screen.getByLabelText(/Yes — I'll be there LIVE/i);
      await user.click(yesRadio);

      expect(onPrefSpy).toHaveBeenCalledWith(true);
    });
  });

  describe("WaitlistForm Retrieve Pass Integration", () => {
    it("displays Already joined retrieve pass button", () => {
      render(
        <LaunchStateProvider initialConfig={DEFAULT_LAUNCH_CONFIG} initialNow={Date.now()}>
          <WaitlistForm />
        </LaunchStateProvider>,
      );

      expect(
        screen.getByRole("button", { name: /Already joined\? Retrieve your Launch Pass/i }),
      ).toBeInTheDocument();
    });
  });
});
