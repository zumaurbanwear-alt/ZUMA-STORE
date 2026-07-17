import { createClient } from "@supabase/supabase-js";

function buildSenditPayload(order, districtId) {
  return {
    pickup_district_id: 46,
    district_id: districtId,

    name: order.customer_name,
    amount: order.total,

    address: order.customer_address,
    phone: order.customer_phone,

    comment: order.notes ?? "",
    reference: order.display_id,

    allow_open: 1,
    allow_try: 1,

    products_from_stock: 0,

    products: [
      {
        reference: order.display_id,
        name: "ZÜMA Order",
        quantity: 1,
      },
    ],

    packaging_id: 1,
    option_exchange: 0,
  };
}


function parseSenditResponse(json) {
  const data = json.data ?? json;

  return {
    sendit_order_id: data.id ?? data.order_id ?? data.code ?? null,
    tracking_number: data.code ?? data.tracking_number ?? null,
    shipping_label_url:
      data.labelUrl ??
      data.label_url ??
      data.label ??
      null,
    shipping_status:
      data.status ??
      "PENDING",
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
    } =
      await supabase.auth.getUser(token);



    if (userError || !userData.user) {
      return res.status(401).json({
        error: "Invalid session",
      });
    }



    const {
      data: adminRole,
    } =
      await supabase
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
    } =
      await supabase
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



    const {
      data: district,
      error: districtError,
    } =
      await supabase
        .from("sendit_districts")
        .select("district_id")
        .eq("ville", order.customer_city)
        .order("district_id", {
          ascending: false,
        })
        .limit(1)
        .single();



    if (districtError || !district) {
      return res.status(400).json({
        error: "Sendit district not found for city",
        city: order.customer_city,
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

const senditResponse = await fetch(
  `${process.env.SENDIT_API_URL}/deliveries`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${senditToken}`,
    },
    body: JSON.stringify(
      buildSenditPayload(
        order,
        district.district_id
      )
    ),
  }
);



const senditText = await senditResponse.text();

console.log("SENDIT STATUS:", senditResponse.status);
console.log("SENDIT BODY RAW:", senditText);

let senditJson;

try {
  senditJson = JSON.parse(senditText);
} catch {
  senditJson = {
    raw: senditText,
  };
}

console.log(
  "SENDIT JSON:",
  JSON.stringify(senditJson, null, 2)
);


    if (!senditResponse.ok || senditJson.success === false) {

  console.log("====================================");
  console.log("SENDIT VALIDATION ERROR");
  console.log(JSON.stringify(senditJson, null, 2));
  console.log("====================================");

  return res.status(422).json(senditJson);

}


    const parsed =
      parseSenditResponse(
        senditJson
      );




    const {
      error: updateError,
    } =
      await supabase
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
        .eq(
          "id",
          orderId
        );





    if (updateError) {

      return res.status(500).json({

        error:
          "Sendit created but database update failed",

        details:
          updateError,

      });

    }




return res.status(422).json({
  raw: senditJson
});
    
    return res.status(200).json({

      success: true,

      tracking_number:
        parsed.tracking_number,

      sendit_order_id:
        parsed.sendit_order_id,

      label:
        parsed.shipping_label_url,

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
