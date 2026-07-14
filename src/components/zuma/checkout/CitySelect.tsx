import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { CITY_SUGGESTIONS } from "@/lib/shipping";

const normalizeForSearch = (s: string): string =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export const CitySelect = ({
  label, v, set, err, placeholder, className = "",
}: {
  label: string; v: string; set: (v: string) => void; err?: string; placeholder?: string; className?: string;
}) => {
  const { t } = useLang();
  const [query, setQuery] = useState(v);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim() === ""
    ? CITY_SUGGESTIONS
    : CITY_SUGGESTIONS.filter(c => normalizeForSearch(c).startsWith(normalizeForSearch(query)));

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectCity = (c: string) => {
    setQuery(c);
    set(c);
    setOpen(false);
  };

  const onChange = (val: string) => {
    setQuery(val);
    set(val);
    setOpen(true);
    setHighlighted(0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted]) selectCity(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 relative ${className}`} ref={wrapperRef}>
      <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-background border border-border px-3 py-2 text-[10px] text-foreground focus:border-primary outline-none transition-colors pr-8"
        />
        <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        {open && (
          <ul className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-card border border-border">
            {filtered.length > 0 ? filtered.map((c, i) => (
              <li
                key={c}
                onMouseDown={() => selectCity(c)}
                onMouseEnter={() => setHighlighted(i)}
                className={`px-3 py-2 text-[10px] tracking-[0.05em] cursor-pointer transition-colors ${
                  i === highlighted ? "bg-primary text-primary-foreground" : "text-foreground"
                }`}
              >
                {c}
              </li>
            )) : (
              <li className="px-3 py-2 text-[10px] tracking-[0.05em] text-muted-foreground">
                {t("noCityMatch")}
              </li>
            )}
          </ul>
        )}
      </div>
      {err && <span className="text-[9px] text-destructive">{err}</span>}
    </div>
  );
};
