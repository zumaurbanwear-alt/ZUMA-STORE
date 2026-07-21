import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Order, OrderItem, LedgerRow } from "@/types/order";
import { StatusDot } from "./orders/StatusDot";
import { SalesChart } from "./orders/SalesChart";
import type { AdminInvoice, AdminOrder, AdminOrderEvent, AdminPickup } from "./orders/types";
import {
  getOrderCategory,
  STATUS_FILTERS,
  translateStatus,
  RETURN_ELIGIBLE_STATUSES,
  TIMELINE_STEPS,
  mapEventToStep,
  escapeCsvField,
} from "./orders/orderStatus";

type PickupRow = {
  pickup_code?: string | null;
  pickup_status?: string | null;
  pickup_created_at?: string | null;
  tracking_number?: string | null;
  customer_name?: string | null;
  total?: number | string | null;
};

type AdminStatsRow = Partial<AdminOrder> & {
  created_at?: string | null;
  total?: number | string | null;
  status?: string | null;
  shipping_status?: string | null;
  shipping_status_return?: string | null;
  return_code?: string | null;
  pickup_code?: string | null;
};

export const AdminOrdersPanel = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [unified, setUnified] = useState<LedgerRow[]>([]);
  const [creatingShipmentFor, setCreatingShipmentFor] = useState<string | null>(null);
  const [confirmingOrderFor, setConfirmingOrderFor] = useState<string | null>(null);
  const [creatingPickup, setCreatingPickup] = useState(false);
  const [syncingSendit, setSyncingSendit] = useState(false);
  const [pickups, setPickups] = useState<AdminPickup[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "city" | "status">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    todayCount: 0,
    monthCount: 0,
    monthRevenue: 0,
    transitCount: 0,
    deliveredCount: 0,
    returnedCount: 0,
  });
  const [salesByDay, setSalesByDay] = useState<{ date: string; total: number }[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [orderEvents, setOrderEvents] = useState<AdminOrderEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [creatingReturnFor, setCreatingReturnFor] = useState<string | null>(null);
  const [expandedPickups, setExpandedPickups] = useState<Set<string>>(new Set());
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesLastPage, setInvoicesLastPage] = useState(1);
  const [invoicesTotal, setInvoicesTotal] = useState(0);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStartDate, setInvoiceStartDate] = useState("");
  const [invoiceEndDate, setInvoiceEndDate] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<AdminInvoice | null>(null);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingRefund, setSavingRefund] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [downloadingLabels, setDownloadingLabels] = useState(false);

  const loadOrders = async () => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: ordersData, error, count } = await supabase
      .from("orders")
      .select(
        `
          *,
          order_items (*)
        `,
        { count: "exact" }
      )
      .or("shipping_status.is.null,shipping_status.neq.DELIVERED")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error(error);
      toast.error("Erreur chargement commandes");
      return;
    }

    setOrders((ordersData as Order[]) ?? []);
    setTotalCount(count ?? 0);

    const { data: ledgerData } = await supabase
      .from("admin_orders_full")
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
  (pickupsData ?? []).reduce<Record<string, AdminPickup>>((acc, row: PickupRow) => {
    const pickupCode = row.pickup_code ?? "";

    if (!pickupCode) return acc;

    const current = acc[pickupCode] ?? {
      code: pickupCode,
      status: row.pickup_status ?? null,
      created_at: row.pickup_created_at ?? null,
      total: 0,
      orders: [],
    };

    current.orders.push({
      pickup_code: pickupCode,
      pickup_status: row.pickup_status ?? null,
      pickup_created_at: row.pickup_created_at ?? null,
      tracking_number: row.tracking_number ?? "",
      customer_name: row.customer_name ?? "",
      total: Number(row.total) || 0,
    });
    current.total += Number(row.total) || 0;
    acc[pickupCode] = current;

    return acc;
  }, {})
);

