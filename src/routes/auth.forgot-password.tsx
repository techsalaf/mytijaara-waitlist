import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setSent(true); setLoading(false); }, 700);
  };

  if (sent) {
    return (
      <div>
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Check your inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We've sent a password reset link to <strong>{email}</strong>. The link expires in 30 minutes.
        </p>
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link to="/auth/login"><ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Link to="/auth/login" className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to sign in
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Forgot your password?</h1>
      <p className="mt-1 text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mytijaara.com" className="mt-1.5" />
        </div>
        <Button type="submit" disabled={loading} className="h-11 w-full bg-primary hover:bg-primary/90">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</> : "Send reset link"}
        </Button>
      </form>
    </div>
  );
}
