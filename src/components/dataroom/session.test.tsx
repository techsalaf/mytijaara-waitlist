/**
 * Gate tests for the visitor session provider.
 *
 * The provider is not an authorization layer, but it is the single place that
 * reacts to a dead session, and that concentration is only worth anything if it
 * behaves the same way for every route that leans on it. What is pinned here:
 * no token means straight back to the access screen, a 401 from any call means
 * the same, two concurrent 401s produce one exit rather than two, and a non-401
 * is handed back to the caller untouched.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

const me = vi.fn();
const logout = vi.fn();
const acknowledge = vi.fn();
const getDataRoomToken = vi.fn<() => string | null>();
const clearDataRoomToken = vi.fn();
vi.mock("@/lib/api/dataroom", () => ({
  dataRoomApi: {
    me: () => me(),
    logout: () => logout(),
    acknowledge: () => acknowledge(),
  },
  getDataRoomToken: () => getDataRoomToken(),
  clearDataRoomToken: () => clearDataRoomToken(),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m) },
}));

import { DataRoomSessionProvider, useDataRoomSession } from "./session";
import { ApiError } from "@/lib/api/client";
import type { DataRoomMe } from "@/lib/api/dataroom";

function visitor(overrides: Partial<DataRoomMe> = {}): DataRoomMe {
  return {
    name: "Aisha Bello",
    email: "aisha@example.com",
    organization: "Sahel Ventures",
    role: "Partner",
    expiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
    acknowledgedAt: "2026-08-20T10:00:00.000Z",
    session: {
      idleExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      absoluteExpiresAt: new Date(Date.now() + 8 * 3600_000).toISOString(),
      idleTimeoutMinutes: 30,
    },
    ...overrides,
  } as DataRoomMe;
}

/** Exposes the context so a test can fire `handleError` the way a screen would. */
function Probe({ onReady }: { onReady?: (state: ReturnType<typeof useDataRoomSession>) => void }) {
  const state = useDataRoomSession();
  onReady?.(state);
  return (
    <div>
      <span data-testid="email">{state.visitor?.email ?? "none"}</span>
      <span data-testid="loading">{String(state.loading)}</span>
      <button onClick={() => state.handleError(new ApiError("Session ended.", 401))}>
        fire 401
      </button>
      <button onClick={() => state.handleError(new ApiError("Forbidden.", 403))}>fire 403</button>
      <button onClick={() => void state.signOut()}>sign out</button>
    </div>
  );
}

beforeEach(() => {
  navigate.mockReset();
  me.mockReset();
  logout.mockReset().mockResolvedValue(undefined);
  acknowledge.mockReset().mockResolvedValue(undefined);
  clearDataRoomToken.mockReset();
  toastError.mockReset();
  toastSuccess.mockReset();
  getDataRoomToken.mockReset().mockReturnValue("visitor-token");
});

