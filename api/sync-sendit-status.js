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
  const data = json.data ?? json;

  return {
    pickup_status: data.status ?? null,
    deliveries: data.deliveries ?? {},
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
        pickup_status,
        customer_phone
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

    const withPickup = orders.filter((o) => o.pickup_code);
    const withoutPickup = orders.filter((o) => !o.pickup_code);

    const uniquePickupCodes = [
      ...new Set(withPickup.map((o) => o.pickup_code)),
    ];

    const pickupDataByCode = {};

    for (const pickupCode of uniquePickupCodes) {

      try {

        const pickupUrl = `${process.env.SENDIT_API_URL}/pickups/${pickupCode}`;

        const pickupResponse = await fetch(
          pickupUrl,
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

        let deliveryInPickup =
          pickupData.deliveries[order.tracking_number];

        let newTrackingNumber = null;

        if (!deliveryInPickup && order.customer_phone) {
          const knownTrackings = new Set(
            orders.map((o) => o.tracking_number).filter(Boolean)
          );

          const orphanCodes = Object.keys(
            pickupData.deliveries ?? {}
          ).filter((code) => !knownTrackings.has(code));

          for (const code of orphanCodes) {
            try {
              const detailResponse = await fetch(
                `${process.env.SENDIT_API_URL}/deliveries/${code}`,
                {
                  method: "GET",
                  headers: { Authorization: `Bearer ${senditToken}` },
                }
              );

              const detailJson = await detailResponse.json();

              if (!detailResponse.ok) continue;

              const detailData = detailJson.data ?? detailJson;

              const senditPhone = (
                detailData.receiver_phone ??
                detailData.phone ??
                ""
              ).replace(/\D/g, "");

              const orderPhone = order.customer_phone.replace(/\D/g, "");

              if (senditPhone && orderPhone && senditPhone.endsWith(orderPhone.slice(-9))) {
                newTrackingNumber = code;
                deliveryInPickup = pickupData.deliveries[code];
                break;
              }
            } catch (err) {
              console.error("SYNC ORPHAN DETAIL ERROR:", code, err);
            }
          }
        }

        if (newTrackingNumber) {
          updates.tracking_number = newTrackingNumber;
        }

        const deliveryStatus = deliveryInPickup?.status ?? null;
        const deliveryLastActionAt = deliveryInPickup?.last_action_at ?? null;

        if (deliveryStatus && deliveryStatus !== order.shipping_status) {
          updates.shipping_status = deliveryStatus;
        }

        if (deliveryLastActionAt) {
          updates.shipping_last_action_at = deliveryLastActionAt;

          if (deliveryStatus === "DELIVERED") {
            updates.delivered_at = deliveryLastActionAt;
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

    const {
      data: returnOrders,
      error: returnOrdersError,
    } = await supabase
      .from("orders")
      .select("id, return_code, return_status")
      .not("return_code", "is", null);

    if (returnOrdersError) {
      errors.push({
        context: "return_orders_fetch",
        error: returnOrdersError.message,
      });
    } else {

      for (const order of returnOrders ?? []) {

        try {

          const returnResponse = await fetch(
            `${process.env.SENDIT_API_URL}/returns/${order.return_code}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${senditToken}`,
              },
            }
          );

          const returnText = await returnResponse.text();

          let returnJson;

          try {
            returnJson = JSON.parse(returnText);
          } catch {
            returnJson = { raw: returnText };
          }

          if (!returnResponse.ok) {
            console.error("SYNC RETURN ERROR:", order.return_code, returnJson);
            errors.push({ order_id: order.id, error: returnJson });
            continue;
          }

          const data = returnJson.data ?? returnJson;
          const newReturnStatus = data.status ?? null;

          if (newReturnStatus && newReturnStatus !== order.return_status) {

            const { error: updateError } = await supabase
              .from("orders")
              .update({ return_status: newReturnStatus })
              .eq("id", order.id);

            if (updateError) {
              console.error("SYNC RETURN UPDATE ERROR:", order.id, updateError);
              errors.push({ order_id: order.id, error: updateError });
            } else {

              updatedCount++;

              const { error: eventError } = await supabase
                .from("order_events")
                .insert({
                  order_id: order.id,
                  event: "return_status_update",
                  message: `Statut retour → ${newReturnStatus}`,
                });

              if (eventError) {
                console.error("ORDER_EVENTS INSERT ERROR:", eventError);
              }
            }
          }

        } catch (err) {
          console.error("SYNC RETURN FETCH ERROR:", order.return_code, err);
          errors.push({ order_id: order.id, error: err.message });
        }
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
