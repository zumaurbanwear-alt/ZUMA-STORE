import { createClient } from "@supabase/supabase-js";

// District de destination pour les retours — même valeur que
// pickup_district_id ailleurs dans le code (538). À vérifier /
// ajuster si ce n'est pas le bon entrepôt pour les retours.
const RETURN_DISTRICT_ID = 538;

function parseReturnResponse(json) {
  const data = json.data ?? json;

  return {
    return_code: data.code ?? null,
    return_status: data.status ?? "PENDING",
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

    const { orderId, reason } = req.body;

    if (!orderId) {
      return res.status(400).json({
        error: "orderId required",
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

    // Idempotence : une demande de retour existe déjà pour ce colis.
    if (order.return_code) {

      console.log(
        "SENDIT RETURN: déjà demandé pour",
        order.id,
        order.return_code
      );

      return res.status(200).json({
        success: true,
        already_created: true,
        return_code: order.return_code,
        return_status: order.return_status,
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

    const payload = {
      type: "WAREHOUSE",
      district_id: RETURN_DISTRICT_ID,
      name: order.customer_name,
      phone: String(order.customer_phone)
        .replace(/\s+/g, "")
        .replace(/^(\+212|212)/, "0"),
      address: order.customer_address,
      note: reason ?? "",
      deliveries: order.tracking_number,
    };

    console.log(
      "RETURN PAYLOAD:",
      JSON.stringify(payload, null, 2)
    );

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

    console.log("RETURN STATUS:", returnResponse.status);
    console.log("RETURN BODY:", returnText);

    let returnJson;

    try {
      returnJson = JSON.parse(returnText);
    } catch {
      returnJson = { raw: returnText };
    }

    if (!returnResponse.ok || returnJson.success === false) {
      console.error(
        "RETURN ERROR:",
        JSON.stringify(returnJson, null, 2)
      );

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

  } catch (error) {

    console.error("SENDIT RETURN ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });

  }

}
