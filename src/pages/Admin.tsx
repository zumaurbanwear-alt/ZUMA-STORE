import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProducts, type DbProduct, resolveImage } from "@/hooks/useProducts";
import { toast } from "sonner";
import { Eye, EyeOff, Trash2, Plus } from "lucide-react";

const empty = {
  slug: "", name: "", description: "", price: 0, category: "T-Shirts",
  image_url: "", stock: 0, is_visible: true, sort_order: 0,
};

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  size: string | null;
  color: string | null;
  unit_price: number;
};

type Order = {
  id: string;
  display_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_city: string;
  customer_address: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: string;
  created_at: string;
  order_items: OrderItem[];
};

// admin_orders_full is a hand-written Supabase view (see recreate_admin_orders_full.sql),
// so it isn't part of the auto-generated Database types — this row shape is the
// single source of truth for what that view returns.
type LedgerRow = {
  order_id: string;
  created_at: string;
  status: string;
  payment_method: string;
  subtotal: number;
  shipping_fee: number;
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

const Admin = () => {
  const nav = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const { products } = useProducts({ adminMode: true });
  const [orders, setOrders] = useState<Order[]>([]);
  const [unified, setUnified] = useState<LedgerRow[]>([]);
  const [editing, setEditing] = useState<Partial<DbProduct> | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) nav("/auth");
  }, [user, loading, nav]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setOrders((data as Order[]) ?? []));
    // "admin_orders_full" as any: hand-written view not present in the generated
    // Database types — the response itself is fully typed via LedgerRow above.
    supabase.from("admin_orders_full" as any).select("*").limit(200)
      .then((res) => setUnified((res.data as LedgerRow[]) ?? []));
  }, [isAdmin]);

  if (loading) return <div className="min-h-screen bg-background grid place-items-center text-muted-foreground text-xs">Loading...</div>;
  if (!user) return null; // navigate effect will redirect
  if (!isAdmin) return (
    <div className="min-h-screen bg-background grid place-items-center px-6">
      <div className="text-center max-w-md">
        <h1 className="font-display text-2xl tracking-[0.25em] mb-3">ACCESS DENIED</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your account does not have admin privileges. Contact the store owner.
        </p>
        <button onClick={() => supabase.auth.signOut().then(() => nav("/auth"))} className="mt-6 px-5 py-2 border border-primary text-primary text-[10px] tracking-[0.22em] uppercase hover:bg-primary hover:text-primary-foreground">Sign out</button>
      </div>
    </div>
  );

  const save = async () => {
    if (!editing) return;
    const payload = { ...editing, price: Number(editing.price), stock: Number(editing.stock), sort_order: Number(editing.sort_order ?? 0) };
    if (!payload.slug || !payload.name) { toast.error("Slug and name required"); return; }
    const { error } = editing.id
      ? await supabase.from("products").update(payload as Partial<DbProduct>).eq("id", editing.id)
      : await supabase.from("products").insert(payload as DbProduct);
    if (error) { console.error(error); toast.error("Could not save product"); } else { toast.success("Saved"); setEditing(null); }
  };
  const toggleVisible = async (p: DbProduct) => {
    await supabase.from("products").update({ is_visible: !p.is_visible }).eq("id", p.id);
  };
  const remove = async (p: DbProduct) => {
    if (!confirm(`Delete ${p.name}?`)) return;
    await supabase.from("products").delete().eq("id", p.id);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <header className="flex justify-between items-center mb-10 border-b border-border pb-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl tracking-[0.3em]">ZÜMA — ADMIN</h1>
          <p className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground mt-1">Live store manager</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setEditing({ ...empty })} className="px-4 py-2 bg-primary text-primary-foreground text-[10px] tracking-[0.22em] uppercase flex items-center gap-2 hover:bg-primary-hi">
            <Plus className="w-3 h-3" /> New Product
          </button>
          <button onClick={() => supabase.auth.signOut().then(() => nav("/"))} className="px-4 py-2 border border-border text-[10px] tracking-[0.22em] uppercase text-muted-foreground hover:text-primary-hi">
            Sign out
          </button>
        </div>
      </header>

      <section className="mb-12">
        <h2 className="font-display text-lg tracking-[0.25em] mb-4">PRODUCTS ({products.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className={`border border-border p-4 flex gap-4 ${!p.is_visible ? "opacity-50" : ""}`}>
              <img src={resolveImage(p)} alt={p.name} className="w-16 h-20 object-cover" />
              <div className="flex-1 min-w-0">
                <div className="font-display tracking-[0.15em] truncate">
                  <span className="text-primary-hi mr-2">#{p.display_id ?? "—"}</span>{p.name}
                </div>
                <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mt-1">
                  {p.category} · {p.price} MAD · stock {p.stock}
                </div>
                <div className="flex gap-3 mt-3">
                  <button onClick={() => setEditing(p)} className="text-[10px] tracking-[0.2em] uppercase text-primary-hi hover:underline">Edit</button>
                  <button onClick={() => toggleVisible(p)} className="text-muted-foreground hover:text-primary-hi" title={p.is_visible ? "Hide" : "Show"}>
                    {p.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => remove(p)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-display text-lg tracking-[0.25em] mb-4">RECENT ORDERS ({orders.length})</h2>
        <div className="border border-border divide-y divide-border">
          {orders.length === 0 && <p className="p-6 text-xs text-muted-foreground text-center">No orders yet.</p>}
          {orders.map(o => (
            <div key={o.id} className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              <div className="text-primary-hi font-display tracking-[0.2em]">#{o.display_id ?? "—"}</div>
              <div>
                <div className="text-foreground">{o.customer_name}</div>
                <div className="text-muted-foreground">{o.customer_phone}</div>
              </div>
              <div className="text-muted-foreground">{o.customer_email}<br/>{o.customer_city}</div>
              <div className="text-muted-foreground">
                {(o.order_items ?? []).map((i: OrderItem) => `${i.product_name} ×${i.quantity}`).join(", ")}
              </div>
              <div className="text-right">
                <div className="text-primary-hi">{o.total} MAD</div>
                <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground">
                  {o.subtotal} + {o.shipping_fee} delivery
                </div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{o.status}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-display text-lg tracking-[0.25em] mb-4">ALL-IN-ONE LEDGER ({unified.length})</h2>
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/30 text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
              <tr>
                {["Order #","Date","Status","Product #","Product","Size","Color","Qty","Unit","Line","Subtotal","Delivery","Order Total","Customer","Email","Phone","City","Address"].map(h => (
                  <th key={h} className="px-2 py-2 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {unified.length === 0 && (
                <tr><td colSpan={18} className="p-6 text-center text-muted-foreground">No data yet.</td></tr>
              )}
              {unified.map((r: LedgerRow, i: number) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="px-2 py-2 text-primary-hi font-display tracking-[0.15em]">#{r.order_id}</td>
                  <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-2 py-2 uppercase tracking-[0.15em] text-[9px]">{r.status}</td>
                  <td className="px-2 py-2 text-primary-hi">#{r.product_id ?? "—"}</td>
                  <td className="px-2 py-2">{r.product_name}</td>
                  <td className="px-2 py-2 uppercase tracking-[0.15em] text-[10px]">{r.size ?? "—"}</td>
                  <td className="px-2 py-2 uppercase tracking-[0.15em] text-[10px]">{r.color ?? "—"}</td>
                  <td className="px-2 py-2">{r.quantity}</td>
                  <td className="px-2 py-2">{r.unit_price}</td>
                  <td className="px-2 py-2 text-primary-hi">{r.line_total}</td>
                  <td className="px-2 py-2">{r.subtotal}</td>
                  <td className="px-2 py-2">{r.shipping_fee}</td>
                  <td className="px-2 py-2 text-primary-hi">{r.total}</td>
                  <td className="px-2 py-2">{r.customer_name}</td>
                  <td className="px-2 py-2 text-muted-foreground">{r.customer_email}</td>
                  <td className="px-2 py-2 text-muted-foreground">{r.customer_phone}</td>
                  <td className="px-2 py-2 text-muted-foreground">{r.customer_city}</td>
                  <td className="px-2 py-2 text-muted-foreground">{r.customer_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 bg-background/90 grid place-items-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-card border border-border p-6 my-10">
            <h3 className="font-display text-xl tracking-[0.25em] mb-5">{editing.id ? "EDIT" : "NEW"} PRODUCT</h3>
            <div className="grid grid-cols-2 gap-4">
              {([
                ["slug", "Slug"], ["name", "Name"], ["category", "Category"], ["price", "Price (MAD)"],
                ["stock", "Stock"], ["sort_order", "Sort Order"], ["image_url", "Image URL (https://...)"],
              ] as const).map(([k, l]) => (
                <label key={k} className={`flex flex-col gap-1 ${k === "image_url" ? "col-span-2" : ""}`}>
                  <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">{l}</span>
                  <input
                    type={["price","stock","sort_order"].includes(k) ? "number" : "text"}
                    value={editing[k as keyof DbProduct] ?? ""}
                    onChange={e => setEditing({ ...editing, [k]: e.target.value })}
                    className="bg-background border border-border px-3 py-2 text-sm focus:border-primary outline-none"
                  />
                </label>
              ))}
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">Description</span>
                <textarea value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })} className="bg-background border border-border px-3 py-2 text-sm h-20 focus:border-primary outline-none" />
              </label>
              <label className="col-span-2 flex items-center gap-2 text-xs">
                <input type="checkbox" checked={editing.is_visible ?? true} onChange={e => setEditing({ ...editing, is_visible: e.target.checked })} />
                <span className="tracking-[0.18em] uppercase text-muted-foreground">Visible on shop</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={save} className="flex-1 py-3 bg-primary text-primary-foreground text-[10px] tracking-[0.3em] uppercase hover:bg-primary-hi">Save</button>
              <button onClick={() => setEditing(null)} className="flex-1 py-3 border border-border text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-primary-hi">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Admin;
