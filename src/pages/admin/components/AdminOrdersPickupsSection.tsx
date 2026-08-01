import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { StatusDot } from "../orders/StatusDot";
import { translateStatus } from "../orders/orderStatus";
import type { AdminPickup } from "../orders/types";

type AdminOrdersPickupsSectionProps = {
  pickups: AdminPickup[];
  expandedPickups: Set<string>;
  onTogglePickup: (code: string) => void;
};

export const AdminOrdersPickupsSection = ({
  pickups,
  expandedPickups,
  onTogglePickup,
}: AdminOrdersPickupsSectionProps) => {
  const [sectionExpanded, setSectionExpanded] = useState(false);

  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setSectionExpanded((e) => !e)}
          className="flex items-center gap-2 font-display text-lg tracking-[0.25em] hover:text-primary-hi"
        >
          {sectionExpanded ? (
            <ChevronDown className="w-4 h-4 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0" />
          )}
          SENDIT PICKUPS ({pickups.length})
        </button>
      </div>

      {sectionExpanded && (
        <div className="border border-border divide-y">
          {pickups.map((p) => {
        const isExpanded = expandedPickups.has(p.code);

        const allDelivered =
          p.orders.length > 0 &&
          p.orders.every((o) => o.shipping_status === "DELIVERED");

        if (allDelivered && !isExpanded) {
          return (
            <div
              key={p.code}
              className="p-3 flex items-center justify-between cursor-pointer"
              onClick={() => onTogglePickup(p.code)}
            >
              <div className="text-xs font-display tracking-[0.1em]">
                {p.code}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.05em] text-emerald-500 font-medium">
                  Tous les colis livrés
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePickup(p.code);
                  }}
                  className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary-hi"
                >
                  <ChevronRight className="w-3 h-3 shrink-0" />
                  détails
                </button>
              </div>
            </div>
          );
        }

        return (
          <div key={p.code} className="p-3 flex justify-between">
            <div>
              <div className="text-[8px] uppercase text-muted-foreground">PICKUP</div>
              <div className="text-xs font-display tracking-[0.1em]">{p.code}</div>

              <div className="text-[8px] uppercase text-muted-foreground mt-1.5">TRACKING</div>
              <div className="text-xs font-display">
                {p.orders.map((o) => o.tracking_number).join(", ")}
              </div>

              {isExpanded ? (
                <div className="mt-1.5 space-y-1.5">
                  {allDelivered && (
                    <span className="inline-block text-[10px] uppercase tracking-[0.05em] text-emerald-500 font-medium mb-1">
                      Tous les colis livrés
                    </span>
                  )}
                  {p.orders.map((o) => (
                    <div
                      key={o.tracking_number}
                      className="flex items-center justify-between gap-2 border-t border-border/60 pt-1.5 first:border-t-0 first:pt-0"
                    >
                      <div>
                        <div className="text-xs">{o.customer_name}</div>
                        <div className="text-[9px] text-muted-foreground font-display">
                          {o.tracking_number}
                        </div>
                      </div>
                      <div className="text-[10px] uppercase flex items-center gap-1 shrink-0">
                        {translateStatus(o.shipping_status ?? "pending")}
                        <StatusDot status={o.shipping_status ?? "pending"} />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => onTogglePickup(p.code)}
                    className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary-hi mt-1.5"
                  >
                    <ChevronDown className="w-3 h-3 shrink-0" />
                    réduire
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onTogglePickup(p.code)}
                  className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary-hi mt-1.5"
                >
                  <ChevronRight className="w-3 h-3 shrink-0" />
                  détails
                </button>
              )}
            </div>

            <div className="text-right">
              <div className="text-[8px] uppercase text-muted-foreground">RAMASSAGE</div>
              <div className="text-xs uppercase flex items-center justify-end gap-1.5">
                {translateStatus(p.status)}
                <StatusDot status={p.status} />
              </div>

              <div className="text-[8px] uppercase text-muted-foreground mt-1.5">COLIS</div>
              <div className="text-xs">{p.orders.length}</div>

              <div className="text-[8px] uppercase text-muted-foreground mt-1.5">TOTAL</div>
              <div className="text-xs">{p.total} MAD</div>

              <div className="text-[10px] mt-1.5">
                {new Date(p.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        );
      })}
        </div>
      )}
    </section>
  );
};
