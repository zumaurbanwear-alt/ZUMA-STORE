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

    const { page, startDate, endDate, querystring } = req.query;

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

    const params = new URLSearchParams();

    if (page) params.set("page", String(page));
    if (startDate) params.set("startDate", String(startDate));
    if (endDate) params.set("endDate", String(endDate));
    if (querystring) params.set("querystring", String(querystring));

    const invoicesUrl = `${process.env.SENDIT_API_URL}/invoices${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    console.log("SENDIT INVOICES URL:", invoicesUrl);

    const invoicesResponse = await fetch(invoicesUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${senditToken}`,
      },
    });

    const invoicesText = await invoicesResponse.text();

    let invoicesJson;

    try {
      invoicesJson = JSON.parse(invoicesText);
    } catch {
      invoicesJson = { raw: invoicesText };
    }

    if (!invoicesResponse.ok) {
      console.error("SENDIT INVOICES ERROR:", invoicesJson);

      return res.status(invoicesResponse.status).json(invoicesJson);
    }

    return res.status(200).json(invoicesJson);

  } catch (error) {

    console.error("SENDIT INVOICES ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });

  }

}
