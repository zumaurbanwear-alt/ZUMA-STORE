import { createClient } from "@supabase/supabase-js";

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

    const deliveries = orders
      .map((o) => o.tracking_number)
      .join(",");

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

    const payload = {
  district_id: 538,
  name: "Leyla Sara Louai",
  phone: "0600365283",
  address: "Riad Bouskoura, Lot 13, V18, Bouskoura, Maroc",
  note: "",
  deliveries,
  movements: "",
};

    console.log(
      "PICKUP PAYLOAD:",
      JSON.stringify(payload, null, 2)
    );

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

    console.log("PICKUP STATUS:", pickupResponse.status);
    console.log("PICKUP BODY:", pickupText);

    let pickupJson;

    try {
      pickupJson = JSON.parse(pickupText);
    } catch {
      pickupJson = {
        raw: pickupText,
      };
    }

    if (!pickupResponse.ok || pickupJson.success === false) {
      console.error(
        "PICKUP ERROR:",
        JSON.stringify(pickupJson, null, 2)
      );

      return res.status(422).json(pickupJson);
    }

    const pickupCode =
      pickupJson.code ??
      pickupJson.data?.code ??
      null;

if (!pickupCode) {
  return res.status(500).json({
    error: "Pickup créé mais aucun code retourné par Sendit.",
  });
}

const trackingNumbers = orders
  .map((o) => o.tracking_number)
  .filter(Boolean);

const { error: updateError } = await supabase
  .from("orders")
  .update({
    pickup_code: pickupCode,
    pickup_status: "PENDING",
    pickup_created_at: new Date().toISOString(),
  })
  .in("tracking_number", trackingNumbers);

if (updateError) {
  return res.status(500).json({
    error: "Ramassage créé mais impossible de mettre à jour la base.",
    details: updateError,
  });
}

    return res.status(200).json({
      success: true,
      pickup_code: pickupCode,
      deliveries: trackingNumbers.length,
      sendit: pickupJson,
    });

  } catch (error) {

    console.error("REQUEST PICKUP ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });

  }
}
