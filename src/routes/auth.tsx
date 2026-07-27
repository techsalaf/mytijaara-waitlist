import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-primary-gradient lg:block">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, rgba(212,160,23,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15), transparent 40%)",
        }} />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold">MyTijaara</div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-gold">Admin</div>
            </div>
          </Link>
          <div>
            <blockquote className="max-w-md text-2xl font-semibold leading-tight tracking-tight">
              "Everything Nigerians need in one place — and one control panel to run it all."
            </blockquote>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gold text-sm font-bold text-primary">
                AO
              </div>
              <div>
                <div className="text-sm font-medium">Adaeze Okafor</div>
                <div className="text-xs text-white/70">Head of Product, MyTijaara</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
