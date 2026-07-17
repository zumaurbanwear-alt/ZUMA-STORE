import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { X, Check } from "lucide-react";
import type { CartItem } from "@/context/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLang } from "@/context/LanguageContext";
import { getShippingFee } from "@/lib/shipping";
import { Field } from "@/components/zuma/checkout/Field";
import { CitySelect } from "@/components/zuma/checkout/CitySelect";
import { DistrictSelect } from "@/components/zuma/checkout/DistrictSelect";

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
const [form, setForm] = useState({
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  district: "",
  senditDistrictId: null as number | null,
});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [districts, setDistricts] = useState<any[]>([]);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  // Honeypot: a field real users never see or fill, but naive bots that
  // auto-fill every input on the page do. Also record when the form
  // opened — a submission arriving in under 2s almost certainly wasn't
  // typed by a human. Both cases fail silently (fake success) rather than
  // showing an error, so scripted submitters don't learn what tripped it.
  const [hp, setHp] = useState("");
  const openedAtRef = useRef(0);
  useEffect(() => {
    if (open) openedAtRef.current = Date.now();
  }, [open]);
  useEffect(() => {
  async function loadDistricts() {
    if (!form.city) {
      setDistricts([]);
      return;
    }

    const { data, error } = await supabase
      .from("sendit_districts")
      .select("district_id, name, ville")
      .eq("ville", form.city)
      .order("name");

    if (error) {
      console.error("District loading error:", error);
      setDistricts([]);
      return;
    }

    setDistricts(data ?? []);
  }

  loadDistricts();
}, [form.city]);

  if (!open) return null;
  const subtotal = cart.reduce((s, i) => s + i.qty * Number(i.price), 0);
  const shippingFee = getShippingFee(form.city);
  const total = subtotal + shippingFee;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hp.trim() !== "" || Date.now() - openedAtRef.current < 2000) {
      // Looks like a bot — pretend it worked and stop, no request sent.
      setDone(true);
      return;
    }

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
  const orderId = crypto.randomUUID();

  console.log("FORM AT SUBMIT:", form);
console.log("FORM AT INSERT:", {
  city: form.city,
  district: form.district,
  senditDistrictId: form.senditDistrictId,
});
  const { error: orderErr } = await supabase.from("orders").insert({
        id: orderId,
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone,
        customer_city: form.city,
        customer_address: form.address,
        sendit_district_id: form.senditDistrictId,
        sendit_district_name: form.district,
        subtotal,
        shipping_fee: shippingFee,
        payment_method: "cash_on_delivery",
        status: "pending",
        notes: null,
      });
      if (orderErr) throw orderErr;

      const items = cart.map(i => ({
        order_id: orderId,
        product_id: i.id,
        product_name: i.name,
        unit_price: Number(i.price),
        quantity: i.qty,
        size: i.size ?? null,
        color: i.color ?? null,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(items);
      if (itemsErr) throw itemsErr;

      const { data: displayIdData } = await supabase.rpc("get_order_display_id", { _order_id: orderId });
      const shortId = (displayIdData as string) ?? orderId.slice(0, 8);

      const lines = [
        `*New Order — ZÜMA*`,
        `Order: #${shortId}`,
        `Name: ${form.name}`,
        `Phone: ${form.phone}`,
        `Email: ${form.email}`,
        `City: ${form.city}`,
        `Address: ${form.address}`,
        ``,
        `*Items:*`,
        ...cart.map(i => `• ${i.name} × ${i.qty} — ${Number(i.price) * i.qty} MAD`),
        ``,
        `Subtotal: ${subtotal} MAD`,
        `Delivery Fee: ${shippingFee} MAD`,
        `*Total: ${total} MAD*`,
        `Payment: Cash on Delivery`,
      ].join("\n");
      const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success(t("orderPlacedToast"));
      setDone(true);
    } catch (err) {
      console.error(err);
      toast.error(t("orderErrorToast"));
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
            {/* Honeypot — invisible to real users, left for bots that
                auto-fill every field. Never becomes visible/focusable. */}
            <input
              type="text"
              name="website"
              value={hp}
              onChange={e => setHp(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
            />
            <header>
              <h2 className="font-display text-xl tracking-[0.25em] mb-2">{t("checkout").toUpperCase()}</h2>
              <p className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">{t("cashOnly")}</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("fullName")} v={form.name} set={v => setForm({ ...form, name: v })} err={errors.name} />
              <Field label={t("phoneWhatsApp")} v={form.phone} set={v => setForm({ ...form, phone: v })} err={errors.phone} placeholder="+212 6 ..." />
              <Field label={t("email")} type="email" v={form.email} set={v => setForm({ ...form, email: v })} err={errors.email} className="sm:col-span-2" />
              <Field label={t("address")} v={form.address} set={v => setForm({ ...form, address: v })} err={errors.address} className="sm:col-span-2" />
              <CitySelect
  label={t("city")}
  v={form.city}
  set={v => setForm({ ...form, city: v })}
  err={errors.city}
  placeholder={t("selectCity")}
  className="sm:col-span-2"
/>

<DistrictSelect
  label="District"
  v={form.senditDistrictId}
  districts={districts}
  set={(id, name) => {
    console.log("PARENT RECEIVED DISTRICT:", id, name);

    setForm({
      ...form,
      senditDistrictId: id,
      district: name,
    });
  }}
  placeholder="Select district"
  className="sm:col-span-2"
/>
            </div>

            <div className="border border-border p-4 bg-background/50">
              <div className="text-[9px] tracking-[0.25em] uppercase text-primary-hi mb-2">{t("payment")}</div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                <span className="text-foreground">{t("paymentInfo1")}</span> {t("paymentInfo2")}{" "}
                <span className="text-primary-hi font-bold">{t("paymentInfo3")}</span>{t("paymentInfo4")}
              </p>
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">{t("subtotal")}</span>
                <span className="text-[11px] tracking-[0.05em] text-foreground">{subtotal} MAD</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">{t("deliveryFee")}</span>
                <span className="text-[11px] tracking-[0.05em] text-foreground">{shippingFee} MAD</span>
              </div>
              <p className="text-[8px] tracking-[0.16em] uppercase text-muted-foreground/70">{t("deliveryFeeHint")}</p>
              <div className="flex justify-between items-center pt-1.5 mt-1 border-t border-border">
                <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">{t("total")}</span>
                <span className="font-display text-sm tracking-[0.1em]">{total} MAD</span>
              </div>
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
