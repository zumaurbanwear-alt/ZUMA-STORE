import { supabase } from "@/integrations/supabase/client";

export const getAdminSession = async () => supabase.auth.getSession();

export const signOutAdmin = async () => supabase.auth.signOut();

export const createOrderRecord = async (order: Record<string, unknown>) =>
  supabase.from("orders").insert(order);

export const createOrderItems = async (items: Array<Record<string, unknown>>) =>
  supabase.from("order_items").insert(items);

export const getOrderDisplayId = async (orderId: string) =>
  supabase.rpc("get_order_display_id", { _order_id: orderId });