setPickups(grouped);
  };

  const loadStats = async () => {

    setLoadingStats(true);

    const since = new Date();
    since.setDate(since.getDate() - 30);
    since.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        total,
        created_at,
        status,
        shipping_status,
        shipping_status_return,
        return_code,
        pickup_code
      `)
      .gte("created_at", since.toISOString())
      .limit(2000);

    if (error) {
      console.error(error);
      toast.error("Erreur chargement statistiques");
      setLoadingStats(false);
      return;
    }

    const rows = (data as AdminStatsRow[] | null) ?? [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayCount = 0;
    let monthCount = 0;
    let monthRevenue = 0;
    let transitCount = 0;
    let deliveredCount = 0;
    let returnedCount = 0;

    const dayTotals: Record<string, number> = {};

    for (const o of rows) {

      const created = new Date(o.created_at);

      if (created >= startOfToday) {
        todayCount++;
      }

      if (created >= startOfMonth) {
        monthCount++;
        monthRevenue += Number(o.total) || 0;
      }

      const category = getOrderCategory(o);

      if (category === "transit") transitCount++;
      if (category === "delivered") deliveredCount++;
      if (category === "returned") returnedCount++;

      const dayKey = created.toISOString().slice(0, 10);
      dayTotals[dayKey] = (dayTotals[dayKey] ?? 0) + (Number(o.total) || 0);
    }

    const chartData: { date: string; total: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);

      chartData.push({
        date: key.slice(5),
        total: dayTotals[key] ?? 0,
      });
    }

    setStats({
      todayCount,
      monthCount,
      monthRevenue,
      transitCount,
      deliveredCount,
      returnedCount,
    });

    setSalesByDay(chartData);
    setLoadingStats(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

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
    await loadStats();

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
    await loadStats();


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
    await loadStats();

  } catch (err) {

    console.error(err);

    toast.error("Erreur serveur");

  } finally {

    setCreatingPickup(false);

  }

};

const handleExportCSV = () => {

  const headers = [
    "Commande",
    "Client",
    "Téléphone",
    "Ville",
    "Tracking",
    "Pickup",
    "Status",
    "Montant",
    "Date",
  ];

  const rows = displayedOrders.map((o) => [
    o.display_id,
    o.customer_name,
    o.customer_phone,
    o.customer_city,
    o.tracking_number ?? "",
    o.pickup_code ?? "",
    o.shipping_status ?? o.status,
    o.total,
    o.created_at ? new Date(o.created_at).toLocaleDateString() : "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\n");

  // BOM pour qu'Excel reconnaisse l'UTF-8 (accents) correctement.
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `commandes_${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);

  toast.success(`${displayedOrders.length} commande(s) exportée(s)`);
};

const toggleOrderSelection = (id: string) => {
  setSelectedOrderIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
};

const handleDownloadLabelsZip = async () => {

  if (selectedOrderIds.size === 0) return;

  setDownloadingLabels(true);

  try {

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast.error("Session expirée");
      return;
    }

    const res = await fetch("/api/order-admin-actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: "download-labels",
        orderIds: Array.from(selectedOrderIds),
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Erreur téléchargement bordereaux");
      return;
    }

    const skippedCount = Number(res.headers.get("X-Skipped-Count") ?? "0");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `bordereaux-${new Date().toISOString().slice(0, 10)}.zip`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    if (skippedCount > 0) {
      toast.error(`${skippedCount} bordereau(x) n'ont pas pu être récupérés`);
    } else {
      toast.success("Bordereaux téléchargés");
    }

    setSelectedOrderIds(new Set());

  } catch (err) {

    console.error(err);
    toast.error("Erreur serveur");

  } finally {

    setDownloadingLabels(false);

  }

};

const openDrawer = async (o: AdminOrder) => {

  setSelectedInvoice(null);
  setSelectedOrder(o);
  setNotesDraft(o.admin_notes ?? "");
  setOrderEvents([]);
  setLoadingEvents(true);

  const { data, error } = await supabase
    .from("order_events")
    .select("*")
    .eq("order_id", o.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    toast.error("Erreur chargement historique");
  }

  setOrderEvents(data ?? []);
  setLoadingEvents(false);
};

const closeDrawer = () => {
  setSelectedOrder(null);
  setOrderEvents([]);
};

const handleCreateReturn = async (order: AdminOrder) => {

  const reason = window.prompt(
    "Raison du retour (optionnel) :"
  );

  // window.prompt renvoie null si l'admin annule — on n'envoie rien.
  if (reason === null) return;

  setCreatingReturnFor(order.id);

  try {

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast.error("Session expirée");
      return;
    }

    const res = await fetch(
      "/api/create-sendit-return",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          reason: reason || undefined,
        }),
      }
    );

    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error ?? "Erreur retour");
      console.error(json);
      return;
    }

    toast.success(`Retour ${json.return_code} demandé`);

    await loadOrders();
    await loadStats();

    // Le drawer affiche selectedOrder — on le referme pour forcer un
    // réaffichage propre avec les données à jour au prochain clic.
    closeDrawer();

  } catch (err) {

    console.error(err);

    toast.error("Erreur serveur");

  } finally {

    setCreatingReturnFor(null);

  }

};

