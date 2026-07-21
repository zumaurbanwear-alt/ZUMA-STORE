import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { X, Check } from "lucide-react";
import type { CartItem } from "@/context/CartContext";
import { toast } from "sonner";
import { useLang } from "@/context/LanguageContext";
import { getShippingFee } from "@/lib/shipping";
import { buildOrderSubmission } from "@/lib/orders";
import { createOrderItems, createOrderRecord, getOrderDisplayId } from "@/lib/supabaseAdmin";
import { Field } from "@/components/zuma/checkout/Field";
import { CitySelect } from "@/components/zuma/checkout/CitySelect";
import { DistrictSelect } from "@/components/zuma/checkout/DistrictSelect";

type SenditDistrict = {
  district_id: number;
  name: string;
  ville: string;
  price: number | string | null;
};

const schema = z.object({
  name: z.string().trim().min(2, "Name required").max(80),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{8,20}$/, "Invalid phone"),
  address: z.string().trim().min(10, "Address too short").max(300),
  city: z.string().trim().min(2).max(80),
  senditDistrictId: z
    .number()
    .nullable()
    .refine((v) => v !== null, { message: "District required" }),
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
  const [districts, setDistricts] = useState<SenditDistrict[]>([]);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  
  const [hp, setHp] = useState("");
  const openedAtRef = useRef(0);

  useEffect(() => {
    if (open) openedAtRef.current = Date.now();
  }, [open]);

  useEffect(() => {
    async function loadDistricts() {
      if (!form.city || form.city.trim() === "") {
        setDistricts([]);
        return;
      }

      const cleanCity = form.city.trim();

      const { data, error } = await import("@/integrations/supabase/client").then((mod) =>
        mod.supabase
          .from("sendit_districts")
          .select("district_id, name, ville, price")
          .ilike("ville", cleanCity)
          .order("name")
      );

      if (error) {
        console.error("Error loading districts:", error);
        setDistricts([]);
        return;
      }

      setDistricts(data ?? []);
    }

    loadDistricts();
  }, [form.city]);

  if (!open) return null;
  const subtotal = cart.reduce((s, i) => s + i.qty * Number(i.price), 0);

  const selectedDistrict = districts.find(
    (d) => d.district_id === form.senditDistrictId
  );

  const shippingFee =
    selectedDistrict?.price != null
      ? Number(selectedDistrict.price)
      : getShippingFee(form.city);

  const total = subtotal + shippingFee;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hp.trim() !== "" || Date.now() - openedAtRef.current < 2000) {
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
      const { order, items, whatsappUrl } = buildOrderSubmission({
        orderId,
        form,
        cart,
        subtotal,
        shippingFee,
        total,
        whatsappNumber,
      });
      const { error: orderErr } = await createOrderRecord(order);
      if (orderErr) throw orderErr;

      const { error: itemsErr } = await createOrderItems(items);
      if (itemsErr) throw itemsErr;

      const { data: displayIdData } = await getOrderDisplayId(orderId);
      const shortId = (displayIdData as string) ?? orderId.slice(0, 8);
      const submission = buildOrderSubmission({
        orderId,
        form,
        cart,
        subtotal,
        shippingFee,
        total,
        whatsappNumber,
        shortId,
      });
      window.open(submission.whatsappUrl, "_blank", "noopener,noreferrer");
      toast.success(t("orderPlacedToast"));
      setDone(true);
    } catch {
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
                  setForm({
                    ...form,
                    senditDistrictId: id,
                    district: name,
                  });
                }}
                err={errors.senditDistrictId}
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
