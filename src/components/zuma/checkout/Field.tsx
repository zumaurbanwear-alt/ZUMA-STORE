export const Field = ({
  label, v, set, err, type = "text", placeholder, className = "",
}: {
  label: string; v: string; set: (v: string) => void; err?: string; type?: string; placeholder?: string; className?: string;
}) => (
  <label className={`flex flex-col gap-1.5 ${className}`}>
    <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">{label}</span>
    <input
      type={type}
      value={v}
      onChange={e => set(e.target.value)}
      placeholder={placeholder}
      className="bg-background border border-border px-3 py-2 text-[10px] text-foreground focus:border-primary outline-none transition-colors"
    />
    {err && <span className="text-[9px] text-destructive">{err}</span>}
  </label>
);
