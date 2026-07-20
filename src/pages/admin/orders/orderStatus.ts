// Constantes et fonctions pures liées au statut des commandes / Sendit.
// Extrait de AdminOrdersPanel.tsx — aucune de ces valeurs ne dépend de
// l'état du composant, donc rien ne change fonctionnellement en les
// déplaçant ici.

// Couleur par statut — modifie les valeurs hex ici pour ajuster.
// pending = gris, confirmed = rouge, delivered = rouge (tel que demandé).
export const STATUS_COLORS: Record<string, string> = {
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

export const DEFAULT_STATUS_COLOR = "#9CA3AF";

// Regroupe le statut interne (pending/confirmed) et le statut Sendit
// (shipping_status) en une seule catégorie, pour les filtres et les stats.
export const getOrderCategory = (o: any): string => {
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
  { key: "delivered", label: "Livrée" },
  { key: "returned", label: "Retour" },
];

// Libellés français pour tous les statuts affichés (interne + Sendit brut).
// Les valeurs Sendit viennent de GET /all-status-deliveries. Fallback :
// affiche la valeur brute telle quelle si elle n'est pas dans la liste
// (utile pour les statuts de retour, dont on ne connaît pas encore
// toutes les valeurs possibles).
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

// Un retour n'a de sens que si Sendit a déjà tenté/terminé la livraison.
// En dehors de ces statuts, l'API Sendit refuse la demande (comme on
// vient de le voir : "colis invalide" tant qu'il est encore en transit).
export const RETURN_ELIGIBLE_STATUSES = [
  "DELIVERED",
  "REJECTED",
  "UNREACHABLE",
  "POSTPONED",
  "CANCELED",
];

// Étapes fixes de la timeline affichée dans le drawer. "created" n'a pas
// d'event loggé (la commande naît au checkout, hors admin) — on utilise
// directement created_at pour cette étape-là.
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

// Les events loggés par sync/webhook portent le statut Sendit brut en
// minuscule (ex: "transit", "delivered") ; ceux loggés par les actions
// admin portent une clé fixe ("confirmed", "shipment_created", ...).
export const mapEventToStep = (eventKey: string): string | null => {
  const k = (eventKey ?? "").toLowerCase();

  if (k === "confirmed") return "confirmed";
  if (k === "shipment_created") return "shipment_created";
  if (k === "pickup_requested") return "pickup_requested";
  if (k === "delivered") return "delivered";
  if (TRANSIT_RAW_STATUSES.includes(k)) return "transit";

  return null;
};

// Échappe une valeur pour l'export CSV (guillemets, virgules, retours ligne).
export const escapeCsvField = (value: any) => {
  const str = String(value ?? "");

  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
};
