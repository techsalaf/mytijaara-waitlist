import { apiCall } from "./client";
import {
  DEFAULT_LAUNCH_CONFIG,
  type LaunchConfiguration,
} from "@/lib/launch/config";

let cache: LaunchConfiguration = { ...DEFAULT_LAUNCH_CONFIG };

/**
 * Launch / countdown CMS endpoints.
 *
 * Backend contract:
 *   GET   /launch-config  -> { data: LaunchConfiguration }
 *   PATCH /launch-config  -> { data: LaunchConfiguration }
 *
 * Swap the `apiCall` bodies for real fetches; consumers stay untouched.
 */
export const launchApi = {
  get: () => apiCall("/launch-config", () => cache, { delay: 120 }),
  update: (patch: Partial<LaunchConfiguration>) =>
    apiCall("/launch-config", () => {
      cache = { ...cache, ...patch };
      return cache;
    }),
};
