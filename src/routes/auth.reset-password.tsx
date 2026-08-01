import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authApi } from "@/lib/api";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: ResetPage,
});

function requirements(pw: string) {
  return [
    { label: "At least 8 characters", ok: pw.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(pw) },
    { label: "One number", ok: /\d/.test(pw) },
    { label: "One special character", ok: /[^A-Za-z0-9]/.test(pw) },
  ];
}

function ResetPage() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const reqs = requirements(pw);
  const valid = reqs.every((r) => r.ok) && pw === pw2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    const params = new URLSearchParams(window.location.search);
    try {
      await authApi.resetPassword({
        email: params.get("email") ?? "",
        token: params.get("token") ?? "",
        password: pw,
        password_confirmation: pw2,
      });
      toast.success("Password updated. Please sign in.");
      navigate({ to: "/auth/login" });
    } catch {
      toast.error("This reset link is invalid or expired.");
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose a strong password you haven't used before.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="pw2">Confirm password</Label>
          <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="mt-1.5" />
        </div>
        <ul className="space-y-1 text-xs">
          {reqs.map((r) => (
            <li key={r.label} className={"flex items-center gap-2 " + (r.ok ? "text-emerald-700" : "text-muted-foreground")}>
              <span className={"grid h-4 w-4 place-items-center rounded-full " + (r.ok ? "bg-emerald-100" : "bg-muted")}>
                {r.ok && <Check className="h-3 w-3" />}
              </span>
              {r.label}
            </li>
          ))}
        </ul>
        <Button type="submit" disabled={!valid || loading} className="h-11 w-full bg-primary hover:bg-primary/90">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating…</> : "Update password"}
        </Button>
        <div className="text-center text-xs text-muted-foreground">
          Remember your password? <Link to="/auth/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
