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
}: AdminOrdersPickupsSectionProps) => (
  <section className="mb-12">
    <h2 className="font-display text-base tracking-[0.2em] mb-3">
      SENDIT PICKUPS ({pickups.length})
    </h2>

    <div className="border border-border divide-y">
      {pickups.map((p) => {
        const isExpanded = expandedPickups.has(p.code);

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
                <div className="text-xs mt-1.5">
                  {p.orders.map((o) => o.customer_name).join(", ")}
                </div>
              ) : (
                <button
                  onClick={() => onTogglePickup(p.code)}
                  className="text-[9px] text-muted-foreground underline mt-1.5"
                >
                  + détails
                </button>
              )}
            </div>

            <div className="text-right">
              <div className="text-[8px] uppercase text-muted-foreground">STATUS</div>
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

              {isExpanded && (
                <button
                  onClick={() => onTogglePickup(p.code)}
                  className="text-[9px] text-muted-foreground underline mt-1.5 block ml-auto"
                >
                  réduire
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </section>
);
