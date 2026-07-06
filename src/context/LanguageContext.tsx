import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "EN" | "FR";

const dict = {
  EN: {
    shop: "Shop",
    archive: "Archive",
    instagram: "Instagram",
    addToCart: "Add to Cart",
    askWhatsApp: "Ask via WhatsApp",
    soldOut: "Sold Out",
    fewLeft: "Low Stock",
    new: "New",
    selectSize: "Select Size",
    selectColor: "Select Color",
    back: "Back",
    viewAll: "View all",
    newArrivals: "New Arrivals",
    pastDrops: "Past Drops",
    comingSoon: "Coming soon",
    loading: "Loading inventory...",
    loadingProduct: "Loading product...",
    allProducts: "All Products",
    inStock: "in stock",
    cart: "CART",
    cartEmpty: "Your cart is empty",
    total: "Total",
    checkout: "Checkout",
    orderWhatsApp: "Order via WhatsApp",
    inventoryVault: "INVENTORY VAULT",
    items: "ITEMS",
    noProducts: "No products in this category yet.",
    productNotFound: "Product not found",
    backToShop: "Back to shop",
    enterIndex: "Enter Index",
    storeTagline: "This is actually the store. Here is the inventory — every mark, every choice, every silence, ready to be worn.",
    store: "STORE",
    drop001: "Documented Entries",
    drop000: "Passive Memory",
    arrowNew: "↓ Record",
    arrowArchive: "↓ Archive",
    incoming: "IPSEITY — INCOMING",
    systemStatus: "SYSTEM STATUS: INCOMING DROP",
    days: "DAYS",
    hrs: "HRS",
    min: "MIN",
    sec: "SEC",
    markCalendar: "Drop date recorded.",
    footerTagline: "brand born between casablanca and elsewhere.",
    storeEN: "This is the store.",
    // Checkout
    confirmOrder: "Confirm Order",
    placing: "Placing...",
    cashOnly: "Cash on delivery only",
    fullName: "Full Name",
    phoneWhatsApp: "Phone (WhatsApp)",
    email: "Email",
    address: "Address",
    city: "City",
    payment: "Payment",
    paymentInfo1: "PAYMENT: Cash on Delivery.",
    paymentInfo2: "No upfront payment is needed. Our delivery partner will send you a",
    paymentInfo3: "WhatsApp text on the day of delivery",
    paymentInfo4: ". Please ensure your phone number is correct.",
    orderReceived: "ORDER RECEIVED",
    continueBtn: "Continue",
  },
  FR: {
    shop: "Boutique",
    archive: "Archive",
    instagram: "Instagram",
    addToCart: "Ajouter au panier",
    askWhatsApp: "Demander via WhatsApp",
    soldOut: "Épuisé",
    fewLeft: "Presque épuisé",
    new: "Nouveau",
    selectSize: "Choisir la taille",
    selectColor: "Choisir la couleur",
    back: "Retour",
    viewAll: "Voir tout",
    newArrivals: "Nouveautés",
    pastDrops: "Drops passés",
    comingSoon: "Bientôt disponible",
    loading: "Chargement...",
    loadingProduct: "Chargement du produit...",
    allProducts: "Tous les produits",
    inStock: "en stock",
    cart: "PANIER",
    cartEmpty: "Votre panier est vide",
    total: "Total",
    checkout: "Commander",
    orderWhatsApp: "Commander via WhatsApp",
    inventoryVault: "INVENTAIRE",
    items: "ARTICLES",
    noProducts: "Aucun produit dans cette catégorie.",
    productNotFound: "Produit introuvable",
    backToShop: "Retour à la boutique",
    enterIndex: "Entrer dans l'Index",
    storeTagline: "This is the store. Ceci est l'inventaire — chaque marque, chaque choix, chaque silence, prêt à être porté.",
    store: "BOUTIQUE",
    drop001: "Entrées Documentées",
    drop000: "Mémoire passive",
    arrowNew: "↓ Record",
    arrowArchive: "↓ Archive",
    incoming: "IPSEITY — À VENIR",
    systemStatus: "STATUT : DROP À VENIR",
    days: "JOURS",
    hrs: "HRS",
    min: "MIN",
    sec: "SEC",
    markCalendar: "Drop date recorded.",
    footerTagline: "brand born between casablanca and elsewhere.",
    storeEN: "This is the store.",
    confirmOrder: "Confirmer la commande",
    placing: "Envoi...",
    cashOnly: "Paiement à la livraison uniquement",
    fullName: "Nom complet",
    phoneWhatsApp: "Téléphone (WhatsApp)",
    email: "Email",
    address: "Adresse",
    city: "Ville",
    payment: "Paiement",
    paymentInfo1: "PAIEMENT : à la livraison.",
    paymentInfo2: "Aucun paiement à l'avance. Notre livreur vous enverra un",
    paymentInfo3: "message WhatsApp le jour de la livraison",
    paymentInfo4: ". Vérifiez bien votre numéro.",
    orderReceived: "COMMANDE REÇUE",
    continueBtn: "Continuer",
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
