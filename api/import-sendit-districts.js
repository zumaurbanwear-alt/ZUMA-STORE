const { createClient } = require("@supabase/supabase-js");

const SENDIT_URL = "https://app.sendit.ma/api/v1";

module.exports = async (req, res) => {
  try {

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );


    // Connexion Sendit
    const login = await fetch(`${SENDIT_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        public_key: process.env.SENDIT_PUBLIC_KEY,
        secret_key: process.env.SENDIT_SECRET_KEY,
      }),
    });


    const loginData = await login.json();

    const token = loginData.data.token;


    let page = 1;
    let allDistricts = [];


    while (true) {

      const response = await fetch(
        `${SENDIT_URL}/districts?page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );


      const data = await response.json();


      if (!data.data || data.data.length === 0) {
        break;
      }


      allDistricts.push(...data.data);


      if (page >= data.last_page) {
        break;
      }


      page++;

    }


    const rows = allDistricts.map((d) => ({
      district_id: Number(d.id),
      ville: d.ville,
      name: d.name,
      arabic_name: d.arabic_name || null,
      price: Number(d.price),
      delais: d.delais,
      pickup_district: d.pickup_district || 46,
    }));


    const { error } = await supabase
      .from("sendit_districts")
      .upsert(rows);


    if (error) {
      throw error;
    }


    return res.status(200).json({
      success: true,
      imported: rows.length,
    });


  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: error.message,
    });

  }
};
