import { useEffect, useMemo, useState } from "react";
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

// Couleur par statut — modifie les valeurs hex ici pour ajuster.
// pending = gris, confirmed = rouge, delivered = rouge (tel que demandé).
const STATUS_COLORS: Record<string, string> = {
  pending: "#9CA3AF",
  to_prepare: "#9CA3AF",
  new_destination: "#9CA3AF",
  confirmed: "#DC2626",
  to_pickup: "#F59E0B",
  pickedup: "#F59E0B",
  warehouse: "#3B82F6",
  transit: "#3B82F6",
  distributed: "#3B82F6",
  delivering: "#3B82F6",
  unreachable: "#F59E0B",
  postponed: "#F59E0B",
  delivered: "#DC2626",
  canceled: "#DC2626",
  cancelled: "#DC2626",
  rejected: "#DC2626",
};

const DEFAULT_STATUS_COLOR = "#9CA3AF";

const StatusDot = ({ status }: { status: string | null | undefined }) => {
  const key = (status ?? "").trim().toLowerCase();
  const color = STATUS_COLORS[key] ?? DEFAULT_STATUS_COLOR;

  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );
};

export const AdminOrdersPanel = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [unified, setUnified] = useState<LedgerRow[]>([]);
  const [creatingShipmentFor, setCreatingShipmentFor] = useState<string | null>(null);
  const [confirmingOrderFor, setConfirmingOrderFor] = useState<string | null>(null);
  const [creatingPickup, setCreatingPickup] = useState(false);
  const [syncingSendit, setSyncingSendit] = useState(false);
  const [pickups, setPickups] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "city" | "status">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  
  const loadOrders = async () => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: ordersData, error, count } = await supabase
      .from("orders")
      .select(`
      *,
      order_items (*)
      `, { count: "exact" })
     .or(
     "shipping_status.is.null,shipping_status.neq.DELIVERED"
)
     .order("created_at", { ascending:false })
     .range(from, to);

    if (error) {
      console.error(error);
      toast.error("Erreur chargement commandes");
      return;
    }

    setOrders((ordersData as Order[]) ?? []);
    setTotalCount(count ?? 0);

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
        total: 0,
        orders: [],
      };

    }

    acc[row.pickup_code].orders.push(row);
    acc[row.pickup_code].total += row.total;

    return acc;

  }, {})
);

setPickups(grouped);
  };
  
 useEffect(() => {
  loadOrders();
}, [page, pageSize]);

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

const handleSyncSendit = async () => {

  setSyncingSendit(true);

  try {

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast.error("Session expirée");
      return;
    }

    const res = await fetch(
      "/api/sync-sendit-status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error ?? "Erreur synchronisation");
      console.error(json);
      return;
    }

    toast.success(
      `${json.updated} commande(s) mise(s) à jour sur ${json.checked}`
    );

    await loadOrders();

  } catch (err) {

    console.error(err);

    toast.error("Erreur serveur");

  } finally {

    setSyncingSendit(false);

  }

};

const shipmentsReady = orders.some(
  (o) =>
    o.tracking_number &&
    !o.pickup_code &&
    o.shipping_status === "PENDING"
);

// Regroupe le statut interne (pending/confirmed) et le statut Sendit
// (shipping_status) en une seule catégorie pour les filtres.
const getOrderCategory = (o: any): string => {

  if (o.shipping_status === "DELIVERED") return "delivered";

  if (
    o.shipping_status_return ||
    o.shipping_status === "CANCELED" ||
    o.shipping_status === "REJECTED"
  ) {
    return "returned";
  }

  if (
    o.pickup_code ||
    o.shipping_status === "TO_PICKUP" ||
    o.shipping_status === "PICKEDUP"
  ) {
    return "pickup";
  }

  if (
    ["WAREHOUSE", "TRANSIT", "DISTRIBUTED", "DELIVERING", "UNREACHABLE", "POSTPONED"]
      .includes(o.shipping_status)
  ) {
    return "transit";
  }

  if (o.status?.trim().toLowerCase() === "confirmed") return "confirmed";

  return "pending";
};

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "pickup", label: "Pickup" },
  { key: "transit", label: "Transit" },
  { key: "delivered", label: "Delivered" },
  { key: "returned", label: "Returned" },
];

