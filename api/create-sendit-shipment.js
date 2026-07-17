// Vercel Serverless Function — POST /api/create-sendit-shipment
//
// Creates a Sendit delivery from an existing ZÜMA order.
//
// Flow:
// 1. Verify logged-in admin
// 2. Lock the order to prevent duplicate shipments
// 3. Authenticate with Sendit API
// 4. Create delivery using POST /deliveries
// 5. Save Sendit information into orders table
//
// Required Vercel env variables:
//
// VITE_SUPABASE_URL
// VITE_SUPABASE_PUBLISHABLE_KEY
//
// SENDIT_API_URL=https://app.sendit.ma/api/v1
// SENDIT_PUBLIC_KEY=xxxxx
// SENDIT_SECRET_KEY=xxxxx

const { createClient } = require("@supabase/supabase-js");


// -------------------------
// Sendit Authentication
// -------------------------

async function getSenditToken() {
  const response = await fetch(
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

  const json = await response.json();

  if (!response.ok || !json?.data?.token) {
    throw new Error(
      `Sendit authentication failed: ${JSON.stringify(json)}`
    );
  }

  return json.data.token;
}


// -------------------------
// Build Sendit Delivery Payload
// -------------------------

function buildSenditPayload(order) {
  return {
    district_id: order.sendit_district_id,

    name: order.customer_name,

    amount: order.total,

    address: order.customer_address,

    phone: order.customer_phone,

    comment: order.notes ?? "",

    reference: order.display_id,

    allow_open: 1,

    allow_try: 1,

    products_from_stock: 0,

    products: order.order_items?.map((item) => ({
      reference: item.product_id ?? item.product_name,
      name: item.product_name,
      quantity: item.quantity,
    })) ?? [],
  };
}


// -------------------------
// Parse Sendit Response
// -------------------------

function parseSenditResponse(json) {
  return {
    sendit_order_id: json.code ?? null,

    tracking_number: json.code ?? null,

    shipping_label_url: json.labelUrl ?? null,

    shipping_status: json.status ?? "PENDING",
  };
}



// -------------------------
// API Handler
// -------------------------

module.exports = async (req, res) => {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }


  const authHeader = req.headers.authorization || "";

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;


  if (!token) {
    return res.status(401).json({
      error: "Missing authentication token",
    });
  }


  const { orderId } = req.body || {};


  if (!orderId) {
    return res.status(400).json({
      error: "orderId required",
    });
  }



  // Supabase client using logged admin session

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



  // Verify user

  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser(token);


  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid session",
    });
  }



  // Verify admin role

  const {
    data: roleRow,
  } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();


  if (!roleRow) {
    return res.status(403).json({
      error: "Admin access required",
    });
  }



  // Load order

  const {
    data: order,
    error: orderError,
  } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (
        product_id,
        product_name,
        quantity
      )
    `)
    .eq("id", orderId)
    .single();



  if (orderError || !order) {
    return res.status(404).json({
      error: "Order not found",
    });
  }



  // Prevent duplicates

  if (order.sendit_order_id) {
    return res.status(409).json({
      error: "Shipment already exists",
      sendit_order_id: order.sendit_order_id,
    });
  }



  // Temporary lock

  await supabase
    .from("orders")
    .update({
      shipping_status: "CREATING",
    })
    .eq("id", orderId);



  let senditResponse;



  try {

    const senditToken = await getSenditToken();



    const response = await fetch(
      `${process.env.SENDIT_API_URL}/deliveries`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization:
            `Bearer ${senditToken}`,
        },


        body: JSON.stringify(
          buildSenditPayload(order)
        ),
      }
    );



    const json = await response.json();



    if (!response.ok) {

      await supabase
        .from("orders")
        .update({
          shipping_status: null,
        })
        .eq("id", orderId);


      return res.status(502).json({
        error: "Sendit rejected delivery",
        details: json,
      });
    }


    senditResponse = parseSenditResponse(json.data);

  }


  catch(error) {


    await supabase
      .from("orders")
      .update({
        shipping_status: null,
      })
      .eq("id", orderId);



    return res.status(502).json({
      error: "Sendit connection failed",
      details: error.message,
    });

  }



  // Save Sendit data


  const update = {

    sendit_order_id:
      senditResponse.sendit_order_id,

    tracking_number:
      senditResponse.tracking_number,


    shipping_provider:
      "sendit",


    shipping_status:
      senditResponse.shipping_status,


    shipping_created_at:
      new Date().toISOString(),


    shipping_label_url:
      senditResponse.shipping_label_url,

  };



  const {
    error:updateError
  } = await supabase
    .from("orders")
    .update(update)
    .eq("id", orderId);



  if(updateError){

    return res.status(500).json({

      error:
      "Shipment created but database update failed",

      sendit:
      senditResponse,

    });

  }



  return res.status(200).json({

    success:true,

    shipment:update,

  });

};
