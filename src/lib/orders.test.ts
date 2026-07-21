import { describe, expect, it } from "vitest";
import { buildOrderSubmission } from "./orders";

describe("buildOrderSubmission", () => {
  it("builds the order payload and WhatsApp message from checkout inputs", () => {
    const result = buildOrderSubmission({
      orderId: "order-123",
      form: {
        name: "Alice",
        email: "alice@example.com",
        phone: "+212612345678",
        address: "12 Rue de la Paix",
        city: "Casablanca",
        district: "Sidi Othman",
        senditDistrictId: 42,
      },
      cart: [
        {
          id: "product-1",
          name: "Tee",
          price: 350,
          qty: 2,
          size: "M",
          color: "WHITE",
        },
      ] as any,
      subtotal: 700,
      shippingFee: 50,
      total: 750,
      whatsappNumber: "212600000000",
    });

    expect(result.order).toMatchObject({
      id: "order-123",
      customer_name: "Alice",
      customer_email: "alice@example.com",
      customer_phone: "+212612345678",
      customer_city: "Casablanca",
      customer_address: "12 Rue de la Paix",
      sendit_district_id: 42,
      customer_district: "Sidi Othman",
      subtotal: 700,
      shipping_fee: 50,
      payment_method: "cash_on_delivery",
      status: "pending",
      notes: null,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      order_id: "order-123",
      product_id: "product-1",
      product_name: "Tee",
      unit_price: 350,
      quantity: 2,
      size: "M",
      color: "WHITE",
    });

    expect(result.whatsappMessage).toContain("*New Order — ZÜMA*");
    expect(result.whatsappMessage).toContain("Order: #order-123");
    expect(result.whatsappMessage).toContain("Total: 750 MAD");
  });
});
