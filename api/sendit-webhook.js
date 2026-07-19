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

  if (!signature || !secret) return false;

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

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
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
      // Événement inconnu ou futur type non géré — on accuse réception
      // sans erreur pour éviter que Sendit ne réessaie indéfiniment.
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

    // Service role : ce endpoint n'a pas de session utilisateur (appel
    // serveur-à-serveur de Sendit), donc il faut contourner les RLS.
    // SUPABASE_SERVICE_ROLE_KEY doit être définie côté Vercel SANS
    // préfixe VITE_ pour ne jamais finir dans le bundle client.
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

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

    const {
      data: updatedRows,
      error: updateError,
    } = await supabase
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

      const orderId = updatedRows[0].id;

      const { error: eventError } = await supabase
        .from("order_events")
        .insert({
          order_id: orderId,
          event: newStatus.toLowerCase(),
          message: message
            ? `Statut Sendit → ${newStatus} (${message})`
            : `Statut Sendit → ${newStatus}`,
        });

      if (eventError) {
        console.error("ORDER_EVENTS INSERT ERROR:", eventError);
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
