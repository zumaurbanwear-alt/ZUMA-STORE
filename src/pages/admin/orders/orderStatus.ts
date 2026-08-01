export const STATUS_COLORS: Record<string, string> = {
  pending: "#9CA3AF",
  to_prepare: "#9CA3AF",
  new_destination: "#9CA3AF",
  confirmed: "#DC2626",
  to_pickup: "#DC2626",
  pickedup: "#DC2626",
  warehouse: "#DC2626",
  transit: "#DC2626",
  distributed: "#DC2626",
  delivering: "#DC2626",
  unreachable: "#DC2626",
  postponed: "#DC2626",
  delivered: "#16A34A",
  paid: "#16A34A",
  unpaid: "#DC2626",
  canceled: "#DC2626",
  cancelled: "#DC2626",
  rejected: "#DC2626",
};

export const DEFAULT_STATUS_COLOR = "#9CA3AF";

type OrderStatusLike = {
  shipping_status?: string | null;
  shipping_status_return?: string | null;
  return_code?: string | null;
  pickup_code?: string | null;
  status?: string | null;
};

export const getOrderCategory = (o: OrderStatusLike): string => {
  if (o.shipping_status === "DELIVERED") return "delivered";

  if (
    o.return_code ||
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

export const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "pending", label: "En attente" },
  { key: "confirmed", label: "Confirmée" },
  { key: "pickup", label: "Ramassage" },
  { key: "transit", label: "En transit" },
  { key: "returned", label: "Retour" },
];

export const STATUS_LABELS_FR: Record<string, string> = {
  pending: "En attente",
  to_prepare: "À préparer",
  new_destination: "À changer",
  confirmed: "Confirmée",
  to_pickup: "Ramassage en cours",
  pickedup: "Ramassé",
  warehouse: "Entrepôt",
  transit: "En transit",
  distributed: "Distribué",
  delivering: "En cours de livraison",
  unreachable: "Injoignable",
  postponed: "Reporté",
  delivered: "Livré",
  canceled: "Annulé",
  cancelled: "Annulé",
  rejected: "Refusé",
};

export const translateStatus = (status: string | null | undefined): string => {
  if (!status) return "—";
  const key = status.trim().toLowerCase();
  return STATUS_LABELS_FR[key] ?? status;
};

type LedgerStatusLike = {
  shipping_status?: string | null;
};

export const getLedgerStatusLabel = (o: LedgerStatusLike): string => {
  if (o.shipping_status === "DELIVERED") return "Livrée";
  return "Confirmée";
};

export const RETURN_ELIGIBLE_STATUSES = [
  "DELIVERED",
  "REJECTED",
  "UNREACHABLE",
  "POSTPONED",
  "CANCELED",
];

export const TIMELINE_STEPS: { key: string; label: string }[] = [
  { key: "created", label: "Commande créée" },
  { key: "confirmed", label: "Confirmée" },
  { key: "shipment_created", label: "Colis créé" },
  { key: "pickup_requested", label: "Ramassage" },
  { key: "transit", label: "En transit" },
  { key: "delivered", label: "Livrée" },
];

export const TRANSIT_RAW_STATUSES = [
  "warehouse",
  "transit",
  "distributed",
  "delivering",
  "to_pickup",
  "pickedup",
  "unreachable",
  "postponed",
];

export const mapEventToStep = (eventKey: string): string | null => {
  const k = (eventKey ?? "").toLowerCase();

  if (k === "confirmed") return "confirmed";
  if (k === "shipment_created") return "shipment_created";
  if (k === "pickup_requested") return "pickup_requested";
  if (k === "delivered") return "delivered";
  if (TRANSIT_RAW_STATUSES.includes(k)) return "transit";

  return null;
};

export const escapeCsvField = (value: unknown) => {
  const str = String(value ?? "");

  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
};
