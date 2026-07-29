import { apiCall } from "./client";
import { DEFAULT_LAUNCH_CONFIG, type LaunchConfiguration } from "@/lib/launch/config";

let cache: LaunchConfiguration = { ...DEFAULT_LAUNCH_CONFIG };

/**
 * Launch / countdown CMS endpoints.
 *
 * Backend contract (Laravel):
 *   GET   /launch-config  -> { data: LaunchConfiguration }          (public)
 *   PATCH /launch-config  -> { data: LaunchConfiguration }            (admin)
 */
export const launchApi = {
  get: () => apiCall("/launch-config", () => cache, { delay: 120, public: true }),
  update: (patch: Partial<LaunchConfiguration>) =>
    apiCall(
      "/launch-config",
      () => {
        cache = { ...cache, ...patch };
        return cache;
      },
      { method: "PATCH", body: patch },
    ),
};
