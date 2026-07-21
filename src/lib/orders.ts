export type OrderSubmissionInput = {
  orderId: string;
  form: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    senditDistrictId: number | null;
  };
  cart: Array<{
    id: string;
    name: string;
    price: number | string;
    qty: number;
    size?: string | null;
    color?: string | null;
  }>;
  subtotal: number;
  shippingFee: number;
  total: number;
  whatsappNumber: string;
  shortId?: string;
};

export const buildOrderSubmission = ({
  orderId,
  form,
  cart,
  subtotal,
  shippingFee,
  total,
  whatsappNumber,
  shortId,
}: OrderSubmissionInput) => {
  const items = cart.map((item) => ({
    order_id: orderId,
    product_id: item.id,
    product_name: item.name,
    unit_price: Number(item.price),
    quantity: item.qty,
    size: item.size ?? null,
    color: item.color ?? null,
  }));

  const order = {
    id: orderId,
    customer_name: form.name,
    customer_email: form.email,
    customer_phone: form.phone,
    customer_city: form.city,
    customer_address: form.address,
    sendit_district_id: form.senditDistrictId,
    customer_district: form.district,
    subtotal,
    shipping_fee: shippingFee,
    payment_method: "cash_on_delivery",
    status: "pending",
    notes: null,
  };

  const lines = [
    "*New Order — ZÜMA*",
    `Order: #${shortId ?? orderId}`,
    `Name: ${form.name}`,
    `Phone: ${form.phone}`,
    `Email: ${form.email}`,
    `City: ${form.city}`,
    `Address: ${form.address}`,
    "",
    "*Items:*",
    ...cart.map((item) => `• ${item.name} × ${item.qty} — ${Number(item.price) * item.qty} MAD`),
    "",
    `Subtotal: ${subtotal} MAD`,
    `Delivery Fee: ${shippingFee} MAD`,
    `*Total: ${total} MAD*`,
    "Payment: Cash on Delivery",
  ].join("\n");

  return {
    order,
    items,
    whatsappMessage: lines,
    whatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines)}`,
  };
};
