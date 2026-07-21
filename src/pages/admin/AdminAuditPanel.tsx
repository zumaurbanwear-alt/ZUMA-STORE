import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AuditRow = {
  id: string;
  actor_email: string | null;
  table_name: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

const actionCls: Record<AuditRow["action"], string> = {
  INSERT: "text-emerald-500",
  UPDATE: "text-amber-500",
  DELETE: "text-red-500",
};

// Only shows the fields that actually changed between old_data and new_data,
// so an UPDATE row doesn't dump the entire product/order object.
const diffKeys = (row: AuditRow) => {
  if (row.action === "INSERT") return Object.keys(row.new_data ?? {});
  if (row.action === "DELETE") return Object.keys(row.old_data ?? {});
  const a = row.old_data ?? {};
  const b = row.new_data ?? {};
  return Object.keys(b).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
};

export const AdminAuditPanel = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!error && data) setRows(data as AuditRow[]);
    setLoading(false);
    setLoaded(true);
  };

  // Loaded lazily the first time the section is expanded, so a collapsed
  // panel doesn't cost a query on every admin page load.
  useEffect(() => { if (expanded) load(); }, [expanded, limit]);

  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 font-display text-lg tracking-[0.25em] hover:text-primary-hi"
        >
          {expanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
          AUDIT LOG {loaded ? `(${rows.length})` : ""}
        </button>
        {expanded && (
          <button onClick={load} className="px-4 py-2 border border-border text-[10px] tracking-[0.22em] uppercase text-muted-foreground hover:text-primary-hi">
            Refresh
          </button>
        )}
      </div>

      {!expanded ? null : loading && !loaded ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No changes recorded yet.</p>
      ) : (
        <div className="border border-border divide-y divide-border">
          {rows.map((row) => {
            const open = openId === row.id;
            const keys = diffKeys(row);
            return (
              <div key={row.id}>
                <button
                  onClick={() => setOpenId(open ? null : row.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-card"
                >
                  {open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                  <span className={`text-[10px] tracking-[0.18em] uppercase font-medium w-16 shrink-0 ${actionCls[row.action]}`}>
                    {row.action}
                  </span>
                  <span className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground w-24 shrink-0">
                    {row.table_name}
                  </span>
                  <span className="text-xs text-foreground truncate flex-1">
                    {row.actor_email ?? "guest / system"}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(row.created_at).toLocaleString()}
                  </span>
                </button>
                {open && (
                  <div className="px-4 pb-4 pl-10 text-xs space-y-1 font-mono">
                    <div className="text-muted-foreground">record: {row.record_id}</div>
                    {keys.length === 0 ? (
                      <div className="text-muted-foreground">no field changes</div>
                    ) : (
                      keys.map((k) => (
                        <div key={k} className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">{k}:</span>
                          {row.action === "UPDATE" ? (
                            <span className="truncate">
                              <span className="text-red-500 line-through mr-1">{JSON.stringify(row.old_data?.[k])}</span>
                              <span className="text-emerald-500">{JSON.stringify(row.new_data?.[k])}</span>
                            </span>
                          ) : (
                            <span className="truncate">{JSON.stringify((row.new_data ?? row.old_data)?.[k])}</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {expanded && rows.length >= limit && (
        <button onClick={() => setLimit((l) => l + 50)} className="mt-3 text-[10px] tracking-[0.18em] uppercase text-muted-foreground hover:text-primary-hi">
          Load more
        </button>
      )}
    </section>
  );
};
