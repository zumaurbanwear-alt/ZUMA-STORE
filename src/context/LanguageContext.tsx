import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { nav } from "@/context/dict/nav";
import { product } from "@/context/dict/product";
import { cart } from "@/context/dict/cart";
import { checkout } from "@/context/dict/checkout";
import { home } from "@/context/dict/home";
import { newsletter } from "@/context/dict/newsletter";
import { emailGate } from "@/context/dict/emailGate";
import { notFound } from "@/context/dict/notFound";
import { footer } from "@/context/dict/footer";

export type Lang = "EN" | "FR";

const dict = {
  EN: {
    ...nav.EN, ...product.EN, ...cart.EN, ...checkout.EN, ...home.EN,
    ...newsletter.EN, ...emailGate.EN, ...notFound.EN, ...footer.EN,
  },
  FR: {
    ...nav.FR, ...product.FR, ...cart.FR, ...checkout.FR, ...home.FR,
    ...newsletter.FR, ...emailGate.FR, ...notFound.FR, ...footer.FR,
  },
} as const;

export type TKey = keyof typeof dict.EN;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string };
const LangCtx = createContext<Ctx | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "EN";
    return (localStorage.getItem("zuma-lang") as Lang) || "EN";
  });
  useEffect(() => {
    localStorage.setItem("zuma-lang", lang);
    document.documentElement.lang = lang.toLowerCase();
  }, [lang]);
  const t = (k: TKey) => dict[lang][k] ?? dict.EN[k];
  return <LangCtx.Provider value={{ lang, setLang: setLangState, t }}>{children}</LangCtx.Provider>;
};

export const useLang = () => {
  const v = useContext(LangCtx);
  if (!v) throw new Error("useLang must be used inside LanguageProvider");
  return v;
};
