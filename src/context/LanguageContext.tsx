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
    storeTagline: "Garments documented, classified, ready for retrieval.",
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
    footerTagline: "origin: casablanca, morocco.",
    storeEN: "This is the store.",
    comingSoon: "Status: Pending",
    initializingSystem: "Initializing System",
    // Newsletter
    newsletterHeadline: "Register For Entry Notifications",
    newsletterSubscribed: "Recorded",
    newsletterInvalid: "Invalid email",
    // Email gate
    gateHeadline: "Access Restricted",
    gateDrop: "Drop 001 — ??/??/26",
    gateEmailPlaceholder: "Your Email",
    gateSkip: "Enter Without Email",
    gateInvalid: "Invalid email",
    // 404
    notFoundTitle: "404",
    notFoundBody: "No Matching Entry Found",
    notFoundBack: "Return To Index",
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
    orderPlacedToast: "Order recorded",
    orderErrorToast: "Could not record order. Please try again.",
    documentation: "Documentation",
    originallyDocumented: "Originally documented in",
    openArchive: "Open Archive",
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
    storeTagline: "Pièces documentées, classifiées, prêtes à être consultées.",
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
    footerTagline: "origine : casablanca, maroc.",
    storeEN: "This is the store.",
    comingSoon: "Statut : En attente",
    initializingSystem: "Initialisation du système",
    // Newsletter
    newsletterHeadline: "S'inscrire aux notifications d'entrées",
    newsletterSubscribed: "Enregistré",
    newsletterInvalid: "Email invalide",
    // Email gate
    gateHeadline: "Accès restreint",
    gateDrop: "Drop 001 — ??/??/26",
    gateEmailPlaceholder: "Votre email",
    gateSkip: "Entrer sans email",
    gateInvalid: "Email invalide",
    // 404
    notFoundTitle: "404",
    notFoundBody: "Aucune entrée correspondante",
    notFoundBack: "Retour à l'Index",
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
    orderPlacedToast: "Commande enregistrée",
    orderErrorToast: "Impossible d'enregistrer la commande. Réessayez.",
    documentation: "Documentation",
    originallyDocumented: "Documenté à l'origine dans",
    openArchive: "Ouvrir l'Archive",
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
