import { createClient } from "@supabase/supabase-js";

function buildSenditPayload(order, districtId) {
  return {
    reference: order.display_id,
    district_id: districtId,
    customer_name: order.customer_name,
    phone: order.customer_phone,
    city: order.customer_city,
    address: order.customer_address,
    amount: order.total,
    notes: order.notes ?? undefined,
  };
}

function parseSenditResponse(json) {
  return {
    sendit_order_id: json.id ?? json.order_id ?? null,
    tracking_number: json.tracking_number ?? json.code ?? null,
    shipping_label_url: json.label_url ?? json.label ?? null,
    shipping_status: json.status ?? "submitted",
  };
}

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
      data: order,
      error: orderError,
    } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();



    if (orderError || !order) {
      return res.status(404).json({
        error: "Order not found",
      });
    }



const {
  data: district,
  error: districtError,
} = await supabase
  .from("sendit_districts")
  .select("district_id")
  .eq("ville", order.customer_city)
  .order("district_id", { ascending: false })
  .limit(1)
  .single();



    if (districtError || !district) {

      return res.status(400).json({
        error:
          "Sendit district not found for city",
        city:
          order.customer_city,
      });

    }



    const senditResponse = await fetch(
      `${process.env.SENDIT_API_URL}/orders`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization:
            `Bearer ${process.env.SENDIT_API_KEY}`,
        },

        body: JSON.stringify(
          buildSenditPayload(
            order,
            district.district_id
          )
        ),
      }
    );



    const senditJson =
      await senditResponse.json();



    if (!senditResponse.ok) {

      return res.status(502).json({
        error: "Sendit rejected shipment",
        details: senditJson,
      });

    }



    const parsed =
      parseSenditResponse(senditJson);



    const {
      error: updateError,
    } = await supabase
      .from("orders")
      .update({

        sendit_order_id:
          parsed.sendit_order_id,

        tracking_number:
          parsed.tracking_number,

        shipping_provider:
          "sendit",

        shipping_status:
          parsed.shipping_status,

        shipping_created_at:
          new Date().toISOString(),

        shipping_label_url:
          parsed.shipping_label_url,

      })
      .eq("id", orderId);



    if (updateError) {

      return res.status(500).json({
        error:
          "Sendit created but database update failed",
        details:
          updateError,
      });

    }



    return res.status(200).json({

      success: true,

      tracking_number:
        parsed.tracking_number,

      sendit_order_id:
        parsed.sendit_order_id,

    });



  } catch(error) {

    console.error(
      "SENDIT ERROR:",
      error
    );


    return res.status(500).json({
      error:
        error.message,
    });

  }

}
