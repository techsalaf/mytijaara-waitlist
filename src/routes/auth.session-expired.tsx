import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/session-expired")({
  head: () => ({ meta: [{ title: "Session expired — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold/15 text-gold-foreground">
        <Clock className="h-6 w-6" />
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">Your session expired</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        For your security, we signed you out after a period of inactivity. Please sign in again to continue.
      </p>
      <Button asChild className="mt-6 h-11 w-full bg-primary hover:bg-primary/90">
        <Link to="/auth/login"><LogIn className="mr-2 h-4 w-4" /> Sign in again</Link>
      </Button>
    </div>
  ),
});
