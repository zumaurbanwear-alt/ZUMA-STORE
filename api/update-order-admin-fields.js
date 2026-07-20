import { createClient } from "@supabase/supabase-js";

// Seuls ces champs peuvent être modifiés par ce endpoint — whitelist
// volontairement stricte pour ne jamais exposer une écriture arbitraire
// sur la table orders depuis le client.
const ALLOWED_FIELDS = ["admin_notes", "refunded"];

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

    const { orderId, fields } = req.body;

    if (!orderId || !fields || typeof fields !== "object") {
      return res.status(400).json({
        error: "orderId and fields required",
      });
    }

    const updates = {};

    for (const key of Object.keys(fields)) {
      if (ALLOWED_FIELDS.includes(key)) {
        updates[key] = fields[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: "No valid fields to update",
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
      data,
      error,
    } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId)
      .select();

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      order: data?.[0] ?? null,
    });

  } catch (error) {

    console.error("UPDATE ORDER ADMIN FIELDS ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });

  }

}
