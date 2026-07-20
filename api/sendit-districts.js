import { createClient } from "@supabase/supabase-js";

// Sécurité anti-boucle infinie si la pagination Sendit se comporte
// différemment de ce qu'on attend.
const MAX_PAGES = 30;

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

    // La doc ne précise pas si /districts pagine par défaut — on gère
    // les deux cas : réponse à plat, ou paginée comme /invoices et /returns.
    let allDistricts = [];
    let page = 1;
    let lastPage = 1;

    do {

      const districtsUrl = `${process.env.SENDIT_API_URL}/districts?page=${page}`;

      console.log("SENDIT DISTRICTS URL:", districtsUrl);

      const districtsResponse = await fetch(districtsUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${senditToken}`,
        },
      });

      const districtsText = await districtsResponse.text();

      let districtsJson;

      try {
        districtsJson = JSON.parse(districtsText);
      } catch {
        districtsJson = { raw: districtsText };
      }

      if (!districtsResponse.ok) {
        console.error("SENDIT DISTRICTS ERROR:", districtsJson);

        return res.status(districtsResponse.status).json(districtsJson);
      }

      const pageData = Array.isArray(districtsJson.data)
        ? districtsJson.data
        : Array.isArray(districtsJson)
        ? districtsJson
        : [];

      allDistricts = allDistricts.concat(pageData);

      lastPage = districtsJson.last_page ?? 1;
      page++;

      if (pageData.length === 0) break;

    } while (page <= lastPage && page <= MAX_PAGES);

    return res.status(200).json({
      success: true,
      total: allDistricts.length,
      districts: allDistricts,
    });

  } catch (error) {

    console.error("SENDIT DISTRICTS ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });

  }

}
