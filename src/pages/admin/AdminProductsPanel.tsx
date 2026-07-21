import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProducts, type DbProduct } from "@/hooks/useProducts";
import { ProductEditModal } from "@/pages/admin/ProductEditModal";
import { AdminSection } from "@/pages/admin/components/AdminSection";
import { ProductsList } from "@/pages/admin/components/ProductsList";

const empty = {
  slug: "", name: "", description: "", price: 0, category: "T-Shirts",
  image_url: "", stock: 0, is_visible: true, sort_order: 0,
};

export const AdminProductsPanel = () => {
  const { products } = useProducts({ adminMode: true });
  const [editing, setEditing] = useState<Partial<DbProduct> | null>(null);

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
    <AdminSection>
      <ProductsList
        products={products}
        onEdit={setEditing}
        onToggleVisible={toggleVisible}
        onRemove={remove}
        onCreate={() => setEditing({ ...empty })}
      />
      {editing && <ProductEditModal editing={editing} setEditing={setEditing} onSave={save} />}
    </AdminSection>
  );
};
