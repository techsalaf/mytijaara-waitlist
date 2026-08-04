import { apiCall } from "./client";
import { toQuery } from "./waitlist";
import type { MediaFile } from "@/lib/types";

export type { MediaFile };

export type MediaListParams = {
  type?: "all" | "image" | "video" | "document";
  folder?: string;
  search?: string;
};

/**
 * Media library API. Files live on the `public` disk and are recorded in
 * `media_files`; `list` also returns `meta.folders` so the folder filter never
 * needs a second request.
 */
export const mediaApi = {
  list: (params?: MediaListParams) =>
    apiCall<MediaFile[]>(`/media${toQuery(params as Record<string, unknown>)}`),
  folders: () => apiCall<string[]>("/media/folders"),

  upload: (file: File, folder = "Uncategorized", alt?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    if (alt) fd.append("alt", alt);
    return apiCall<MediaFile>("/media", {
      method: "POST",
      formData: fd,
      timeoutMs: 120000, // a 20MB upload on a slow line
    });
  },

  update: (id: string, patch: { name?: string; folder?: string; alt?: string | null }) =>
    apiCall<MediaFile>(`/media/${id}`, { method: "PATCH", body: patch }),
  remove: (id: string) =>
    apiCall<{ deleted: boolean }>(`/media/${id}`, { method: "DELETE" }),
  createFolder: (name: string) =>
    apiCall<{ folders: string[] }>("/media/folders", { method: "POST", body: { name } }),
};
