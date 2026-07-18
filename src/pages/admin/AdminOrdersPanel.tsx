import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Order, OrderItem, LedgerRow } from "@/types/order";

type Pickup = {
  pickup_code: string;
  pickup_status: string | null;
  pickup_created_at: string | null;
  tracking_number: string;
  customer_name: string;
};

export const AdminOrdersPanel = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [unified, setUnified] = useState<LedgerRow[]>([]);
  const [creatingShipmentFor, setCreatingShipmentFor] = useState<string | null>(null);
  const [confirmingOrderFor, setConfirmingOrderFor] = useState<string | null>(null);
  const [creatingPickup, setCreatingPickup] = useState(false);
  const [pickups, setPickups] = useState<any[]>([]);
  
  const loadOrders = async () => {
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select(`
      *,
      order_items (*)
      `)
     .or(
     "shipping_status.is.null,shipping_status.neq.DELIVERED"
)
     .order("created_at", { ascending:false })
     .limit(50);

    if (error) {
      console.error(error);
      toast.error("Erreur chargement commandes");
      return;
    }

    setOrders((ordersData as Order[]) ?? []);

    const { data: ledgerData } = await supabase
      .from("admin_orders_full" as any)
      .select("*")
      .limit(500);

    setUnified((ledgerData as LedgerRow[]) ?? []);

    const { data: pickupsData } = await supabase
  .from("orders")
  .select(`
    pickup_code,
    pickup_status,
    pickup_created_at,
    tracking_number,
    customer_name,
    total
  `)
  .not("pickup_code", "is", null)
  .order("pickup_created_at", {
    ascending: false,
  });


const grouped = Object.values(
  (pickupsData ?? []).reduce((acc: any, row: any) => {

    if (!acc[row.pickup_code]) {

      acc[row.pickup_code] = {
        code: row.pickup_code,
        status: row.pickup_status,
        created_at: row.pickup_created_at,
        orders: [],
      };

    }

    acc[row.pickup_code].orders.push(row);

    return acc;

  }, {})
);

setPickups(grouped);
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
        console.error(error);
        toast.error(error.message);
        return;
      }

      toast.success(`Commande #${order.display_id} validée`);
      await loadOrders();

    } catch (error) {
      console.error(error);
      toast.error("Erreur validation");

    } finally {
      setConfirmingOrderFor(null);
    }
  };


  const handleCreateShipment = async (order: Order) => {

    const confirm = window.confirm(
      `Créer le colis Sendit ?\n\n` +
      `Commande #${order.display_id}\n` +
      `${order.customer_name}\n` +
      `${order.customer_phone}\n` +
      `${order.customer_address}
       ${order.customer_district ? `District : ${order.customer_district}\n` : ""}
       Ville : ${order.customer_city}`
    );

    if (!confirm) return;


    setCreatingShipmentFor(order.id);


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


      const result = await res.json();


      if (!res.ok) {
        toast.error(result.error ?? "Erreur Sendit");
        return;
      }


      toast.success(
        `Colis créé ${result.tracking_number ?? ""}`
      );


      await loadOrders();


    } catch (error) {

      console.error(error);
      toast.error("Erreur serveur");

    } finally {

      setCreatingShipmentFor(null);

    }
  };

  const handleRequestPickup = async () => {

  if (
    !window.confirm(
      "Demander un ramassage Sendit pour tous les colis en attente ?"
    )
  ) {
    return;
  }

  setCreatingPickup(true);

  try {

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast.error("Session expirée");
      return;
    }

   const res = await fetch(
  "/api/request-sendit-pickup",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  }
);

    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error ?? "Erreur ramassage");
      console.error(json);
      return;
    }

    toast.success(
      `Ramassage ${json.pickup_code} créé`
    );

    await loadOrders();

  } catch (err) {

    console.error(err);

    toast.error("Erreur serveur");

  } finally {

    setCreatingPickup(false);

  }

};

