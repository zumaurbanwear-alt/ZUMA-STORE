import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {

  if (req.method !== "GET") {
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

    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        error: "code required",
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

    const detailResponse = await fetch(
      `${process.env.SENDIT_API_URL}/invoices/${encodeURIComponent(code)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${senditToken}`,
        },
      }
    );

    const detailText = await detailResponse.text();

    let detailJson;

    try {
      detailJson = JSON.parse(detailText);
    } catch {
      detailJson = { raw: detailText };
    }

    if (!detailResponse.ok) {
      console.error("SENDIT INVOICE DETAIL ERROR:", detailJson);

      return res.status(detailResponse.status).json(detailJson);
    }

    return res.status(200).json(detailJson);

  } catch (error) {

    console.error("SENDIT INVOICE DETAIL ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });

  }

}
