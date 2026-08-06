import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { signIn } from "@/lib/auth";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Sign in — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  // Set once the backend answers the password with a 2FA challenge.
  const [challenge, setChallenge] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const attempt = async (withCode?: string) => {
    setLoading(true);
    try {
      const result = await signIn(email, password, withCode);
      if (result.twoFactorRequired) {
        setChallenge(result.message);
        return;
      }
      toast.success(`Welcome back, ${result.session.name.split(" ")[0]}!`);
      navigate({ to: "/admin" });
    } catch (err) {
      let message = err instanceof Error ? err.message : "Sign in failed. Check your credentials.";
      if (message === "Failed to fetch") {
        message = "Unable to reach the backend. Confirm the Laravel server is running and refresh the page.";
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (challenge) {
    return (
      <div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Two-factor authentication</h1>
        <p className="mt-1 text-sm text-muted-foreground">{challenge}</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void attempt(code.trim());
          }}
          className="mt-8 space-y-4"
        >
          <div>
            <Label htmlFor="code">Authentication code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1.5 font-mono tracking-[0.3em]"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Lost your device? Enter one of your recovery codes instead.
            </p>
          </div>
          <Button
            type="submit"
            disabled={loading || code.trim().length < 6}
            className="h-11 w-full bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…
              </>
            ) : (
              "Verify and sign in"
            )}
          </Button>
          <button
            type="button"
            onClick={() => {
              setChallenge(null);
              setCode("");
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Use a different account
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Sign in to your admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage the MyTijaara waitlist and launch experience.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void attempt();
        }}
        className="mt-8 space-y-4"
      >
        <div>
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" required autoComplete="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/auth/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative mt-1.5">
            <Input id="password" type={show ? "text" : "password"} required autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={loading} className="h-11 w-full bg-primary hover:bg-primary/90">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
