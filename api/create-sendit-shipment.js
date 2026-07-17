// Vercel Serverless Function
// POST /api/create-sendit-shipment
//
// Création automatique d'un colis Sendit depuis le panneau admin ZÜMA.
//
// Flux :
// 1. Vérifie que l'utilisateur connecté est admin Supabase.
// 2. Récupère la commande.
// 3. Se connecte à Sendit avec public_key + secret_key.
// 4. Crée le colis via POST /deliveries.
// 5. Sauvegarde le code colis, label, statut et informations Sendit.

const { createClient } = require("@supabase/supabase-js");

const SENDIT_BASE_URL =
  process.env.SENDIT_API_URL || "https://app.sendit.ma/api/v1";


async function senditLogin() {
  const response = await fetch(`${SENDIT_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      public_key: process.env.SENDIT_PUBLIC_KEY,
      secret_key: process.env.SENDIT_SECRET_KEY,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data?.data?.token) {
    throw new Error("Sendit authentication failed");
  }

  return data.data.token;
}


function buildSenditPayload(order) {
  return {
    district_id: order.sendit_district_id,

    name: order.customer_name,
    amount: order.total,

    address: order.customer_address,
    phone: order.customer_phone,

    reference: order.display_id,

    comment: order.notes || "",

    allow_open: 1,
    allow_try: 1,

    products_from_stock: 0,

    products: order.order_items?.map((item) => ({
      reference: item.product_id || item.product_name,
      name: item.product_name,
      quantity: item.quantity,
    })) || [],

    option_exchange: 0,
  };
}


module.exports = async (req, res) => {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }


  const token =
    req.headers.authorization?.replace("Bearer ", "");


  if (!token) {
    return res.status(401).json({
      error: "Missing authentication token",
    });
  }


  const { orderId } = req.body;


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


  const { data: admin } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();


  if (!admin) {
    return res.status(403).json({
      error: "Admin only",
    });
  }



  const {
    data: order,
    error: orderError,
  } = await supabase
    .from("orders")
    .select(`
      *,
      order_items(*)
    `)
    .eq("id", orderId)
    .single();


  if (orderError || !order) {
    return res.status(404).json({
      error: "Order not found",
    });
  }



  if (order.sendit_order_id) {
    return res.status(409).json({
      error: "Shipment already created",
    });
  }



  try {

    const senditToken = await senditLogin();



    const payload = buildSenditPayload(order);



    const response = await fetch(
      `${SENDIT_BASE_URL}/deliveries`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization:
            `Bearer ${senditToken}`,
        },

        body:
          JSON.stringify(payload),
      }
    );


    const result = await response.json();



    if (!response.ok) {

      return res.status(502).json({
        error: "Sendit rejected shipment",
        details: result,
      });

    }



    const shipment = result.data;



    const {
      error:updateError
    } = await supabase
      .from("orders")
      .update({

        sendit_order_id:
          shipment.code,

        tracking_number:
          shipment.code,

        shipping_provider:
          "sendit",

        shipping_status:
          shipment.status,

        shipping_created_at:
          new Date().toISOString(),

        shipping_label_url:
          shipment.labelUrl || null,

        status:
          "submitted",

      })
      .eq("id", orderId);



    if(updateError){

      return res.status(500).json({
        error:
          "Sendit created but database update failed",
        shipment,
      });

    }



    return res.status(200).json({

      success:true,

      shipment,

    });



  } catch(error){

    console.error(
      "SENDIT ERROR",
      error
    );


    return res.status(500).json({

      error:
        error.message,

    });

  }

};
