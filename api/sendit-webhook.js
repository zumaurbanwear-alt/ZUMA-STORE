import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Signature verification needs the raw, unparsed request body — so we
// disable Next.js's automatic body parsing (harmless if this runs as a
// plain Vercel serverless function instead of a Next.js API route).
export const config = {
  api: {
    bodyParser: false,
  },
};

// Statuts qui déclenchent automatiquement une demande de retour.
const AUTO_RETURN_STATUSES = ["REJECTED"];

// Destination du retour : HOME = livré à ton adresse automatiquement,
// WAREHOUSE = tu dois aller le chercher à l'entrepôt Sendit.
const RETURN_TYPE = "HOME";
const RETURN_DISTRICT_ID = 538;

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function verifySignature(rawBody, signature, secret) {
  // Si aucun secret n'est configuré en dev, on laisse passer avec un warning
  if (!secret) {
    console.warn("SENDIT WEBHOOK WARNING: SENDIT_WEBHOOK_SECRET non défini dans les variables d'environnement.");
    return true;
  }

  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch {
    return false;
  }
}

async function autoCreateReturn(supabase, order) {
  if (order.return_code) return;

  const returnDistrictId =
    RETURN_TYPE === "HOME" ? order.sendit_district_id : RETURN_DISTRICT_ID;

  if (!returnDistrictId) {
    console.error(
      "AUTO RETURN: pas de district Sendit sur la commande",
      order.id
    );
    return;
  }

  try {
    const loginResponse = await fetch(
      `${process.env.SENDIT_API_URL || "https://api.sendit.ma/v1"}/login`,
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
      console.error("AUTO RETURN — SENDIT LOGIN:", loginJson);
      return;
    }

    const senditToken = loginJson.data.token;

    const payload = {
      type: RETURN_TYPE,
      district_id: returnDistrictId,
      name: order.customer_name,
      phone: String(order.customer_phone)
        .replace(/\s+/g, "")
        .replace(/^(\+212|212)/, "0"),
      address: order.customer_address,
      note: "Retour automatique — colis refusé (REJECTED)",
      deliveries: order.tracking_number,
    };

    console.log("AUTO RETURN PAYLOAD:", JSON.stringify(payload, null, 2));

    const returnResponse = await fetch(
      `${process.env.SENDIT_API_URL || "https://api.sendit.ma/v1"}/returns`,
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
      console.error("AUTO RETURN ERROR:", JSON.stringify(returnJson, null, 2));
      return;
    }

    const data = returnJson.data ?? returnJson;
    const returnCode = data.code ?? null;
    const returnStatus = data.status ?? "PENDING";

    if (!returnCode) {
      console.error("AUTO RETURN: pas de code retourné par Sendit");
      return;
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        return_code: returnCode,
        return_status: returnStatus,
        return_reason: "Retour automatique — colis refusé (REJECTED)",
        return_created_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .is("return_code", null);

    if (updateError) {
      console.error("AUTO RETURN — UPDATE ERROR:", updateError);
      return;
    }

    console.log(`AUTO RETURN: ${returnCode} créé pour la commande ${order.id}`);

    const { error: eventError } = await supabase
      .from("order_events")
      .insert({
        order_id: order.id,
        event: "return_requested",
        message: `Retour automatique demandé — ${returnCode} (colis refusé)`,
      });

    if (eventError) {
      console.error("ORDER_EVENTS INSERT ERROR:", eventError);
    }
  } catch (err) {
    console.error("AUTO RETURN — UNEXPECTED ERROR:", err);
  }
}

export default async function handler(req, res) {
  // 1. Accepter les requêtes GET et HEAD (utilisées par les pings de vérification/tests)
  if (req.method === "GET" || req.method === "HEAD") {
    return res.status(200).json({
      status: "online",
      message: "Sendit Webhook Endpoint est actif et opérationnel.",
    });
  }

  // 2. Refuser toutes les méthodes autres que POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Ce webhook n'accepte que les requêtes POST.",
    });
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers["x-sendit-signature"];

    const isValid = verifySignature(
      rawBody,
      signature,
      process.env.SENDIT_WEBHOOK_SECRET
    );

    if (!isValid) {
      console.error("SENDIT WEBHOOK: signature invalide ou absente");
      return res.status(401).json({
        error: "Invalid signature",
      });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({
        error: "Invalid JSON",
      });
    }

    console.log(
      "SENDIT WEBHOOK PAYLOAD:",
      JSON.stringify(payload, null, 2)
    );

    if (payload.event !== "delivery.status.update") {
      return res.status(200).json({
        success: true,
        ignored: true,
      });
    }

    const {
      code,
      oldStatus,
      newStatus,
      lastActionAt,
      message,
      proofImage,
      deliverBy,
      counterUnreachable,
    } = payload;

    if (!code || !newStatus) {
      return res.status(400).json({
        error: "Missing code or newStatus",
      });
    }

    // Connexion Supabase avec fallback sur la clé d'API publique si la Service Role Key est absente
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const updates = {
      shipping_status: newStatus,
      shipping_last_action_at: lastActionAt ?? new Date().toISOString(),
    };

    if (newStatus === "DELIVERED") {
      updates.delivered_at = lastActionAt ?? new Date().toISOString();
    }

    if (message) {
      updates.shipping_last_message = message;
    }

    if (proofImage) {
      updates.shipping_proof_image = proofImage;
    }

    if (deliverBy) {
      updates.shipping_deliver_by = deliverBy;
    }

    if (typeof counterUnreachable === "number") {
      updates.shipping_unreachable_count = counterUnreachable;
    }

    const { data: updatedRows, error: updateError } = await supabase
      .from("orders")
      .update(updates)
      .eq("tracking_number", code)
      .select();

    if (updateError) {
      console.error("SENDIT WEBHOOK UPDATE ERROR:", updateError);
      return res.status(500).json({
        error: updateError.message,
      });
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.warn(
        "SENDIT WEBHOOK: aucune commande trouvée pour le tracking",
        code
      );
    } else {
      console.log(
        `SENDIT WEBHOOK: ${code} ${oldStatus ?? "?"} → ${newStatus}`
      );

      const order = updatedRows[0];

      const { error: eventError } = await supabase
        .from("order_events")
        .insert({
          order_id: order.id,
          event: newStatus.toLowerCase(),
          message: message
            ? `Statut Sendit → ${newStatus} (${message})`
            : `Statut Sendit → ${newStatus}`,
        });

      if (eventError) {
        console.error("ORDER_EVENTS INSERT ERROR:", eventError);
      }

      if (AUTO_RETURN_STATUSES.includes(newStatus)) {
        await autoCreateReturn(supabase, order);
      }
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("SENDIT WEBHOOK ERROR:", error);
    return res.status(500).json({
      error: error.message,
    });
  }
}
