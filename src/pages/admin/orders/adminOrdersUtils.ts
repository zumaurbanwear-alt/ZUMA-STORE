import type { AdminOrder, AdminPickup } from "./types";

export type AdminOrdersPickupRow = {
  pickup_code?: string | null;
  pickup_status?: string | null;
  pickup_created_at?: string | null;
  tracking_number?: string | null;
  customer_name?: string | null;
  total?: number | string | null;
};

export const buildPickupGroups = (rows: AdminOrdersPickupRow[] | null | undefined): AdminPickup[] => {
  const grouped = Object.values(
    (rows ?? []).reduce<Record<string, AdminPickup>>((acc, row) => {
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

  return grouped;
};

export const buildOrdersCsvRows = (orders: AdminOrder[]) =>
  orders.map((o) => [
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
