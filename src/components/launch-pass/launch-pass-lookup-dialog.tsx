import { useState } from "react";
import { Search, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { launchPassApi } from "@/lib/api/launch-pass";
import type { WaitlistUser } from "@/lib/types";

export interface LaunchPassLookupDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: WaitlistUser) => void;
}

export function LaunchPassLookupDialog({
  open,
  onClose,
  onSuccess,
}: LaunchPassLookupDialogProps) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await launchPassApi.lookup(identifier.trim());
      toast.success(`Found your pass, ${res.data.name.split(" ")[0]}! 🎉`);
      onSuccess(res.data);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "We couldn't find a waitlist entry with that email or phone.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md rounded-3xl border-primary/20 bg-gradient-to-b from-card via-background to-card p-6 shadow-2xl">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-gold border border-gold/20 shadow-sm">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="font-display text-xl font-bold text-foreground">
            Find Your Launch Pass
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Already on the MyTijaara waitlist? Enter your email, phone number, or referral code to retrieve your pass.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5 text-left">
            <Label htmlFor="lookup-input" className="text-xs font-semibold text-foreground">
              Email, Phone or Referral Code
            </Label>
            <div className="relative">
              <Input
                id="lookup-input"
                type="text"
                placeholder="you@email.com or 080... or REF..."
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                className="h-10 text-sm pl-9"
                autoFocus
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="pt-2 sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !identifier.trim()}
              className="bg-gold text-slate-950 hover:bg-gold/90 font-bold text-xs h-9 px-4 gap-2"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Find My Pass
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
