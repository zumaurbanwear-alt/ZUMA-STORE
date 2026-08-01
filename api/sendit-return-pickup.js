import { createClient } from "@supabase/supabase-js";


const RETURN_DISTRICT_ID = 538;

const RETURN_TYPE = "HOME";

function parseReturnResponse(json) {
  const data = json.data ?? json;

  return {
    return_code: data.code ?? null,
    return_status: data.status ?? "PENDING",
  };
}

async function loginToSendit() {
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
    return { error: "Impossible de se connecter à Sendit", details: loginJson };
  }

  return { token: loginJson.data.token };
}

async function handleReturn(req, res, supabase) {
  const { orderId, reason } = req.body;

  if (!orderId) {
    return res.status(400).json({
      error: "orderId required",
    });
  }

  const {
    data: order,
    error: orderError,
  } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return res.status(404).json({
      error: "Order not found",
    });
  }

  if (!order.tracking_number) {
    return res.status(400).json({
      error: "Cette commande n'a pas de colis Sendit à retourner.",
    });
  }

  const returnDistrictId =
    RETURN_TYPE === "HOME"
      ? order.sendit_district_id
      : RETURN_DISTRICT_ID;

  if (!returnDistrictId) {
    return res.status(400).json({
      error: "Aucun district Sendit sur cette commande — impossible de créer le retour.",
    });
  }

  if (order.return_code) {
    return res.status(200).json({
      success: true,
      already_created: true,
      return_code: order.return_code,
      return_status: order.return_status,
    });
  }

  const { token: senditToken, error: loginError, details } = await loginToSendit();

  if (loginError) {
    return res.status(500).json({ error: loginError, details });
  }

  const payload = {
    type: RETURN_TYPE,
    district_id: returnDistrictId,
    name: order.customer_name,
    phone: String(order.customer_phone)
      .replace(/\s+/g, "")
      .replace(/^(\+212|212)/, "0"),
    address: order.customer_address,
    note: reason ?? "",
    deliveries: order.tracking_number,
  };

  const returnResponse = await fetch(
    `${process.env.SENDIT_API_URL}/returns`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${senditToken}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const returnText = await returnResponse.text();

  let returnJson;

  try {
    returnJson = JSON.parse(returnText);
  } catch {
    returnJson = { raw: returnText };
  }

  if (!returnResponse.ok || returnJson.success === false) {
    console.error("RETURN ERROR:", JSON.stringify(returnJson, null, 2));

    return res.status(422).json(returnJson);
  }

  const parsed = parseReturnResponse(returnJson);

  if (!parsed.return_code) {
    return res.status(500).json({
      error: "Retour créé mais aucun code retourné par Sendit.",
    });
  }

  const {
    data: updatedRows,
    error: updateError,
  } = await supabase
    .from("orders")
    .update({
      return_code: parsed.return_code,
      return_status: parsed.return_status,
      return_reason: reason ?? null,
      return_created_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .is("return_code", null)
    .select();

  if (updateError) {
    return res.status(500).json({
      error: "Retour créé chez Sendit mais mise à jour base échouée",
      details: updateError,
    });
  }

  if (updatedRows && updatedRows.length > 0) {
    const { error: eventError } = await supabase
      .from("order_events")
      .insert({
        order_id: order.id,
        event: "return_requested",
        message: reason
          ? `Retour demandé — ${parsed.return_code} (${reason})`
          : `Retour demandé — ${parsed.return_code}`,
      });

    if (eventError) {
      console.error("ORDER_EVENTS INSERT ERROR:", eventError);
    }
  }

  return res.status(200).json({
    success: true,
    return_code: parsed.return_code,
    return_status: parsed.return_status,
  });
}

async function handlePickup(req, res, supabase) {
  const {
    data: settings,
    error: settingsError,
  } = await supabase
    .from("shipping_settings")
    .select("*")
    .single();

  if (settingsError || !settings) {
    return res.status(500).json({
      error: "Shipping settings not configured",
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
      shipping_status,
      pickup_code
    `)
    .eq("shipping_provider", "sendit")
    .not("tracking_number", "is", null)
    .is("pickup_code", null);

  if (ordersError) {
    return res.status(500).json({
      error: ordersError.message,
    });
  }

  if (!orders.length) {
    return res.status(400).json({
      error: "Aucun colis en attente de ramassage.",
    });
  }

  const deliveries = orders.map((o) => o.tracking_number).join(",");

  const { token: senditToken, error: loginError, details } = await loginToSendit();

  if (loginError) {
    return res.status(500).json({ error: loginError, details });
  }

  const payload = {
    pickup_district_id: 538,
    district_id: 538,
    name: settings.pickup_name,
    phone: settings.pickup_phone,
    address: settings.pickup_address,
    note: settings.pickup_note ?? "",
    deliveries,
    movements: "",
  };

  const pickupResponse = await fetch(
    `${process.env.SENDIT_API_URL}/pickups`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${senditToken}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const pickupText = await pickupResponse.text();

  let pickupJson;

  try {
    pickupJson = JSON.parse(pickupText);
  } catch {
    pickupJson = { raw: pickupText };
  }

  if (!pickupResponse.ok || pickupJson.success === false) {
    console.error("PICKUP ERROR:", JSON.stringify(pickupJson, null, 2));

    return res.status(422).json(pickupJson);
  }

  const pickupCode = pickupJson.code ?? pickupJson.data?.code ?? null;

  if (!pickupCode) {
    return res.status(500).json({
      error: "Pickup créé mais aucun code retourné par Sendit.",
    });
  }

  const trackingNumbers = orders.map((o) => o.tracking_number).filter(Boolean);

  const { data: updatedOrders, error: updateError } = await supabase
    .from("orders")
    .update({
      pickup_code: pickupCode,
      pickup_status: "PENDING",
      pickup_created_at: new Date().toISOString(),
    })
    .in("tracking_number", trackingNumbers)
    .select("id, tracking_number");

  if (updateError) {
    return res.status(500).json({
      error: "Ramassage créé mais impossible de mettre à jour la base.",
      details: updateError,
    });
  }

  const events = (updatedOrders ?? []).map((o) => ({
    order_id: o.id,
    event: "pickup_requested",
    message: `Ramassage demandé — ${pickupCode}`,
  }));

  if (events.length > 0) {
    const { error: eventsError } = await supabase
      .from("order_events")
      .insert(events);

    if (eventsError) {
      console.error("ORDER_EVENTS INSERT ERROR:", eventsError);
    }
  }

  return res.status(200).json({
    success: true,
    pickup_code: pickupCode,
    deliveries: trackingNumbers.length,
    sendit: pickupJson,
  });
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

    const action = req.body?.action ?? "return";

    if (action === "pickup") {
      return await handlePickup(req, res, supabase);
    }

    return await handleReturn(req, res, supabase);

  } catch (error) {

    console.error("SENDIT RETURN/PICKUP ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });

  }

}
