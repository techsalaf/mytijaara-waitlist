import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mediaApi, type MediaFile } from "@/lib/api/media";
import { Image as ImageIcon, Loader2, Search, Upload, Check } from "lucide-react";
import { toast } from "sonner";

export function MediaPickerModal({
  open,
  onOpenChange,
  onSelect,
  title = "Select Image from Media Library",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  title?: string;
}) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const res = await mediaApi.list({ type: "image", search });
      setFiles(res.data || []);
    } catch {
      toast.error("Failed to load media library files.");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void loadMedia();
    }
  }, [open, search]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    setUploading(true);
    try {
      const res = await mediaApi.upload(file, "SEO", file.name);
      toast.success("Image uploaded to Media Library.");
      setSelectedUrl(res.data.url);
      await loadMedia();
    } catch {
      toast.error("Failed to upload image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirm = () => {
    if (selectedUrl) {
      onSelect(selectedUrl);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Choose an existing image from your Media Library or upload a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 my-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search media files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload new image
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px] border border-border/60 rounded-lg p-3">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading images…
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
              <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
              No images found in Media Library.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {files.map((file) => {
                const isSelected = selectedUrl === file.url;
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setSelectedUrl(file.url)}
                    className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all text-left bg-muted/20 ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 shadow-md"
                        : "border-border/60 hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={file.url}
                      alt={file.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white text-[11px] truncate">
                      {file.name}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded-full shadow">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="mt-2 flex items-center justify-between">
          <div className="text-xs text-muted-foreground max-w-xs truncate">
            {selectedUrl ? `Selected: ${selectedUrl}` : "No image selected"}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={!selectedUrl} onClick={handleConfirm}>
              Select Image
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
