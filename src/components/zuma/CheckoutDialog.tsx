import { useState } from "react";
import { z } from "zod";
import { X, Check } from "lucide-react";
import type { CartItem } from "@/components/zuma/CartDrawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLang } from "@/context/LanguageContext";

const schema = z.object({
  name: z.string().trim().min(2, "Name required").max(80),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{8,20}$/, "Invalid phone"),
  address: z.string().trim().min(10, "Address too short").max(300),
  city: z.string().trim().min(2).max(80),
});

export const CheckoutDialog = ({
  open, onClose, cart, whatsappNumber, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  whatsappNumber: string;
  onSuccess: () => void;
}) => {
  const { t } = useLang();
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", city: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!open) return null;
  const total = cart.reduce((s, i) => s + i.qty * Number(i.price), 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) {
      const errs: Record<string, string> = {};
      r.error.issues.forEach(i => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);

    try {
      const { data: order, error: orderErr } = await supabase.from("orders").insert({
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone,
        customer_city: form.city,
        customer_address: form.address,
        total: 0, // server-side trigger recomputes from order_items
        payment_method: "cash_on_delivery",
        status: "pending",
      }).select().single();
      if (orderErr) throw orderErr;

      const items = cart.map(i => ({
        order_id: order.id,
        product_id: i.id,
        product_name: i.name,
        unit_price: Number(i.price),
        quantity: i.qty,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(items);
      if (itemsErr) throw itemsErr;

      const lines = [
        `*New Order — ZÜMA*`,
        `Order: ${order.id.slice(0, 8)}`,
        `Name: ${form.name}`,
        `Phone: ${form.phone}`,
        `Email: ${form.email}`,
        `City: ${form.city}`,
        `Address: ${form.address}`,
        ``,
        `*Items:*`,
        ...cart.map(i => `• ${i.name} × ${i.qty} — ${Number(i.price) * i.qty} MAD`),
        ``,
        `*Total: ${total} MAD*`,
        `Payment: Cash on Delivery`,
      ].join("\n");
      const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Order placed");
      setDone(true);
    } catch (err: any) {
      toast.error(err.message ?? "Could not place order");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-background/90 flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-card border border-border my-10">
        <button onClick={() => { setDone(false); onClose(); }} aria-label="Close" className="absolute top-4 right-4 text-muted-foreground hover:text-primary-hi z-10">
          <X className="w-4 h-4" />
        </button>

        {done ? (
          <div className="p-10 text-center flex flex-col items-center gap-5">
            <div className="w-12 h-12 border border-primary flex items-center justify-center">
              <Check className="w-5 h-5 text-primary-hi" />
            </div>
            <h2 className="font-display text-xl tracking-[0.25em]">{t("orderReceived")}</h2>
            <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground max-w-md leading-relaxed">
              <span className="text-foreground">{t("paymentInfo1")}</span> {t("paymentInfo2")}{" "}
              <span className="text-primary-hi font-bold">{t("paymentInfo3")}</span>{t("paymentInfo4")}
            </p>
            <button onClick={() => { setDone(false); onSuccess(); }} className="mt-4 px-6 py-3 bg-primary text-primary-foreground text-[10px] tracking-[0.3em] uppercase hover:bg-primary-hi">
              {t("continueBtn")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 md:p-10 flex flex-col gap-5">
            <header>
              <h2 className="font-display text-xl tracking-[0.25em] mb-2">{t("checkout").toUpperCase()}</h2>
              <p className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">{t("cashOnly")}</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("fullName")} v={form.name} set={v => setForm({ ...form, name: v })} err={errors.name} />
              <Field label={t("phoneWhatsApp")} v={form.phone} set={v => setForm({ ...form, phone: v })} err={errors.phone} placeholder="+212 6 ..." />
              <Field label={t("email")} type="email" v={form.email} set={v => setForm({ ...form, email: v })} err={errors.email} className="sm:col-span-2" />
              <Field label={t("address")} v={form.address} set={v => setForm({ ...form, address: v })} err={errors.address} className="sm:col-span-2" />
              <Field label={t("city")} v={form.city} set={v => setForm({ ...form, city: v })} err={errors.city} className="sm:col-span-2" />
            </div>

            <div className="border border-border p-4 bg-background/50">
              <div className="text-[9px] tracking-[0.25em] uppercase text-primary-hi mb-2">{t("payment")}</div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                <span className="text-foreground">{t("paymentInfo1")}</span> {t("paymentInfo2")}{" "}
                <span className="text-primary-hi font-bold">{t("paymentInfo3")}</span>{t("paymentInfo4")}
              </p>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">{t("total")}</span>
              <span className="font-display text-sm tracking-[0.1em]">{total} MAD</span>
            </div>

            <button type="submit" disabled={busy} className="w-full py-3 bg-primary text-primary-foreground text-[10px] tracking-[0.3em] uppercase hover:bg-primary-hi transition-colors disabled:opacity-50">
              {busy ? t("placing") : t("confirmOrder")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const Field = ({
  label, v, set, err, type = "text", placeholder, className = "",
}: {
  label: string; v: string; set: (v: string) => void; err?: string; type?: string; placeholder?: string; className?: string;
}) => (
  <label className={`flex flex-col gap-1.5 ${className}`}>
    <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">{label}</span>
    <input
      type={type}
      value={v}
      onChange={e => set(e.target.value)}
      placeholder={placeholder}
      className="bg-background border border-border px-3 py-2 text-[10px] text-foreground focus:border-primary outline-none transition-colors"
    />
    {err && <span className="text-[9px] text-destructive">{err}</span>}
  </label>
);