const displayedOrders = useMemo(() => {

  let list = orders as any[];

  if (statusFilter !== "all") {
    list = list.filter((o) => getOrderCategory(o) === statusFilter);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();

    list = list.filter(
      (o) =>
        String(o.display_id ?? "").toLowerCase().includes(q) ||
        String(o.tracking_number ?? "").toLowerCase().includes(q) ||
        String(o.pickup_code ?? "").toLowerCase().includes(q) ||
        String(o.customer_phone ?? "").toLowerCase().includes(q) ||
        String(o.customer_name ?? "").toLowerCase().includes(q) ||
        String(o.customer_email ?? "").toLowerCase().includes(q)
    );
  }

  const sorted = [...list].sort((a, b) => {

    let compare = 0;

    if (sortBy === "date") {
      compare =
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime();
    } else if (sortBy === "amount") {
      compare = Number(a.total) - Number(b.total);
    } else if (sortBy === "city") {
      compare = String(a.customer_city ?? "").localeCompare(
        String(b.customer_city ?? "")
      );
    } else if (sortBy === "status") {
      compare = getOrderCategory(a).localeCompare(getOrderCategory(b));
    }

    return sortDir === "asc" ? compare : -compare;
  });

  return sorted;

}, [orders, statusFilter, searchQuery, sortBy, sortDir]);