describe("DataRoomSessionProvider, no usable token", () => {
  it("goes back to the access screen without calling the API", async () => {
    getDataRoomToken.mockReturnValue(null);
    render(
      <DataRoomSessionProvider>
        <Probe />
      </DataRoomSessionProvider>,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/dataroom", replace: true }));
    expect(me).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Please sign in to continue.");
  });

  it("stops loading, so no screen sits on a spinner forever", async () => {
    getDataRoomToken.mockReturnValue(null);
    render(
      <DataRoomSessionProvider>
        <Probe />
      </DataRoomSessionProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
  });
});

describe("DataRoomSessionProvider, live session", () => {
  it("exposes the visitor once me() lands", async () => {
    me.mockResolvedValue(visitor());
    render(
      <DataRoomSessionProvider>
        <Probe />
      </DataRoomSessionProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("email")).toHaveTextContent("aisha@example.com"));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("clears the token and returns to the access screen when me() 401s", async () => {
    me.mockRejectedValue(new ApiError("Unauthorized.", 401));
    render(
      <DataRoomSessionProvider>
        <Probe />
      </DataRoomSessionProvider>,
    );

    await waitFor(() => expect(clearDataRoomToken).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith({ to: "/dataroom", replace: true });
    expect(toastError).toHaveBeenCalledWith(
      "Your data room session has ended. Please sign in again.",
    );
  });

  it("treats a server error on me() as a dead session rather than a blank workspace", async () => {
    me.mockRejectedValue(new ApiError("Server error.", 500));
    render(
      <DataRoomSessionProvider>
        <Probe />
      </DataRoomSessionProvider>,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/dataroom", replace: true }));
    expect(toastError).toHaveBeenCalledWith("Could not load your session. Please sign in again.");
  });
});

describe("handleError", () => {
  it("ends the session on a 401 and reports that it handled it", async () => {
    me.mockResolvedValue(visitor());
    let captured: ReturnType<typeof useDataRoomSession> | undefined;
    render(
      <DataRoomSessionProvider>
        <Probe onReady={(state) => (captured = state)} />
      </DataRoomSessionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("email")).toHaveTextContent("aisha@example.com"));

    expect(captured!.handleError(new ApiError("Session ended.", 401))).toBe(true);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/dataroom", replace: true }));
  });

  it("leaves a 403 to the caller, because a refused document is not a dead session", async () => {
    me.mockResolvedValue(visitor());
    let captured: ReturnType<typeof useDataRoomSession> | undefined;
    render(
      <DataRoomSessionProvider>
        <Probe onReady={(state) => (captured = state)} />
      </DataRoomSessionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("email")).toHaveTextContent("aisha@example.com"));

    expect(captured!.handleError(new ApiError("Forbidden.", 403))).toBe(false);

    expect(navigate).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("exits once when several calls 401 together", async () => {
    me.mockResolvedValue(visitor());
    render(
      <DataRoomSessionProvider>
        <Probe />
      </DataRoomSessionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("email")).toHaveTextContent("aisha@example.com"));

    const button = screen.getByRole("button", { name: "fire 401" });
    await userEvent.click(button);
    await userEvent.click(button);
    await userEvent.click(button);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it("shows the server's own message rather than inventing one", async () => {
    me.mockResolvedValue(visitor());
    let captured: ReturnType<typeof useDataRoomSession> | undefined;
    render(
      <DataRoomSessionProvider>
        <Probe onReady={(state) => (captured = state)} />
      </DataRoomSessionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("email")).toHaveTextContent("aisha@example.com"));

    captured!.handleError(new ApiError("Your access has been revoked.", 401));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Your access has been revoked."));
  });
});

describe("the absolute ceiling", () => {
  it("ends the session immediately when the ceiling has already passed", async () => {
    me.mockResolvedValue(
      visitor({
        session: {
          idleExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          absoluteExpiresAt: new Date(Date.now() - 1_000).toISOString(),
          idleTimeoutMinutes: 30,
        },
      }),
    );
    render(
      <DataRoomSessionProvider>
        <Probe />
      </DataRoomSessionProvider>,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/dataroom", replace: true }));
  });

  it("fires at the ceiling without waiting for a request to fail", async () => {
    vi.useFakeTimers();
    try {
      me.mockResolvedValue(
        visitor({
          session: {
            idleExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
            absoluteExpiresAt: new Date(Date.now() + 60_000).toISOString(),
            idleTimeoutMinutes: 30,
          },
        }),
      );
      render(
        <DataRoomSessionProvider>
          <Probe />
        </DataRoomSessionProvider>,
      );
      await vi.waitFor(() => expect(screen.getByTestId("email")).toHaveTextContent("aisha@"));
      expect(navigate).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(61_000);

      expect(navigate).toHaveBeenCalledWith({ to: "/dataroom", replace: true });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("the confidentiality acknowledgement", () => {
  it("appears when the server has no timestamp for this visitor", async () => {
    me.mockResolvedValue(visitor({ acknowledgedAt: null }));
    render(
      <DataRoomSessionProvider>
        <Probe />
      </DataRoomSessionProvider>,
    );

    expect(await screen.findByText("Before you continue")).toBeInTheDocument();
  });

  it("stays out of the way once the timestamp exists", async () => {
    me.mockResolvedValue(visitor());
    render(
      <DataRoomSessionProvider>
        <Probe />
      </DataRoomSessionProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("email")).toHaveTextContent("aisha@example.com"));
    expect(screen.queryByText("Before you continue")).not.toBeInTheDocument();
  });

  it("offers no close button and does not close on Escape", async () => {
    me.mockResolvedValue(visitor({ acknowledgedAt: null }));
    render(
      <DataRoomSessionProvider>
        <Probe />
      </DataRoomSessionProvider>,
    );
    await screen.findByText("Before you continue");

    await userEvent.keyboard("{Escape}");

    expect(screen.getByText("Before you continue")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
  });

  it("records the acknowledgement server-side and re-reads the session", async () => {
    me.mockResolvedValueOnce(visitor({ acknowledgedAt: null })).mockResolvedValue(visitor());
    render(
      <DataRoomSessionProvider>
        <Probe />
      </DataRoomSessionProvider>,
    );
    await screen.findByText("Before you continue");

    await userEvent.click(screen.getByRole("button", { name: /i understand, continue/i }));

    await waitFor(() => expect(acknowledge).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(me).toHaveBeenCalledTimes(2));
  });

  it("keeps the gate up when the acknowledgement could not be recorded", async () => {
    me.mockResolvedValue(visitor({ acknowledgedAt: null }));
    acknowledge.mockRejectedValue(new ApiError("Server error.", 500));
    render(
      <DataRoomSessionProvider>
        <Probe />
      </DataRoomSessionProvider>,
    );
    await screen.findByText("Before you continue");

    await userEvent.click(screen.getByRole("button", { name: /i understand, continue/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Could not record your acknowledgement. Please try again.",
      ),
    );
    expect(screen.getByText("Before you continue")).toBeInTheDocument();
  });
});

describe("signOut", () => {
  it("tells the server, then returns to the access screen", async () => {
    me.mockResolvedValue(visitor());
    render(
      <DataRoomSessionProvider>
        <Probe />
      </DataRoomSessionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("email")).toHaveTextContent("aisha@example.com"));

    await userEvent.click(screen.getByRole("button", { name: "sign out" }));

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(navigate).toHaveBeenCalledWith({ to: "/dataroom", replace: true });
    expect(toastSuccess).toHaveBeenCalledWith("You have been signed out.");
  });
});
