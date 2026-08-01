import { apiCall } from "./client";
import { mediaFiles } from "@/lib/mock-data";

export type MediaFile = (typeof mediaFiles)[number];

/**
 * Media library API.
 *
 *   GET    /media          -> { data: MediaFile[], meta: { folders } }
 *   GET    /media/folders  -> { data: string[] }
 *   POST   /media          -> { data: MediaFile }   (multipart upload)
 *   POST   /media/folders  -> { data: { folder } }
 *   PATCH  /media/:id       -> { data: MediaFile }
 *   DELETE /media/:id       -> { data: { deleted } }
 */
export const mediaApi = {
  list: (params?: { type?: string; folder?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.type && params.type !== "all") q.set("type", params.type);
    if (params?.folder && params.folder !== "all") q.set("folder", params.folder);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return apiCall(`/media${qs ? `?${qs}` : ""}`, () => mediaFiles);
  },
  folders: () =>
    apiCall("/media/folders", () => Array.from(new Set(mediaFiles.map((m) => m.folder)))),
  upload: (file: File, folder = "Uncategorized") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    return apiCall(
      "/media",
      () =>
        ({
          id: `media_${Date.now()}`,
          name: file.name,
          type: file.type.startsWith("image/") ? "image" : "document",
          size: Math.round(file.size / 1024),
          folder,
          uploadedAt: new Date().toISOString(),
          dimensions: "",
          url: URL.createObjectURL(file),
        }) as MediaFile,
      { method: "POST", formData: fd },
    );
  },
  update: (id: string, patch: Partial<MediaFile>) =>
    apiCall(`/media/${id}`, () => ({ ...mediaFiles.find((m) => m.id === id)!, ...patch }), {
      method: "PATCH",
      body: patch,
    }),
  remove: (id: string) => apiCall(`/media/${id}`, () => ({ deleted: true }), { method: "DELETE" }),
  createFolder: (name: string) =>
    apiCall("/media/folders", () => ({ folder: name }), { method: "POST", body: { name } }),
};
