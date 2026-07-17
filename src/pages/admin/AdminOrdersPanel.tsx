import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Order, OrderItem, LedgerRow } from "@/types/order";

export const AdminOrdersPanel = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [unified, setUnified] = useState<LedgerRow[]>([]);
  const [creatingShipmentFor, setCreatingShipmentFor] = useState<string | null>(null);
  const [confirmingOrderFor, setConfirmingOrderFor] = useState<string | null>(null);

  const loadOrders = async () => {
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (ordersError) {
      console.error("Orders loading error:", ordersError);
      toast.error("Impossible de charger les commandes");
      return;
    }

    console.log("ADMIN ORDERS:", ordersData);

    setOrders((ordersData as Order[]) ?? []);

    const { data: ledgerData, error: ledgerError } = await supabase
      .from("admin_orders_full" as any)
      .select("*")
      .limit(500);

    if (ledgerError) {
      console.error("Ledger loading error:", ledgerError);
      return;
    }

    setUnified((ledgerData as LedgerRow[]) ?? []);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleConfirmOrder = async (order: Order) => {
    setConfirmingOrderFor(order.id);

    try {
      const { error } = await supabase.rpc("confirm_order", {
        order_uuid: order.id,
      });

      if (error) {
        console.error("Confirm error:", error);
        toast.error(error.message);
        return;
      }

      toast.success(`Commande #${order.display_id} validée`);
      await loadOrders();

    } catch (error) {
      console.error(error);
      toast.error("Erreur validation commande");

    } finally {
      setConfirmingOrderFor(null);
    }
  };


  const handleCreateShipment = async (order: Order) => {

    const confirmed = window.confirm(
      `Créer le colis Sendit ?\n\n` +
      `Commande #${order.display_id}\n` +
      `${order.customer_name}\n` +
      `${order.customer_phone}\n` +
      `${order.customer_address}, ${order.customer_city}`
    );

    if (!confirmed) return;


    setCreatingShipmentFor(order.id);


    try {

      const {
        data: { session },
      } = await supabase.auth.getSession();


      if (!session) {
        toast.error("Session expirée");
        return;
      }


      const response = await fetch(
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


      const result = await response.json();


      if (!response.ok) {
        console.error(result);
        toast.error(result.error ?? "Erreur Sendit");
        return;
      }


      toast.success(
        `Colis créé : ${result.tracking_number ?? "sans tracking"}`
      );


      await loadOrders();


    } catch (error) {

      console.error(error);
      toast.error("Erreur serveur");

    } finally {

      setCreatingShipmentFor(null);

    }

  };  
  return (
    <>
      <section className="mb-12">

        <h2 className="font-display text-lg tracking-[0.25em] mb-4">
          RECENT ORDERS ({orders.length})
        </h2>


        <div className="border border-border divide-y divide-border">


          {orders.length === 0 && (
            <p className="p-6 text-xs text-muted-foreground text-center">
              No orders yet.
            </p>
          )}



          {orders.map((o) => (

            <div
              key={o.id}
              className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs"
            >


              <div className="text-primary-hi font-display tracking-[0.2em]">
                #{o.display_id}
              </div>



              <div>
                <div className="text-foreground">
                  {o.customer_name}
                </div>

                <div className="text-muted-foreground">
                  {o.customer_phone}
                </div>
              </div>




              <div className="text-muted-foreground">

                {o.customer_email}

                <br />

                {o.customer_city}

              </div>





              <div className="text-muted-foreground">

                {(o.order_items ?? [])
                  .map(
                    (item: OrderItem) =>
                      `${item.product_name} ×${item.quantity}`
                  )
                  .join(", ")}

              </div>





              <div className="text-right">


                <div className="text-primary-hi">
                  {o.total} MAD
                </div>



                <div className="text-[9px] uppercase text-muted-foreground">
                  {o.subtotal} + {o.shipping_fee} livraison
                </div>



                <div className="text-[10px] uppercase tracking-[0.2em] mt-1">
                  STATUS : {o.status}
                </div>




                {o.tracking_number ? (

                  <div className="text-[9px] uppercase text-muted-foreground mt-2">
                    SENDIT : {o.tracking_number}
                  </div>



                ) : o.status === "pending" ? (


                  <button
                    onClick={() => handleConfirmOrder(o)}
                    disabled={confirmingOrderFor === o.id}
                    className="
                    mt-3
                    px-4
                    py-2
                    border
                    border-primary
                    text-primary
                    text-[10px]
                    tracking-[0.2em]
                    uppercase
                    hover:bg-primary
                    hover:text-primary-foreground
                    disabled:opacity-50
                    "
                  >

                    {confirmingOrderFor === o.id
                      ? "VALIDATION..."
                      : "VALIDER LA COMMANDE"}

                  </button>



                ) : o.status === "confirmed" ? (


                  <button
                    onClick={() => handleCreateShipment(o)}
                    disabled={creatingShipmentFor === o.id}
                    className="
                    mt-3
                    px-4
                    py-2
                    border
                    border-primary
                    text-primary
                    text-[10px]
                    tracking-[0.2em]
                    uppercase
                    hover:bg-primary
                    hover:text-primary-foreground
                    disabled:opacity-50
                    "
                  >

                    {creatingShipmentFor === o.id
                      ? "CREATION..."
                      : "CREER LE COLIS"}

                  </button>


                ) : null}



              </div>


            </div>


          ))}


        </div>


      </section>





      <section className="mb-12">


        <h2 className="font-display text-lg tracking-[0.25em] mb-4">
          ALL-IN-ONE LEDGER ({unified.length})
        </h2>



        <div className="border border-border overflow-x-auto">


          <table className="w-full text-[11px]">


            <thead className="bg-muted/30 text-[9px] uppercase">


              <tr>

                {[
                  "Order",
                  "Date",
                  "Status",
                  "Produit",
                  "Taille",
                  "Couleur",
                  "Qty",
                  "Prix",
                  "Total",
                  "Client",
                  "Email",
                  "Téléphone",
                  "Ville",
                  "Adresse"
                ].map((head)=>(
                  <th
                    key={head}
                    className="px-2 py-2 text-left whitespace-nowrap"
                  >
                    {head}
                  </th>
                ))}

              </tr>


            </thead>



            <tbody className="divide-y divide-border">


              {unified.map((r: LedgerRow,index)=>(
                      <tr
                  key={index}
                  className="hover:bg-muted/20"
                >

                  <td className="px-2 py-2 text-primary-hi">
                    #{r.order_id}
                  </td>


                  <td className="px-2 py-2">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>


                  <td className="px-2 py-2 uppercase">
                    {r.status}
                  </td>


                  <td className="px-2 py-2">
                    {r.product_name}
                  </td>


                  <td className="px-2 py-2">
                    {r.size ?? "—"}
                  </td>


                  <td className="px-2 py-2">
                    {r.color ?? "—"}
                  </td>


                  <td className="px-2 py-2">
                    {r.quantity}
                  </td>


                  <td className="px-2 py-2">
                    {r.unit_price}
                  </td>


                  <td className="px-2 py-2 text-primary-hi">
                    {r.line_total}
                  </td>


                  <td className="px-2 py-2">
                    {r.customer_name}
                  </td>


                  <td className="px-2 py-2">
                    {r.customer_email}
                  </td>


                  <td className="px-2 py-2">
                    {r.customer_phone}
                  </td>


                  <td className="px-2 py-2">
                    {r.customer_city}
                  </td>


                  <td className="px-2 py-2">
                    {r.customer_address}
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
