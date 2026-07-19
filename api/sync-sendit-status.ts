import { createClient } from "@supabase/supabase-js";

function parseDeliveryStatus(json) {
  const data = json.data ?? json;

  return {
    shipping_status: data.status ?? null,
    shipping_status_return: data.status_return ?? null,
    shipping_last_action_at: data.last_action_at ?? null,
  };
}

function parsePickupPayload(json) {
  // GET /pickups/{code} is NOT wrapped in { success, data } — fields are at the root.
  return {
    pickup_status: json.status ?? null,
    deliveries: json.deliveries ?? {},
  };
}

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {

    const authHeader = req.headers.authorization || "";

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({
        error: "Missing token",
      });
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return res.status(401).json({
        error: "Invalid session",
      });
    }

    const {
      data: adminRole,
    } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return res.status(403).json({
        error: "Admin only",
      });
    }

    const {
      data: orders,
      error: ordersError,
    } = await supabase
      .from("orders")
      .select(`
        id,
        tracking_number,
        pickup_code,
        shipping_status,
        pickup_status
      `)
      .eq("shipping_provider", "sendit")
      .not("tracking_number", "is", null)
      .not("shipping_status", "in", '("DELIVERED","CANCELED","REJECTED")');

    if (ordersError) {
      return res.status(500).json({
        error: ordersError.message,
      });
    }

    if (!orders.length) {
      return res.status(200).json({
        success: true,
        checked: 0,
        updated: 0,
        message: "Aucune commande à synchroniser.",
      });
    }

    const loginResponse = await fetch(
      `${process.env.SENDIT_API_URL}/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public_key: process.env.SENDIT_PUBLIC_KEY,
          secret_key: process.env.SENDIT_SECRET_KEY,
        }),
      }
    );

    const loginJson = await loginResponse.json();

    if (!loginResponse.ok || !loginJson.success) {
      console.error("SENDIT LOGIN:", loginJson);

      return res.status(500).json({
        error: "Impossible de se connecter à Sendit",
        details: loginJson,
      });
    }

    const senditToken = loginJson.data.token;

    let updatedCount = 0;
    const errors = [];

    // Orders already attached to a pickup: batch-fetch via GET /pickups/{code},
    // one call per unique pickup_code covers every delivery inside it.
    const withPickup = orders.filter((o) => o.pickup_code);
    const withoutPickup = orders.filter((o) => !o.pickup_code);

    const uniquePickupCodes = [
      ...new Set(withPickup.map((o) => o.pickup_code)),
    ];

    const pickupDataByCode = {};

    for (const pickupCode of uniquePickupCodes) {

      try {

        const pickupResponse = await fetch(
          `${process.env.SENDIT_API_URL}/pickups/${pickupCode}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${senditToken}`,
            },
          }
        );

        const pickupText = await pickupResponse.text();

        let pickupJson;

        try {
          pickupJson = JSON.parse(pickupText);
        } catch {
          pickupJson = { raw: pickupText };
        }

        if (!pickupResponse.ok) {
          console.error("SYNC PICKUP ERROR:", pickupCode, pickupJson);
          errors.push({ pickup_code: pickupCode, error: pickupJson });
          continue;
        }

        pickupDataByCode[pickupCode] = parsePickupPayload(pickupJson);

      } catch (err) {
        console.error("SYNC PICKUP FETCH ERROR:", pickupCode, err);
        errors.push({ pickup_code: pickupCode, error: err.message });
      }
    }

    for (const order of withPickup) {

      try {

        const pickupData = pickupDataByCode[order.pickup_code];

        if (!pickupData) continue;

        const updates = {};

        if (
          pickupData.pickup_status &&
          pickupData.pickup_status !== order.pickup_status
        ) {
          updates.pickup_status = pickupData.pickup_status;
        }

        const deliveryInPickup =
          pickupData.deliveries[order.tracking_number];

        if (
          deliveryInPickup?.status &&
          deliveryInPickup.status !== order.shipping_status
        ) {
          updates.shipping_status = deliveryInPickup.status;
        }

        if (deliveryInPickup?.last_action_at) {
          updates.shipping_last_action_at =
            deliveryInPickup.last_action_at;

          if (deliveryInPickup.status === "DELIVERED") {
            updates.delivered_at = deliveryInPickup.last_action_at;
          }
        }

        if (Object.keys(updates).length > 0) {

          const { error: updateError } = await supabase
            .from("orders")
            .update(updates)
            .eq("id", order.id);

          if (updateError) {
            console.error("SYNC UPDATE ERROR:", order.id, updateError);
            errors.push({ order_id: order.id, error: updateError });
          } else {
            updatedCount++;

            if (updates.shipping_status) {
              const { error: eventError } = await supabase
                .from("order_events")
                .insert({
                  order_id: order.id,
                  event: updates.shipping_status.toLowerCase(),
                  message: `Statut Sendit → ${updates.shipping_status}`,
                });

              if (eventError) {
                console.error("ORDER_EVENTS INSERT ERROR:", eventError);
              }
            }
          }
        }

      } catch (err) {
        console.error("SYNC ORDER ERROR:", order.id, err);
        errors.push({ order_id: order.id, error: err.message });
      }
    }

    // Orders with no pickup yet: one GET /deliveries/{code} call each.
    for (const order of withoutPickup) {

      try {

        const deliveryResponse = await fetch(
          `${process.env.SENDIT_API_URL}/deliveries/${order.tracking_number}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${senditToken}`,
            },
          }
        );

        const deliveryText = await deliveryResponse.text();

        let deliveryJson;

        try {
          deliveryJson = JSON.parse(deliveryText);
        } catch {
          deliveryJson = { raw: deliveryText };
        }

        if (!deliveryResponse.ok) {
          console.error(
            "SYNC DELIVERY ERROR:",
            order.tracking_number,
            deliveryJson
          );
          errors.push({ order_id: order.id, error: deliveryJson });
          continue;
        }

        const parsed = parseDeliveryStatus(deliveryJson);

        const updates = {};

        if (
          parsed.shipping_status &&
          parsed.shipping_status !== order.shipping_status
        ) {
          updates.shipping_status = parsed.shipping_status;
        }

        if (parsed.shipping_status_return) {
          updates.shipping_status_return = parsed.shipping_status_return;
        }

        if (parsed.shipping_last_action_at) {
          updates.shipping_last_action_at = parsed.shipping_last_action_at;

          if (parsed.shipping_status === "DELIVERED") {
            updates.delivered_at = parsed.shipping_last_action_at;
          }
        }

        if (Object.keys(updates).length > 0) {

          const { error: updateError } = await supabase
            .from("orders")
            .update(updates)
            .eq("id", order.id);

          if (updateError) {
            console.error("SYNC UPDATE ERROR:", order.id, updateError);
            errors.push({ order_id: order.id, error: updateError });
          } else {
            updatedCount++;

            if (updates.shipping_status) {
              const { error: eventError } = await supabase
                .from("order_events")
                .insert({
                  order_id: order.id,
                  event: updates.shipping_status.toLowerCase(),
                  message: `Statut Sendit → ${updates.shipping_status}`,
                });

              if (eventError) {
                console.error("ORDER_EVENTS INSERT ERROR:", eventError);
              }
            }
          }
        }

      } catch (err) {
        console.error("SYNC ORDER ERROR:", order.id, err);
        errors.push({ order_id: order.id, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      checked: orders.length,
      updated: updatedCount,
      errors,
    });

  } catch (error) {

    console.error("SYNC SENDIT ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });

  }

}