const loadInvoices = async (page: number) => {

  setLoadingInvoices(true);

  try {

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast.error("Session expirée");
      return;
    }

    const params = new URLSearchParams();
    params.set("page", String(page));
    if (invoiceStartDate) params.set("startDate", invoiceStartDate);
    if (invoiceEndDate) params.set("endDate", invoiceEndDate);
    if (invoiceSearch.trim()) params.set("querystring", invoiceSearch.trim());

    const res = await fetch(`/api/sendit-invoices?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error ?? json.message ?? "Erreur factures");
      console.error(json);
      return;
    }

    setInvoices(json.data ?? []);
    setInvoicesLastPage(json.last_page ?? 1);
    setInvoicesTotal(json.total ?? 0);

  } catch (err) {

    console.error(err);
    toast.error("Erreur serveur");

  } finally {

    setLoadingInvoices(false);

  }

};

useEffect(() => {
  loadInvoices(invoicesPage);
}, [invoicesPage]);

const openInvoiceDetail = async (code: string) => {

  closeDrawer();
  setSelectedInvoice({ code });
  setLoadingInvoiceDetail(true);

  try {

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast.error("Session expirée");
      return;
    }

    const res = await fetch(
      `/api/sendit-invoice-detail?code=${encodeURIComponent(code)}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error ?? json.message ?? "Erreur détail facture");
      console.error(json);
      return;
    }

    setSelectedInvoice(json.data ?? json);

  } catch (err) {

    console.error(err);
    toast.error("Erreur serveur");

  } finally {

    setLoadingInvoiceDetail(false);

  }

};

const closeInvoiceDrawer = () => {
  setSelectedInvoice(null);
};

const updateOrderAdminFields = async (orderId: string, fields: Record<string, unknown>) => {

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    toast.error("Session expirée");
    return null;
  }

  const res = await fetch("/api/order-admin-actions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action: "update-fields", orderId, fields }),
  });

  const json = await res.json();

  if (!res.ok) {
    toast.error(json.error ?? "Erreur mise à jour");
    console.error(json);
    return null;
  }

  return (json.order as AdminOrder | null) ?? null;
};

const handleSaveNotes = async () => {

  if (!selectedOrder) return;

  setSavingNotes(true);

  try {

    const updated = await updateOrderAdminFields(selectedOrder.id, {
      admin_notes: notesDraft,
    });

    if (updated) {
      setSelectedOrder((prev) => (prev ? { ...prev, admin_notes: updated?.admin_notes ?? prev.admin_notes ?? null } : prev));
      toast.success("Notes enregistrées");
      await loadOrders();
    }

  } finally {

    setSavingNotes(false);

  }

};

