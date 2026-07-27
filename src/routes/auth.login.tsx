import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-mock";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Sign in — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("adaeze@mytijaara.com");
  const [password, setPassword] = useState("demo1234");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      signIn(email, password);
      toast.success("Welcome back, Adaeze!");
      navigate({ to: "/admin" });
    }, 700);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Sign in to your admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage the MyTijaara waitlist and launch experience.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/auth/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative mt-1.5">
            <Input id="password" type={show ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox defaultChecked /> <span>Keep me signed in for 30 days</span>
        </label>
        <Button type="submit" disabled={loading} className="h-11 w-full bg-primary hover:bg-primary/90">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
        </Button>
        <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Demo mode:</strong> any credentials sign you in as the demo Super Admin.
        </div>
      </form>
    </div>
  );
}
