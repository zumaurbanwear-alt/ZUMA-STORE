export type AdminOrderStatus = string;

export type AdminOrder = {
  id: string;
  display_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_city?: string;
  customer_address?: string;
  customer_district?: string | null;
  subtotal?: number;
  shipping_fee?: number;
  total?: number;
  status?: string;
  shipping_status?: string | null;
  shipping_status_return?: string | null;
  return_code?: string | null;
  pickup_code?: string | null;
  pickup_status?: string | null;
  pickup_created_at?: string | null;
  tracking_number?: string | null;
  created_at?: string;
  notes?: string | null;
  admin_notes?: string | null;
  refunded?: boolean;
  sendit_order_id?: string | null;
  shipping_provider?: string | null;
  shipping_created_at?: string | null;
  shipping_label_url?: string | null;
  payment_method?: string;
  order_items?: Array<{
    id?: string;
    product_name?: string;
    quantity?: number;
    size?: string | null;
    color?: string | null;
    unit_price?: number;
  }>;
};

export type AdminPickup = {
  code: string;
  status: string | null;
  created_at: string | null;
  total: number;
  orders: Array<{
    pickup_code: string;
    pickup_status: string | null;
    pickup_created_at: string | null;
    tracking_number: string;
    customer_name: string;
    total: number;
  }>;
};

export type AdminInvoiceItem = {
  type?: string;
  code?: string;
  label?: string;
  status?: string;
  amount?: number | string;
  fee?: number | string;
  date?: string;
};

export type AdminInvoice = {
  id?: string;
  code?: string;
  invoice_number?: string;
  total?: number;
  amount?: number | string;
  created_at?: string;
  date?: string;
  customer_name?: string;
  status?: string;
  items?: AdminInvoiceItem[];
};

export type AdminOrderEvent = {
  id?: string;
  event?: string;
  event_type?: string;
  created_at?: string;
  details?: string | null;
};