const shipmentsReady = orders.some(
  (o) =>
    o.tracking_number &&
    !o.pickup_code &&
    o.shipping_status === "PENDING"
);
  
    return (
    <>
      <section className="mb-12">

  <div className="flex items-center justify-between mb-6">

    <h2 className="font-display text-lg tracking-[0.25em]">
      RECENT ORDERS ({orders.length})
    </h2>

    <button
  onClick={handleRequestPickup}
  disabled={creatingPickup || !shipmentsReady}
      className="
        border
        border-primary
        px-6
        py-3
        text-[11px]
        uppercase
        tracking-[0.25em]
        hover:bg-primary
        hover:text-primary-foreground
        disabled:opacity-50
      "
    >
      {creatingPickup
        ? "DEMANDE..."
        : "DEMANDER LE RAMASSAGE"}
    </button>

  </div>

        <div className="border border-border divide-y divide-border">

          {orders.map((o) => {

            const status = o.status?.trim().toLowerCase();

            return (

              <div
  key={o.id}
  className="border-b border-border p-6"
>

  <div className="flex items-center justify-between mb-5">

    <div className="font-display tracking-[0.25em] text-primary-hi">
      #{o.display_id}
    </div>

    <div className="text-[10px] uppercase tracking-[0.2em]">
      STATUS : {status}
    </div>

  </div>

  <div className="grid lg:grid-cols-3 gap-4">

    {/* CLIENT */}

    <div className="border border-border p-4">

      <div className="text-[9px] uppercase tracking-[0.25em] text-primary-hi mb-4">
        CLIENT
      </div>

      <div className="space-y-3">

        <div>
          <div className="text-[9px] uppercase text-muted-foreground">
            Nom
          </div>

          <div className="mt-1">
            {o.customer_name}
          </div>
        </div>

        <div>
          <div className="text-[9px] uppercase text-muted-foreground">
            Téléphone
          </div>

          <div className="mt-1">
            {o.customer_phone}
          </div>
        </div>

        <div>
          <div className="text-[9px] uppercase text-muted-foreground">
            Email
          </div>

          <div className="mt-1 break-all">
            {o.customer_email}
          </div>
        </div>

      </div>

    </div>


    {/* LIVRAISON */}

    <div className="border border-border p-4">

      <div className="text-[9px] uppercase tracking-[0.25em] text-primary-hi mb-4">
        LIVRAISON
      </div>

      <div className="space-y-3">

        <div>

          <div className="text-[9px] uppercase text-muted-foreground">
            Ville
          </div>

          <div className="mt-1">
            {o.customer_city}
          </div>

        </div>

        <div>

          <div className="text-[9px] uppercase text-muted-foreground">
            District
          </div>

          <div className="mt-1">
            {o.customer_district ?? "—"}
          </div>

        </div>

        <div>

          <div className="text-[9px] uppercase text-muted-foreground">
            Adresse
          </div>

          <div className="mt-1 leading-relaxed">
            {o.customer_address}
          </div>

        </div>

      </div>

    </div>


    {/* SENDIT */}

    <div className="border border-border p-4">

      <div className="text-[9px] uppercase tracking-[0.25em] text-primary-hi mb-4">
        SENDIT
      </div>

      {o.tracking_number ? (

        <>

          <div className="space-y-3">

            <div>

              <div className="text-[9px] uppercase text-muted-foreground">
                Tracking
              </div>

              <div className="mt-1 font-display tracking-[0.12em]">
                {o.tracking_number}
              </div>

            </div>

            <div>

              <div className="text-[9px] uppercase text-muted-foreground">
                Status
              </div>

              <div className="mt-1 uppercase">
                {o.shipping_status}
              </div>

              {o.pickup_code && (
  <>
    <div className="pt-3 border-t border-border mt-3">

      <div className="text-[9px] uppercase text-muted-foreground">
        Pickup
      </div>

      <div className="mt-1 font-display tracking-[0.12em]">
        {o.pickup_code}
      </div>

    </div>

    <div>

      <div className="text-[9px] uppercase text-muted-foreground">
        Pickup status
      </div>

      <div className="mt-1 uppercase">
        {o.pickup_status}
      </div>

    </div>
  </>
)}

            </div>

          </div>

          {o.shipping_label_url && (

            <a
              href={o.shipping_label_url}
              target="_blank"
              rel="noopener noreferrer"
              className="
                mt-5
                block
                border
                border-primary
                py-2
                text-center
                text-[10px]
                tracking-[0.2em]
                uppercase
                hover:bg-primary
                hover:text-primary-foreground
              "
            >
              Bordereau
            </a>

          )}

        </>

      ) : status === "pending" ? (

        <button
          onClick={() => handleConfirmOrder(o)}
          disabled={confirmingOrderFor === o.id}
          className="
            w-full
            border
            border-primary
            py-2
            text-[10px]
            uppercase
            tracking-[0.2em]
            hover:bg-primary
            hover:text-primary-foreground
            disabled:opacity-50
          "
        >
          {confirmingOrderFor === o.id
            ? "VALIDATION..."
            : "VALIDER LA COMMANDE"}
        </button>

      ) : status === "confirmed" ? (

        <button
          onClick={() => handleCreateShipment(o)}
          disabled={creatingShipmentFor === o.id}
          className="
            w-full
            border
            border-primary
            py-2
            text-[10px]
            uppercase
            tracking-[0.2em]
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

  <div className="mt-5 pt-4 border-t border-border flex justify-between items-end">

    <div>

      <div className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
        PRODUITS
      </div>

      <div className="text-sm">

        {(o.order_items ?? [])
          .map(
            (item: OrderItem) =>
              `${item.product_name} ×${item.quantity}`
          )
          .join(", ")}

      </div>

    </div>

    <div className="text-right">

      <div className="text-xl font-display text-primary-hi">
        {o.total} MAD
      </div>

      <div className="text-[9px] uppercase text-muted-foreground">
        {o.subtotal} + {o.shipping_fee} livraison
      </div>

    </div>

  </div>

</div>

            );
          })}

        </div>

      </section>

<section className="mb-12">

<h2 className="font-display text-lg tracking-[0.25em] mb-4">
SENDIT PICKUPS ({pickups.length})
</h2>


<div className="border border-border divide-y">

{pickups.map((p: any) => (

<div
key={p.code}
className="p-5 flex justify-between"
>

<div>

<div className="text-[9px] uppercase text-muted-foreground">
TRACKING
</div>

<div className="font-display">
{p.orders.map((o:any)=>o.tracking_number).join(", ")}
</div>


<div className="text-sm mt-2">
{p.orders.map((o:any)=>o.customer_name).join(", ")}
</div>

</div>


<div className="text-right">

<div className="text-[9px] uppercase text-muted-foreground">
STATUS
</div>

<div className="uppercase">
{p.status}
</div>


<div className="text-xs mt-2">
{new Date (
  p.created_at)
.toLocaleDateString()}
</div>


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
                ].map((h) => (
                  <th
                    key={h}
                    className="px-2 py-2 text-left whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>

            </thead>


            <tbody className="divide-y divide-border">

              {unified.map((r: LedgerRow, i) => (

                <tr
                  key={i}
                  className="hover:bg-muted/20"
                >

                  <td className="px-2 py-2">
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

                  <td className="px-2 py-2">
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
