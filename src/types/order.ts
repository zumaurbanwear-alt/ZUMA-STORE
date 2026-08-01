export type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  size: string | null;
  color: string | null;
  unit_price: number;
};

export type Order = {
  id: string;
  display_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_city: string;
  customer_address: string;
  subtotal: number;
  shipping_fee: number;
  sendit_order_id: string | null;
  tracking_number: string | null;
  shipping_provider: string | null;
  shipping_status: string | null;
  shipping_created_at: string | null;
  shipping_label_url: string | null;
  total: number;
  status: string;
  created_at: string;
  order_items: OrderItem[];
};

export type LedgerRow = {
  order_id: string;
  created_at: string;
  status: string;
  payment_method: string;
  subtotal: number;
  shipping_fee: number;
  sendit_order_id: string | null;
  tracking_number: string | null;
  shipping_provider: string | null;
  shipping_status: string | null;
  shipping_created_at: string | null;
  shipping_label_url: string | null;
  total: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_city: string;
  customer_address: string;
  notes: string | null;
  product_id: string | null;
  product_name: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};