const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return (
    <>
      <section className="mb-12">

  <div className="flex items-center justify-between mb-6">

    <h2 className="font-display text-lg tracking-[0.25em]">
      RECENT ORDERS ({displayedOrders.length})
    </h2>

    <div className="flex gap-3">

    <button
  onClick={handleSyncSendit}
  disabled={syncingSendit}
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
      {syncingSendit
        ? "SYNCHRONISATION..."
        : "SYNCHRONISER SENDIT"}
    </button>

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

  </div>

  <div className="flex flex-wrap gap-2 mb-4">

    {STATUS_FILTERS.map((f) => (
      <button
        key={f.key}
        onClick={() => setStatusFilter(f.key)}
        className={`
          border
          px-4
          py-2
          text-[10px]
          uppercase
          tracking-[0.2em]
          ${statusFilter === f.key
            ? "bg-primary text-primary-foreground border-primary"
            : "border-border hover:border-primary"}
        `}
      >
        {f.label}
      </button>
    ))}

  </div>

  <div className="flex flex-wrap items-center gap-3 mb-6">

    <input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Rechercher..."
      className="
        border
        border-border
        px-4
        py-2
        text-sm
        flex-1
        min-w-[220px]
        bg-transparent
      "
    />

    <select
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value as any)}
      className="
        border
        border-border
        px-3
        py-2
        text-[10px]
        uppercase
        tracking-[0.15em]
        bg-transparent
      "
    >
      <option value="date">Date</option>
      <option value="amount">Montant</option>
      <option value="city">Ville</option>
      <option value="status">Status</option>
    </select>

    <button
      onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
      className="
        border
        border-border
        px-3
        py-2
        text-[10px]
        uppercase
        tracking-[0.15em]
      "
    >
      {sortDir === "asc" ? "↑ ASC" : "↓ DESC"}
    </button>

  </div>

        <div className="border border-border divide-y divide-border">

          {displayedOrders.map((o) => {

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

    <div className="text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
      STATUS : <StatusDot status={status} />{status}
    </div>

  </div>

  <div className="grid lg:grid-cols-3 gap-4">

    {/* CLIENT */}

    <div className="border border-border p-4">

      <div className="text-[9px] uppercase tracking-[0.25em] text-primary-hi mb-3">
        CLIENT
      </div>

      <div className="space-y-2">

        <div>
          <div className="text-[9px] uppercase text-muted-foreground">
            Nom
          </div>

          <div className="mt-1 text-sm">
            {o.customer_name}
          </div>
        </div>

        <div>
          <div className="text-[9px] uppercase text-muted-foreground">
            Téléphone
          </div>

          <div className="mt-1 text-sm">
            {o.customer_phone}
          </div>
        </div>

        <div>
          <div className="text-[9px] uppercase text-muted-foreground">
            Email
          </div>

          <div className="mt-1 text-sm break-all">
            {o.customer_email}
          </div>
        </div>

      </div>

    </div>


    {/* LIVRAISON */}

    <div className="border border-border p-4">

      <div className="text-[9px] uppercase tracking-[0.25em] text-primary-hi mb-3">
        LIVRAISON
      </div>

      <div className="space-y-2">

        <div>

          <div className="text-[9px] uppercase text-muted-foreground">
            Ville
          </div>

          <div className="mt-1 text-sm">
            {o.customer_city}
          </div>

        </div>

        <div>

          <div className="text-[9px] uppercase text-muted-foreground">
            District
          </div>

          <div className="mt-1 text-sm">
            {o.customer_district ?? "—"}
          </div>

        </div>

        <div>

          <div className="text-[9px] uppercase text-muted-foreground">
            Adresse
          </div>

          <div className="mt-1 text-sm leading-relaxed">
            {o.customer_address}
          </div>

        </div>

      </div>

    </div>


    {/* SENDIT */}

    <div className="border border-border p-4">

      <div className="text-[9px] uppercase tracking-[0.25em] text-primary-hi mb-3">
        SENDIT
      </div>

      {o.tracking_number ? (

        <>

          <div className="space-y-2">

            <div>

              <div className="text-[9px] uppercase text-muted-foreground">
                Tracking
              </div>

              <div className="mt-1 text-sm font-display tracking-[0.12em]">
                {o.tracking_number}
              </div>

            </div>

            <div>

              <div className="text-[9px] uppercase text-muted-foreground">
                Status
              </div>

              <div className="mt-1 text-sm uppercase flex items-center gap-2">
                <StatusDot status={o.shipping_status} />{o.shipping_status}
              </div>

              {o.pickup_code && (
  <>
    <div className="pt-2 border-t border-border mt-2">

      <div className="text-[9px] uppercase text-muted-foreground">
        Pickup
      </div>

      <div className="mt-1 text-sm font-display tracking-[0.12em]">
        {o.pickup_code}
      </div>

    </div>

    <div>

      <div className="text-[9px] uppercase text-muted-foreground">
        Pickup status
      </div>

      <div className="mt-1 text-sm uppercase flex items-center gap-2">
        <StatusDot status={o.pickup_status} />{o.pickup_status}
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

      <div className="text-lg font-display text-primary-hi">
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

  <div className="flex flex-wrap items-center justify-between gap-4 mt-6 text-[10px] uppercase tracking-[0.15em]">

    <div className="flex items-center gap-2">

      <span className="text-muted-foreground">Par page :</span>

      {[50, 100, 200].map((size) => (
        <button
          key={size}
          onClick={() => {
            setPageSize(size);
            setPage(1);
          }}
          className={`
            border
            px-3
            py-1
            ${pageSize === size
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border"}
          `}
        >
          {size}
        </button>
      ))}

    </div>

    <div className="flex items-center gap-3">

      <button
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page <= 1}
        className="border border-border px-3 py-1 disabled:opacity-40"
      >
        ←
      </button>

      <span className="text-muted-foreground normal-case tracking-normal">
        Page {page} / {totalPages} ({totalCount} commandes)
      </span>

      <button
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={page >= totalPages}
        className="border border-border px-3 py-1 disabled:opacity-40"
      >
        →
      </button>

    </div>

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
className="p-4 flex justify-between"
>

<div>

<div className="text-[9px] uppercase text-muted-foreground">
PICKUP
</div>

<div className="text-sm font-display tracking-[0.12em]">
{p.code}
</div>

<div className="text-[9px] uppercase text-muted-foreground mt-2">
TRACKING
</div>

<div className="text-sm font-display">
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

<div className="text-sm uppercase flex items-center justify-end gap-2">
{p.status}<StatusDot status={p.status} />
</div>

<div className="text-[9px] uppercase text-muted-foreground mt-2">
COLIS
</div>

<div className="text-sm">
{p.orders.length}
</div>

<div className="text-[9px] uppercase text-muted-foreground mt-2">
TOTAL
</div>

<div className="text-sm">
{p.total} MAD
</div>

<div className="text-xs mt-2">
{new Date(p.created_at).toLocaleDateString()}
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
