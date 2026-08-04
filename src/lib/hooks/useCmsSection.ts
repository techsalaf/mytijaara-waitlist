import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cmsApi } from "@/lib/api";

export type CmsSectionResponse<T> = {
  enabled: boolean;
  published: boolean;
  title: string;
  data: T;
};

export function useCmsSection<T extends Record<string, unknown>>(slug: string, initialData: T) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(initialData);
  const [enabled, setEnabled] = useState(true);
  const [published, setPublished] = useState(true);
  const [title, setTitle] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const response = await cmsApi.section(slug);
      const section = response.data as CmsSectionResponse<T>;
      setTitle(section.title ?? "");
      setEnabled(Boolean(section.enabled ?? true));
      setPublished(Boolean(section.published ?? true));
      setData((section.data ?? initialData) as T);
    } catch {
      toast.error("Unable to load CMS section");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [slug]);

  const save = async () => {
    setSaving(true);
    try {
      await cmsApi.updateSection(slug, { data, enabled, published });
      toast.success("Changes saved");
    } catch {
      toast.error("Unable to save section");
    } finally {
      setSaving(false);
    }
  };

  return {
    data,
    setData,
    enabled,
    setEnabled,
    published,
    setPublished,
    title,
    loading,
    saving,
    refresh,
    save,
  };
}