const handleToggleRefund = async () => {

  if (!selectedOrder) return;

  setSavingRefund(true);

  try {

    const updated = await updateOrderAdminFields(selectedOrder.id, {
      refunded: !selectedOrder.refunded,
    });

    if (updated) {
      setSelectedOrder((prev) => (prev ? { ...prev, refunded: updated?.refunded ?? prev.refunded ?? false } : prev));
      toast.success(updated.refunded ? "Marquée comme remboursée" : "Marquée comme non remboursée");
      await loadOrders();
    }

  } finally {

    setSavingRefund(false);

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
    await loadStats();

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

const displayedOrders = useMemo(() => {

  let list: AdminOrder[] = orders;

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
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      compare = dateA - dateB;
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

        <h2 className="font-display text-base tracking-[0.2em] mb-4">
          DASHBOARD
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">

          <div className="border border-border p-3">
            <div className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
              COMMANDES / JOUR
            </div>
            <div className="text-lg font-display text-primary-hi">
              {stats.todayCount}
            </div>
          </div>

          <div className="border border-border p-3">
            <div className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
              COMMANDES / MOIS
            </div>
            <div className="text-lg font-display text-primary-hi">
              {stats.monthCount}
            </div>
          </div>

          <div className="border border-border p-3">
            <div className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
              CA / MOIS
            </div>
            <div className="text-lg font-display text-primary-hi">
              {stats.monthRevenue} MAD
            </div>
          </div>

          <div className="border border-border p-3">
            <div className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
              EN TRANSIT
            </div>
            <div className="text-lg font-display text-primary-hi">
              {stats.transitCount}
            </div>
          </div>

          <div className="border border-border p-3">
            <div className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
              LIVRÉES
            </div>
            <div className="text-lg font-display text-primary-hi">
              {stats.deliveredCount}
            </div>
          </div>

          <div className="border border-border p-3">
            <div className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
              RETOURS
            </div>
            <div className="text-lg font-display text-primary-hi">
              {stats.returnedCount}
            </div>
          </div>

        </div>

        <div className="border border-border p-3">

          <div className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground mb-3">
            VENTES — 30 DERNIERS JOURS {loadingStats ? "(chargement...)" : ""}
          </div>

          <SalesChart data={salesByDay} />

        </div>

      </section>

      <section className="mb-12">

  <div className="flex items-center justify-between mb-6">

    <h2 className="font-display text-base tracking-[0.2em]">
      RECENT ORDERS ({displayedOrders.length})
    </h2>

    <div className="flex gap-2">

    <button
  onClick={handleSyncSendit}
  disabled={syncingSendit}
      className="
        border
        border-primary
        px-3
        py-1.5
        text-[9px]
        uppercase
        tracking-[0.15em]
        hover:bg-primary
        hover:text-primary-foreground
        disabled:opacity-50
      "
    >
      {syncingSendit
        ? "SYNC..."
        : "SYNCHRONISER"}
    </button>

    <button
  onClick={handleRequestPickup}
  disabled={creatingPickup || !shipmentsReady}
      className="
        border
        border-primary
        px-3
        py-1.5
        text-[9px]
        uppercase
        tracking-[0.15em]
        hover:bg-primary
        hover:text-primary-foreground
        disabled:opacity-50
      "
    >
      {creatingPickup
        ? "DEMANDE..."
        : "RAMASSAGE"}
    </button>

    </div>

  </div>

  <div className="flex flex-wrap gap-1.5 mb-3">

    {STATUS_FILTERS.map((f) => (
      <button
        key={f.key}
        onClick={() => setStatusFilter(f.key)}
        className={`
          border
          px-2.5
          py-1
          text-[9px]
          uppercase
          tracking-[0.15em]
          ${statusFilter === f.key
            ? "bg-primary text-primary-foreground border-primary"
            : "border-border hover:border-primary"}
        `}
      >
        {f.label}
      </button>
    ))}

  </div>

  <div className="flex flex-wrap items-center gap-2 mb-4">

    <input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Rechercher..."
      className="
        border
        border-border
        px-3
        py-1.5
        text-xs
        flex-1
        min-w-[180px]
        bg-transparent
      "
    />

    <select
      value={sortBy}
      onChange={(e) => {
        const nextSortBy = e.target.value as "date" | "amount" | "city" | "status";
        setSortBy(nextSortBy);
      }}
      className="
        border
        border-border
        px-2
        py-1.5
        text-[9px]
        uppercase
        tracking-[0.1em]
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
        px-2
        py-1.5
        text-[9px]
        uppercase
        tracking-[0.1em]
      "
    >
      {sortDir === "asc" ? "↑" : "↓"}
    </button>

    <button
      onClick={handleExportCSV}
      disabled={displayedOrders.length === 0}
      className="
        border
        border-primary
        px-3
        py-1.5
        text-[9px]
        uppercase
        tracking-[0.15em]
        hover:bg-primary
        hover:text-primary-foreground
        disabled:opacity-40
      "
    >
      EXPORT CSV
    </button>

    {selectedOrderIds.size > 0 && (

      <>

        <button
          onClick={handleDownloadLabelsZip}
          disabled={downloadingLabels}
          className="
            border
            border-primary
            px-3
            py-1.5
            text-[9px]
            uppercase
            tracking-[0.15em]
            hover:bg-primary
            hover:text-primary-foreground
            disabled:opacity-50
          "
        >
          {downloadingLabels
            ? "ZIP..."
            : `BORDEREAUX (${selectedOrderIds.size})`}
        </button>

        <button
          onClick={() => setSelectedOrderIds(new Set())}
          className="border border-border px-3 py-1.5 text-[9px] uppercase tracking-[0.15em]"
        >
          Vider
        </button>

      </>

    )}

  </div>

        <div className="border border-border divide-y divide-border">

          {displayedOrders.map((o) => (

            <div
              key={o.id}
              onClick={() => openDrawer(o)}
              className="border-b border-border p-3 cursor-pointer hover:bg-muted/10 flex items-center gap-3"
            >

              <input
                type="checkbox"
                checked={selectedOrderIds.has(o.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleOrderSelection(o.id)}
                className="shrink-0"
              />

              <div className="text-xs font-display tracking-[0.1em] text-primary-hi">
                #{o.display_id}
              </div>

            </div>

          ))}

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

<h2 className="font-display text-base tracking-[0.2em] mb-3">
SENDIT PICKUPS ({pickups.length})
</h2>


<div className="border border-border divide-y">

{pickups.map((p) => {

  const isExpanded = expandedPickups.has(p.code);

  const toggleExpanded = () => {
    setExpandedPickups((prev) => {
      const next = new Set(prev);
      if (next.has(p.code)) {
        next.delete(p.code);
      } else {
        next.add(p.code);
      }
      return next;
    });
  };

  return (

<div
key={p.code}
className="p-3 flex justify-between"
>

<div>

<div className="text-[8px] uppercase text-muted-foreground">
PICKUP
</div>

<div className="text-xs font-display tracking-[0.1em]">
{p.code}
</div>

<div className="text-[8px] uppercase text-muted-foreground mt-1.5">
TRACKING
</div>

<div className="text-xs font-display">
{p.orders.map((o) => o.tracking_number).join(", ")}
</div>

{isExpanded ? (
  <div className="text-xs mt-1.5">
    {p.orders.map((o) => o.customer_name).join(", ")}
  </div>
) : (
  <button
    onClick={toggleExpanded}
    className="text-[9px] text-muted-foreground underline mt-1.5"
  >
    + détails
  </button>
)}

</div>


<div className="text-right">

<div className="text-[8px] uppercase text-muted-foreground">
STATUS
</div>

<div className="text-xs uppercase flex items-center justify-end gap-1.5">
{translateStatus(p.status)}<StatusDot status={p.status} />
</div>

<div className="text-[8px] uppercase text-muted-foreground mt-1.5">
COLIS
</div>

<div className="text-xs">
{p.orders.length}
</div>

<div className="text-[8px] uppercase text-muted-foreground mt-1.5">
TOTAL
</div>

<div className="text-xs">
{p.total} MAD
</div>

<div className="text-[10px] mt-1.5">
{new Date(p.created_at).toLocaleDateString()}
</div>

{isExpanded && (
  <button
    onClick={toggleExpanded}
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

      <section className="mb-12">

        <h2 className="font-display text-base tracking-[0.2em] mb-3">
          FACTURES SENDIT ({invoicesTotal})
        </h2>

        <div className="flex flex-wrap items-center gap-2 mb-3">

          <input
            type="date"
            value={invoiceStartDate}
            onChange={(e) => setInvoiceStartDate(e.target.value)}
            className="border border-border px-2 py-1.5 text-xs bg-transparent"
          />

          <input
            type="date"
            value={invoiceEndDate}
            onChange={(e) => setInvoiceEndDate(e.target.value)}
            className="border border-border px-2 py-1.5 text-xs bg-transparent"
          />

          <input
            type="text"
            value={invoiceSearch}
            onChange={(e) => setInvoiceSearch(e.target.value)}
            placeholder="Code / commentaire..."
            className="border border-border px-3 py-1.5 text-xs flex-1 min-w-[160px] bg-transparent"
          />

          <button
            onClick={() => {
              setInvoicesPage(1);
              loadInvoices(1);
            }}
            className="border border-primary px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] hover:bg-primary hover:text-primary-foreground"
          >
            Filtrer
          </button>

        </div>

        <div className="border border-border divide-y divide-border">

          {loadingInvoices ? (
            <div className="p-3 text-xs text-muted-foreground">Chargement...</div>
          ) : invoices.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">Aucune facture</div>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.code}
                onClick={() => openInvoiceDetail(inv.code)}
                className="p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/10"
              >

                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-display tracking-[0.1em] shrink-0">
                    {inv.code}
                  </span>
                  <span className="text-[9px] text-muted-foreground shrink-0">
                    {inv.date}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[9px] uppercase flex items-center gap-1.5">
                    <StatusDot status={inv.status} />
                    {translateStatus(inv.status)}
                  </span>
                  <span className="text-xs font-display text-primary-hi w-20 text-right">
                    {inv.amount} MAD
                  </span>
                </div>

              </div>
            ))
          )}

        </div>

        <div className="flex items-center justify-between mt-3 text-[10px] uppercase tracking-[0.15em]">

          <button
            onClick={() => setInvoicesPage((p) => Math.max(1, p - 1))}
            disabled={invoicesPage <= 1}
            className="border border-border px-3 py-1 disabled:opacity-40"
          >
            ←
          </button>

          <span className="text-muted-foreground normal-case tracking-normal">
            Page {invoicesPage} / {invoicesLastPage} ({invoicesTotal} factures)
          </span>

          <button
            onClick={() => setInvoicesPage((p) => Math.min(invoicesLastPage, p + 1))}
            disabled={invoicesPage >= invoicesLastPage}
            className="border border-border px-3 py-1 disabled:opacity-40"
          >
            →
          </button>

        </div>

      </section>

      <section className="mb-12">

        <h2 className="font-display text-base tracking-[0.2em] mb-3">
          ALL-IN-ONE LEDGER ({unified.length})
        </h2>


        <div className="border border-border overflow-x-auto">

          <table className="w-full text-[10px]">

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
                    className="px-2 py-1.5 text-left whitespace-nowrap"
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

                  <td className="px-2 py-1.5">
                    #{r.order_id}
                  </td>

                  <td className="px-2 py-1.5">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>

                  <td className="px-2 py-1.5 uppercase">
                    {r.status}
                  </td>

                  <td className="px-2 py-1.5">
                    {r.product_name}
                  </td>

                  <td className="px-2 py-1.5">
                    {r.size ?? "—"}
                  </td>

                  <td className="px-2 py-1.5">
                    {r.color ?? "—"}
                  </td>

                  <td className="px-2 py-1.5">
                    {r.quantity}
                  </td>

                  <td className="px-2 py-1.5">
                    {r.unit_price}
                  </td>

                  <td className="px-2 py-1.5">
                    {r.line_total}
                  </td>

                  <td className="px-2 py-1.5">
                    {r.customer_name}
                  </td>

                  <td className="px-2 py-1.5">
                    {r.customer_email}
                  </td>

                  <td className="px-2 py-1.5">
                    {r.customer_phone}
                  </td>

                  <td className="px-2 py-1.5">
                    {r.customer_city}
                  </td>

                  <td className="px-2 py-1.5">
                    {r.customer_address}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </section>

      {selectedOrder && (

        <>

          <div
            onClick={closeDrawer}
            className="fixed inset-0 bg-black/40 z-40"
          />

          <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-background border-l border-border z-50 overflow-y-auto p-4">

            <div className="flex items-center justify-between mb-4">

              <div className="text-sm font-display tracking-[0.15em] text-primary-hi">
                #{selectedOrder.display_id}
              </div>

              <button
                onClick={closeDrawer}
                className="border border-border px-2 py-1 text-[9px] uppercase tracking-[0.1em]"
              >
                Fermer
              </button>

            </div>

            <div className="text-[9px] uppercase tracking-[0.15em] flex items-center gap-1.5 mb-4">
              <StatusDot status={selectedOrder.status?.trim().toLowerCase()} />
              {translateStatus(selectedOrder.status)}
            </div>

            {selectedOrder.shipping_label_url && (
              <a
                href={selectedOrder.shipping_label_url}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  block
                  border
                  border-primary
                  px-2
                  py-1.5
                  text-[9px]
                  text-center
                  uppercase
                  tracking-[0.1em]
                  mb-4
                  hover:bg-primary
                  hover:text-primary-foreground
                "
              >
                Bordereau
              </a>
            )}

            <div className="space-y-3 mb-4">

              {/* CLIENT */}
              <div className="border border-border p-3">

                <div className="text-[8px] uppercase tracking-[0.2em] text-primary-hi mb-2">
                  CLIENT
                </div>

                <div className="space-y-1.5">

                  <div>
                    <div className="text-[8px] uppercase text-muted-foreground">Nom</div>
                    <div className="mt-0.5 text-xs">{selectedOrder.customer_name}</div>
                  </div>

                  <div>
                    <div className="text-[8px] uppercase text-muted-foreground">Téléphone</div>
                    <div className="mt-0.5 text-xs">{selectedOrder.customer_phone}</div>
                  </div>

                  <div>
                    <div className="text-[8px] uppercase text-muted-foreground">Email</div>
                    <div className="mt-0.5 text-xs break-all">{selectedOrder.customer_email}</div>
                  </div>

                </div>

              </div>

              {/* LIVRAISON */}
              <div className="border border-border p-3">

                <div className="text-[8px] uppercase tracking-[0.2em] text-primary-hi mb-2">
                  LIVRAISON
                </div>

                <div className="space-y-1.5">

                  <div>
                    <div className="text-[8px] uppercase text-muted-foreground">Ville</div>
                    <div className="mt-0.5 text-xs">{selectedOrder.customer_city}</div>
                  </div>

                  <div>
                    <div className="text-[8px] uppercase text-muted-foreground">District</div>
                    <div className="mt-0.5 text-xs">{selectedOrder.customer_district ?? "—"}</div>
                  </div>

                  <div>
                    <div className="text-[8px] uppercase text-muted-foreground">Adresse</div>
                    <div className="mt-0.5 text-xs leading-relaxed">{selectedOrder.customer_address}</div>
                  </div>

                </div>

              </div>

              {/* SENDIT */}
              {selectedOrder.tracking_number && (
                <div className="border border-border p-3">

                  <div className="text-[8px] uppercase tracking-[0.2em] text-primary-hi mb-2">
                    SENDIT
                  </div>

                  <div className="space-y-1.5">

                    <div>
                      <div className="text-[8px] uppercase text-muted-foreground">Tracking</div>
                      <div className="mt-0.5 text-xs font-display tracking-[0.1em]">
                        {selectedOrder.tracking_number}
                      </div>
                    </div>

                    <div>
                      <div className="text-[8px] uppercase text-muted-foreground">Status</div>
                      <div className="mt-0.5 text-xs uppercase flex items-center gap-1.5">
                        <StatusDot status={selectedOrder.shipping_status} />
                        {translateStatus(selectedOrder.shipping_status)}
                      </div>
                    </div>

                    {selectedOrder.pickup_code && (
                      <>
                        <div className="pt-1.5 border-t border-border mt-1.5">
                          <div className="text-[8px] uppercase text-muted-foreground">Pickup</div>
                          <div className="mt-0.5 text-xs font-display tracking-[0.1em]">
                            {selectedOrder.pickup_code}
                          </div>
                        </div>

                        <div>
                          <div className="text-[8px] uppercase text-muted-foreground">Pickup status</div>
                          <div className="mt-0.5 text-xs uppercase flex items-center gap-1.5">
                            <StatusDot status={selectedOrder.pickup_status} />
                            {translateStatus(selectedOrder.pickup_status)}
                          </div>
                        </div>
                      </>
                    )}

                  </div>

                </div>
              )}

            </div>

            {selectedOrder.status?.trim().toLowerCase() === "pending" && !selectedOrder.tracking_number && (
              <button
                onClick={() => handleConfirmOrder(selectedOrder)}
                disabled={confirmingOrderFor === selectedOrder.id}
                className="w-full border border-primary py-1.5 text-[9px] uppercase tracking-[0.15em] hover:bg-primary hover:text-primary-foreground disabled:opacity-50 mb-4"
              >
                {confirmingOrderFor === selectedOrder.id ? "VALIDATION..." : "VALIDER LA COMMANDE"}
              </button>
            )}

            {selectedOrder.status?.trim().toLowerCase() === "confirmed" && !selectedOrder.tracking_number && (
              <button
                onClick={() => handleCreateShipment(selectedOrder)}
                disabled={creatingShipmentFor === selectedOrder.id}
                className="w-full border border-primary py-1.5 text-[9px] uppercase tracking-[0.15em] hover:bg-primary hover:text-primary-foreground disabled:opacity-50 mb-4"
              >
                {creatingShipmentFor === selectedOrder.id ? "CREATION..." : "CREER LE COLIS"}
              </button>
            )}

            {(selectedOrder.return_code || selectedOrder.shipping_status_return) && (
              <div className="border border-red-600 p-3 mb-4">

                <div className="text-[9px] text-red-600 uppercase tracking-[0.15em] mb-2">
                  ⚠ Retour
                </div>

                <div className="space-y-1.5 text-xs">

                  {selectedOrder.return_code && (
                    <div>
                      <span className="text-[8px] uppercase text-muted-foreground block">Code retour</span>
                      {selectedOrder.return_code}
                    </div>
                  )}

                  {selectedOrder.return_status && (
                    <div>
                      <span className="text-[8px] uppercase text-muted-foreground block">Status</span>
                      <span className="flex items-center gap-1.5">
                        <StatusDot status={selectedOrder.return_status} />
                        {selectedOrder.return_status}
                      </span>
                    </div>
                  )}

                  {selectedOrder.shipping_status_return && (
                    <div>
                      <span className="text-[8px] uppercase text-muted-foreground block">Status Sendit</span>
                      {selectedOrder.shipping_status_return}
                    </div>
                  )}

                  {selectedOrder.return_reason && (
                    <div>
                      <span className="text-[8px] uppercase text-muted-foreground block">Raison</span>
                      {selectedOrder.return_reason}
                    </div>
                  )}

                  {selectedOrder.return_created_at && (
                    <div>
                      <span className="text-[8px] uppercase text-muted-foreground block">Demandé le</span>
                      {new Date(selectedOrder.return_created_at).toLocaleString()}
                    </div>
                  )}

                </div>

              </div>
            )}

            {selectedOrder.tracking_number &&
              !selectedOrder.return_code &&
              RETURN_ELIGIBLE_STATUSES.includes(selectedOrder.shipping_status) && (
              <button
                onClick={() => handleCreateReturn(selectedOrder)}
                disabled={creatingReturnFor === selectedOrder.id}
                className="w-full border border-red-600 text-red-600 py-1.5 text-[9px] uppercase tracking-[0.15em] hover:bg-red-600 hover:text-white disabled:opacity-50 mb-4"
              >
                {creatingReturnFor === selectedOrder.id ? "DEMANDE..." : "DEMANDER UN RETOUR"}
              </button>
            )}

            <div className="border-t border-border pt-3 mb-4 flex justify-between items-end">

              <div>
                <div className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  PRODUITS
                </div>
                <div className="text-xs">
                  {(selectedOrder.order_items ?? [])
                    .map((item: OrderItem) => `${item.product_name} ×${item.quantity}`)
                    .join(", ")}
                </div>
              </div>

              <div className="text-right">
                <div className="text-base font-display text-primary-hi">
                  {selectedOrder.total} MAD
                </div>
                <div className="text-[8px] uppercase text-muted-foreground">
                  {selectedOrder.subtotal} + {selectedOrder.shipping_fee} livraison
                </div>
              </div>

            </div>

            <div className="flex items-center justify-between border border-border p-3 mb-4">

              <div>
                <div className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  Remboursement
                </div>
                <div className="text-xs">
                  {selectedOrder.refunded ? "Remboursée" : "Non remboursée"}
                </div>
              </div>

              <button
                onClick={handleToggleRefund}
                disabled={savingRefund}
                className={`
                  border px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] disabled:opacity-50
                  ${selectedOrder.refunded
                    ? "border-border hover:bg-muted"
                    : "border-primary hover:bg-primary hover:text-primary-foreground"}
                `}
              >
                {savingRefund
                  ? "..."
                  : selectedOrder.refunded
                  ? "MARQUER NON REMBOURSÉE"
                  : "MARQUER REMBOURSÉE"}
              </button>

            </div>

            <div className="mb-4">

              <div className="text-[8px] uppercase tracking-[0.2em] text-primary-hi mb-2">
                Notes admin
              </div>

              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={3}
                placeholder="Note interne, visible uniquement par toi..."
                className="w-full border border-border p-2 text-xs bg-transparent resize-none"
              />

              <button
                onClick={handleSaveNotes}
                disabled={savingNotes || notesDraft === (selectedOrder.admin_notes ?? "")}
                className="mt-2 border border-primary px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
              >
                {savingNotes ? "ENREGISTREMENT..." : "ENREGISTRER LA NOTE"}
              </button>

            </div>

            <div>

              <div className="text-[8px] uppercase tracking-[0.2em] text-primary-hi mb-2">
                HISTORIQUE
              </div>

              {loadingEvents ? (
                <div className="text-xs text-muted-foreground">Chargement...</div>
              ) : (
                <div className="space-y-2">

                  {TIMELINE_STEPS.map((step) => {

                    if (step.key === "created") {
                      return (
                        <div key={step.key} className="flex items-center gap-2 text-xs">
                          <span className="w-2 h-2 rounded-full shrink-0 bg-black" />
                          <span>{step.label}</span>
                          <span className="text-[9px] text-muted-foreground ml-auto">
                            {selectedOrder.created_at
                              ? new Date(selectedOrder.created_at).toLocaleString()
                              : ""}
                          </span>
                        </div>
                      );
                    }

                    const matched = orderEvents.find((e) => {
                      const eventKey = e.event ?? e.event_type ?? "";
                      return mapEventToStep(eventKey) === step.key;
                    });

                    return (
                      <div key={step.key} className="flex items-center gap-2 text-xs">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${matched ? "bg-black" : "bg-gray-300"}`}
                        />
                        <span className={matched ? "" : "text-muted-foreground"}>
                          {step.label}
                        </span>
                        {matched && (
                          <span className="text-[9px] text-muted-foreground ml-auto">
                            {new Date(matched.created_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    );
                  })}

                </div>
              )}

            </div>

          </div>

        </>

      )}

      {selectedInvoice && (

        <>

          <div
            onClick={closeInvoiceDrawer}
            className="fixed inset-0 bg-black/40 z-40"
          />

          <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-background border-l border-border z-50 overflow-y-auto p-4">

            <div className="flex items-center justify-between mb-4">

              <div className="text-sm font-display tracking-[0.15em] text-primary-hi">
                {selectedInvoice.code}
              </div>

              <button
                onClick={closeInvoiceDrawer}
                className="border border-border px-2 py-1 text-[9px] uppercase tracking-[0.1em]"
              >
                Fermer
              </button>

            </div>

            {selectedInvoice.status && (
              <div className="text-[9px] uppercase tracking-[0.15em] flex items-center gap-1.5 mb-4">
                <StatusDot status={selectedInvoice.status} />
                {translateStatus(selectedInvoice.status)}
              </div>
            )}

            <div className="flex justify-between items-end mb-4 border-b border-border pb-3">

              <div>
                <div className="text-[8px] uppercase text-muted-foreground">Date</div>
                <div className="text-xs mt-0.5">{selectedInvoice.date ?? "—"}</div>
              </div>

              <div className="text-base font-display text-primary-hi">
                {selectedInvoice.amount ?? "—"} MAD
              </div>

            </div>

            <div className="text-[8px] uppercase tracking-[0.2em] text-primary-hi mb-2">
              DÉTAIL
            </div>

            {loadingInvoiceDetail ? (
              <div className="text-xs text-muted-foreground">Chargement...</div>
            ) : (selectedInvoice.items ?? []).length === 0 ? (
              <div className="text-xs text-muted-foreground">Aucune ligne</div>
            ) : (
              <div className="space-y-2">

                {(selectedInvoice.items ?? []).map((item, i) => (
                  <div key={i} className="border border-border p-2 text-xs">

                    <div className="flex justify-between items-center">
                      <span className="uppercase text-[8px] text-muted-foreground">
                        {item.type}
                      </span>
                      <span className="font-display text-primary-hi">
                        {item.amount} MAD
                      </span>
                    </div>

                    <div className="mt-1">{item.code}</div>

                    {item.label && (
                      <div className="text-[9px] text-muted-foreground mt-1">
                        {item.label}
                      </div>
                    )}

                    {item.status && (
                      <div className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1.5">
                        <StatusDot status={item.status} />
                        {translateStatus(item.status)}
                      </div>
                    )}

                    {item.fee !== undefined && (
                      <div className="text-[9px] text-muted-foreground mt-1">
                        Frais : {item.fee} MAD
                      </div>
                    )}

                    {item.date && (
                      <div className="text-[9px] text-muted-foreground mt-1">
                        {item.date}
                      </div>
                    )}

                  </div>
                ))}

              </div>
            )}

          </div>

        </>

      )}

    </>
  );
};

