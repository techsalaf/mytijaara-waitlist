import { apiCall } from "./client";
import { normalizeLaunchConfig, type LaunchConfiguration } from "@/lib/launch/config";

/**
 * Launch / countdown CMS endpoints.
 *
 * Backend contract (Laravel):
 *   GET   /launch-config  -> { data: LaunchConfiguration }          (public)
 *   PATCH /launch-config  -> { data: LaunchConfiguration }            (admin)
 *
 * Both responses go through `normalizeLaunchConfig` because the backend
 * deep-merges PATCH bodies and returns whatever the row holds, which can be a
 * partial object missing most keys.
 */
export const launchApi = {
  get: async (): Promise<LaunchConfiguration> => {
    const res = await apiCall<unknown>("/launch-config", { public: true });
    return normalizeLaunchConfig(res.data);
  },
  update: async (patch: Partial<LaunchConfiguration>): Promise<LaunchConfiguration> => {
    const res = await apiCall<unknown>("/launch-config", { method: "PATCH", body: patch });
    return normalizeLaunchConfig(res.data);
  },
};
