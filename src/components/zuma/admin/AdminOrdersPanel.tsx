import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Order, OrderItem, LedgerRow } from "@/types/order";

export const AdminOrdersPanel = ({ isAdmin }: { isAdmin: boolean }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [unified, setUnified] = useState<LedgerRow[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setOrders((data as Order[]) ?? []));
    // "admin_orders_full" as any: hand-written view not present in the generated
    // Database types — the response itself is fully typed via LedgerRow above.
    supabase.from("admin_orders_full" as any).select("*").limit(200)
      .then((res) => setUnified((res.data as LedgerRow[]) ?? []));
  }, [isAdmin]);

  return (
    <>
      <section className="mb-12">
        <h2 className="font-display text-lg tracking-[0.25em] mb-4">RECENT ORDERS ({orders.length})</h2>
        <div className="border border-border divide-y divide-border">
          {orders.length === 0 && <p className="p-6 text-xs text-muted-foreground text-center">No orders yet.</p>}
          {orders.map(o => (
            <div key={o.id} className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              <div className="text-primary-hi font-display tracking-[0.2em]">#{o.display_id ?? "—"}</div>
              <div>
                <div className="text-foreground">{o.customer_name}</div>
                <div className="text-muted-foreground">{o.customer_phone}</div>
              </div>
              <div className="text-muted-foreground">{o.customer_email}<br/>{o.customer_city}</div>
              <div className="text-muted-foreground">
                {(o.order_items ?? []).map((i: OrderItem) => `${i.product_name} ×${i.quantity}`).join(", ")}
              </div>
              <div className="text-right">
                <div className="text-primary-hi">{o.total} MAD</div>
                <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground">
                  {o.subtotal} + {o.shipping_fee} delivery
                </div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{o.status}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-display text-lg tracking-[0.25em] mb-4">ALL-IN-ONE LEDGER ({unified.length})</h2>
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/30 text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
              <tr>
                {["Order #","Date","Status","Product #","Product","Size","Color","Qty","Unit","Line","Subtotal","Delivery","Order Total","Customer","Email","Phone","City","Address"].map(h => (
                  <th key={h} className="px-2 py-2 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {unified.length === 0 && (
                <tr><td colSpan={18} className="p-6 text-center text-muted-foreground">No data yet.</td></tr>
              )}
              {unified.map((r: LedgerRow, i: number) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="px-2 py-2 text-primary-hi font-display tracking-[0.15em]">#{r.order_id}</td>
                  <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-2 py-2 uppercase tracking-[0.15em] text-[9px]">{r.status}</td>
                  <td className="px-2 py-2 text-primary-hi">#{r.product_id ?? "—"}</td>
                  <td className="px-2 py-2">{r.product_name}</td>
                  <td className="px-2 py-2 uppercase tracking-[0.15em] text-[10px]">{r.size ?? "—"}</td>
                  <td className="px-2 py-2 uppercase tracking-[0.15em] text-[10px]">{r.color ?? "—"}</td>
                  <td className="px-2 py-2">{r.quantity}</td>
                  <td className="px-2 py-2">{r.unit_price}</td>
                  <td className="px-2 py-2 text-primary-hi">{r.line_total}</td>
                  <td className="px-2 py-2">{r.subtotal}</td>
                  <td className="px-2 py-2">{r.shipping_fee}</td>
                  <td className="px-2 py-2 text-primary-hi">{r.total}</td>
                  <td className="px-2 py-2">{r.customer_name}</td>
                  <td className="px-2 py-2 text-muted-foreground">{r.customer_email}</td>
                  <td className="px-2 py-2 text-muted-foreground">{r.customer_phone}</td>
                  <td className="px-2 py-2 text-muted-foreground">{r.customer_city}</td>
                  <td className="px-2 py-2 text-muted-foreground">{r.customer_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};
