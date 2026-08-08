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
  promoCode?: string | null;
  discountAmount?: number;
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
  promoCode = null,
  discountAmount = 0,
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
    // "total" est une colonne générée en base (subtotal + shipping_fee) —
    // on impute donc la réduction sur subtotal pour que le total facturé
    // soit correct. Le montant réel de la réduction reste tracé à part
    // dans discount_amount pour la comptabilité (subtotal d'origine des
    // articles = subtotal + discount_amount).
    subtotal: Math.max(0, subtotal - discountAmount),
    shipping_fee: shippingFee,
    promo_code: promoCode,
    discount_amount: discountAmount,
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
    `District: ${form.district}`,
    `Address: ${form.address}`,
    "",
    "*Items:*",
    ...cart.map((item) => {
      const details = [item.size ? `Size: ${item.size}` : null, item.color ? `Color: ${item.color}` : null]
        .filter(Boolean)
        .join(", ");
      return `• ${item.name}${details ? ` (${details})` : ""} × ${item.qty} — ${Number(item.price) * item.qty} MAD`;
    }),
    "",
    `Subtotal: ${subtotal} MAD`,
    `Delivery Fee: ${shippingFee} MAD`,
    ...(discountAmount > 0 ? [`Promo (${promoCode}): -${discountAmount} MAD`] : []),
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
