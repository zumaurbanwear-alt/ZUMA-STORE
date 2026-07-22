import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductImg } from "@/components/zuma/product/ProductImg";
import { useLang } from "@/context/LanguageContext";

const STORAGE_KEY = "zuma_email_gate_passed";
const GATE_BG =
  "https://drkeggribqajjuktxhrj.supabase.co/storage/v1/object/public/product-images/email-gate-bg.webp";

export const EmailGate = ({ onPass }: { onPass: () => void }) => {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("gateInvalid"));
      return;
    }

    setError("");

    // Valide le gate uniquement pour la session en cours
    sessionStorage.setItem(STORAGE_KEY, "1");
    onPass();

    // Enregistre l'email en arrière-plan
    supabase
      .from("waitlist")
      .insert({ email })
      .select()
      .catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center">
      <ProductImg
        src={GATE_BG}
        width={1200}
        alt=""
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 w-full max-w-md text-center">
        <p
          className="text-white font-display tracking-[0.3em] uppercase"
          style={{ fontSize: "clamp(20px, 5vw, 36px)" }}
        >
          {t("gateHeadline")}
        </p>

        <p className="text-white text-[10px] tracking-[0.4em] uppercase font-display">
          {t("gateDrop")}
        </p>

        <div className="w-full flex border border-white/40">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={t("gateEmailPlaceholder").toUpperCase()}
            className="flex-1 bg-transparent px-4 py-3 text-white text-[10px] tracking-[0.25em] uppercase placeholder:text-white/40 outline-none font-display"
          />

          <button
            onClick={submit}
            className="px-4 text-white/70 hover:text-white transition-colors text-lg"
          >
            →
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-[9px] tracking-[0.2em] uppercase -mt-4">
            {error}
          </p>
        )}

        <button
          onClick={() => {
            sessionStorage.setItem(STORAGE_KEY, "1");
            onPass();
          }}
          className="text-white/30 text-[8px] tracking-[0.3em] uppercase hover:text-white/60 transition-colors"
        >
          {t("gateSkip").toUpperCase()}
        </button>
      </div>
    </div>
  );
};

export const useEmailGate = () => {
  const passed = sessionStorage.getItem(STORAGE_KEY) === "1";
  return { passed };
};
