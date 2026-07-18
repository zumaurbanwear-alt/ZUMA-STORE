import { createClient } from "@supabase/supabase-js";


export default async function handler(req,res){

  const webhookKey = req.headers["x-api-key"];

if(webhookKey !== process.env.SENDIT_WEBHOOK_KEY){
  return res.status(401).json({
    error:"Invalid webhook key"
  });
}

if(req.method !== "POST"){
return res.status(405).json({
error:"Method not allowed"
});
}


try{

const body=req.body;

console.log(
"SENDIT WEBHOOK",
JSON.stringify(body,null,2)
);

  console.log("HEADERS:", req.headers);

const payload = body.data ?? body;

const tracking =
  payload.code ??
  payload.tracking_number ??
  payload.delivery?.code;


const status =
  payload.status ??
  payload.delivery?.status;


if(!tracking){
return res.status(400).json({
error:"No tracking"
});
}



const supabase=createClient(
process.env.VITE_SUPABASE_URL,
process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);



const {error}=await supabase
.from("orders")
.update({
shipping_status:status
})
.eq(
"tracking_number",
tracking
);



if(error){
console.error(error);

return res.status(500).json({
error:error.message
});
}



return res.status(200).json({
success:true
});


}catch(e){

console.error(e);

return res.status(500).json({
error:e.message
});

}

}
