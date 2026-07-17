import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Order, OrderItem, LedgerRow } from "@/types/order";

export const AdminOrdersPanel = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [unified, setUnified] = useState<LedgerRow[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const loadOrders = async () => {
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(50);

    setOrders((ordersData as Order[]) ?? []);

    const { data: ledgerData } = await supabase
      .from("admin_orders_full" as any)
      .select("*")
      .limit(300);

    setUnified((ledgerData as LedgerRow[]) ?? []);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const confirmOrder = async (order: Order) => {
    const ok = window.confirm(
      `Confirmer la commande #${order.display_id} ?\n\n` +
      `${order.customer_name}\n` +
      `${order.customer_phone}\n` +
      `${order.customer_city}`
    );

    if (!ok) return;

    setLoadingAction(order.id);

    const { error } = await supabase
      .from("orders")
      .update({
        status: "confirmed",
      })
      .eq("id", order.id)
      .eq("status", "pending");

    if (error) {
      console.error(error);
      toast.error("Impossible de confirmer la commande");
    } else {
      toast.success("Commande confirmée");
      loadOrders();
    }

    setLoadingAction(null);
  };


  const createShipment = async (order: Order) => {
    const ok = window.confirm(
      `Créer le colis Sendit ?\n\n` +
      `Commande #${order.display_id}\n` +
      `${order.customer_name}\n` +
      `${order.customer_phone}\n` +
      `${order.customer_address}\n` +
      `${order.customer_city}`
    );

    if (!ok) return;

    setLoadingAction(order.id);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Session expirée");
        return;
      }

      const res = await fetch(
        "/api/create-sendit-shipment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            orderId: order.id,
          }),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Erreur Sendit");
        return;
      }

      toast.success(
        `Colis créé : ${json.tracking_number ?? "OK"}`
      );

      loadOrders();

    } catch (e) {
      console.error(e);
      toast.error("Erreur serveur");
    }

    setLoadingAction(null);
  };


  return (
    <>
      <section className="mb-12">

        <h2 className="font-display text-lg tracking-[0.25em] mb-4">
          ORDERS ({orders.length})
        </h2>


        <div className="border border-border divide-y">

          {orders.map((order) => (

            <div
              key={order.id}
              className="p-5 grid grid-cols-1 md:grid-cols-6 gap-4 text-xs"
            >

              <div className="font-display text-primary-hi">
                #{order.display_id}
              </div>


              <div>
                <div>
                  {order.customer_name}
                </div>
                <div className="text-muted-foreground">
                  {order.customer_phone}
                </div>
              </div>


              <div>
                {order.customer_city}
                <br/>
                {order.customer_address}
              </div>


              <div>
                {(order.order_items ?? [])
                  .map(
                    (i: OrderItem)=>
                    `${i.product_name} ×${i.quantity}`
                  )
                  .join(", ")
                }
              </div>


              <div>
                <strong>
                  {order.total} MAD
                </strong>

                <div className="uppercase text-[10px]">
                  {order.status}
                </div>


                {order.tracking_number && (
                  <div className="mt-2 text-[10px]">
                    SENDIT:
                    <br/>
                    {order.tracking_number}
                  </div>
                )}

              </div>


              <div className="flex flex-col gap-2">


                {order.status === "pending" && (

                  <button
                    disabled={loadingAction === order.id}
                    onClick={() =>
                      confirmOrder(order)
                    }
                    className="
                    px-3 py-2
                    border
                    text-[10px]
                    uppercase
                    tracking-widest
                    "
                  >
                    Confirmer
                  </button>

                )}



                {order.status === "confirmed" &&
                !order.tracking_number && (

                  <button
                    disabled={loadingAction === order.id}
                    onClick={() =>
                      createShipment(order)
                    }
                    className="
                    px-3 py-2
                    border
                    border-primary
                    text-primary
                    text-[10px]
                    uppercase
                    tracking-widest
                    "
                  >
                    Créer colis Sendit
                  </button>

                )}


                {order.shipping_status && (

                  <span className="text-[10px]">
                    {order.shipping_status}
                  </span>

                )}


              </div>


            </div>

          ))}

        </div>

      </section>



      <section>

        <h2 className="font-display text-lg tracking-[0.25em] mb-4">
          LEDGER ({unified.length})
        </h2>


        <div className="overflow-x-auto border">

          <table className="w-full text-xs">

            <tbody>

            {unified.map((r,i)=>(

              <tr key={i}
              className="border-b">

                <td className="p-2">
                  #{r.order_id}
                </td>

                <td className="p-2">
                  {r.customer_name}
                </td>

                <td className="p-2">
                  {r.product_name}
                </td>

                <td className="p-2">
                  {r.quantity}
                </td>

                <td className="p-2">
                  {r.total}
                </td>

                <td className="p-2">
                  {r.shipping_status ?? "-"}
                </td>

              </tr>

            ))}

            </tbody>

          </table>

        </div>

      </section>

    </>
  );
};
