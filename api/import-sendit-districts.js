import { createClient } from "@supabase/supabase-js";

const SENDIT_URL = "https://app.sendit.ma/api/v1";

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

    // Connexion Sendit
    const loginResponse = await fetch(`${SENDIT_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        public_key: process.env.SENDIT_PUBLIC_KEY,
        secret_key: process.env.SENDIT_SECRET_KEY,
      }),
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok || !loginData?.data?.token) {
      return res.status(500).json({
        error: "Sendit login failed",
        details: loginData,
      });
    }

    const senditToken = loginData.data.token;

    let page = 1;
    let allDistricts = [];

    while (true) {
      const response = await fetch(
        `${SENDIT_URL}/districts?page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${senditToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(500).json({
          error: "Sendit districts request failed",
          details: data,
        });
      }

      if (!data.data || data.data.length === 0) {
        break;
      }

      allDistricts.push(...data.data);

      if (!data.last_page || page >= data.last_page) {
        break;
      }

      page++;
    }


    const rows = allDistricts.map((district) => ({
      district_id: Number(district.id),
      ville: district.ville,
      name: district.name,
      arabic_name: district.arabic_name || null,
      price: Number(district.price) || null,
      delais: district.delais || null,
      pickup_district: district.pickup_district || 46,
    }));


    const { error } = await supabase
      .from("sendit_districts")
      .upsert(rows, {
        onConflict: "district_id",
      });


    if (error) {
      return res.status(500).json({
        error: "Supabase insert failed",
        details: error,
      });
    }


    return res.status(200).json({
      success: true,
      imported: rows.length,
    });


  } catch (error) {

    console.error("IMPORT SENDIT DISTRICTS ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });

  }
}
