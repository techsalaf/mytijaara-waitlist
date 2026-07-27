export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-primary-gradient shadow-soft">
        <span className="font-display text-lg font-bold text-primary-foreground">M</span>
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gold-gradient ring-2 ring-background" />
      </div>
      <span className="font-display text-xl font-bold tracking-tight">MyTijaara</span>
    </div>
  );
}
