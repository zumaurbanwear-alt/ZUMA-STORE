export const TextureBand = ({ label, right, ghost }: { label: string; right: string; ghost: string }) => (
  <div
    className="w-full relative overflow-hidden border-y border-border reveal"
    style={{ height: "clamp(140px,22vw,320px)", background: "linear-gradient(135deg,#DADADA 0%,#c8c8c8 30%,#DADADA 60%,hsl(var(--primary-dim)) 100%)" }}
  >
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display whitespace-nowrap leading-none pointer-events-none"
      style={{ color: "hsl(var(--primary) / 0.12)", fontSize: "clamp(80px,18vw,240px)", letterSpacing: "0.05em" }}
    >
      {ghost}
    </div>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10">
      <div className="absolute left-1/2 w-px h-full bg-primary-dim" />
      <div className="absolute top-1/2 h-px w-full bg-primary-dim" />
    </div>
    <div className="absolute bottom-5 left-6 md:left-10 text-[7px] tracking-[0.24em] uppercase text-primary-hi z-10">{label}</div>
    <div className="absolute bottom-5 right-6 md:right-10 text-[7px] tracking-[0.24em] uppercase text-muted-foreground z-10">{right}</div>
  </div>
);
