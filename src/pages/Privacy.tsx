import { useEffect } from "react";
import { InfoPage, InfoSection, InfoList } from "@/components/zuma/InfoPage";
import { useLang } from "@/context/LanguageContext";
import { CONTACT_EMAIL } from "@/lib/contactInfo";

const content = {
  EN: {
    title: "Privacy Policy",
    intro: "This page explains what information we collect, why, and how you can control it.",
    sections: [
      { h: "Information We Collect", list: [
        "Order details: name, email, phone number, delivery address and city, submitted when you place an order.",
        "Account details: email address and password, if you create an account.",
        "Newsletter: email address, if you subscribe voluntarily.",
      ] },
      { h: "Cookies & Local Storage", list: [
        "We use your browser's local storage to remember your language preference, your cart contents, and whether you've already seen our entry screen.",
        "These are functional only — they do not track you across other websites.",
      ] },
      { h: "Analytics", list: [
        "We may use privacy-conscious analytics tools to understand overall site traffic and improve the shopping experience. This data is aggregated and not used to identify you personally.",
      ] },
      { h: "Payment Information", list: [
        "Orders are paid by Cash on Delivery. We do not collect or store any card or online payment details on this site.",
      ] },
      { h: "Third-Party Services", list: [
        "Supabase, our database and authentication provider, securely stores order and account data.",
        "WhatsApp is used to confirm and coordinate deliveries with you.",
      ] },
      { h: "Your Rights", list: [
        `You can request access to, correction of, or deletion of your personal data at any time by emailing ${CONTACT_EMAIL}.`,
      ] },
      { h: "Contact", list: [
        `For any privacy-related question, contact us at ${CONTACT_EMAIL}.`,
      ] },
    ],
  },
  FR: {
    title: "Politique de confidentialité",
    intro: "Cette page explique quelles informations nous collectons, pourquoi, et comment vous pouvez les contrôler.",
    sections: [
      { h: "Informations collectées", list: [
        "Détails de commande : nom, email, numéro de téléphone, adresse de livraison et ville, transmis lors de la commande.",
        "Détails de compte : adresse email et mot de passe, si vous créez un compte.",
        "Newsletter : adresse email, si vous vous inscrivez volontairement.",
      ] },
      { h: "Cookies et stockage local", list: [
        "Nous utilisons le stockage local de votre navigateur pour mémoriser votre langue, le contenu de votre panier, et si vous avez déjà vu notre écran d'entrée.",
        "Ces données sont uniquement fonctionnelles — elles ne vous suivent pas sur d'autres sites.",
      ] },
      { h: "Analyse d'audience", list: [
        "Nous pouvons utiliser des outils d'analyse respectueux de la vie privée pour comprendre le trafic global du site et améliorer l'expérience d'achat. Ces données sont agrégées et ne servent pas à vous identifier personnellement.",
      ] },
      { h: "Informations de paiement", list: [
        "Les commandes sont payées à la livraison. Nous ne collectons ni ne stockons aucune donnée de carte bancaire ou de paiement en ligne sur ce site.",
      ] },
      { h: "Services tiers", list: [
        "Supabase, notre fournisseur de base de données et d'authentification, stocke de manière sécurisée les données de commande et de compte.",
        "WhatsApp est utilisé pour confirmer et coordonner les livraisons avec vous.",
      ] },
      { h: "Vos droits", list: [
        `Vous pouvez demander l'accès, la correction ou la suppression de vos données personnelles à tout moment en écrivant à ${CONTACT_EMAIL}.`,
      ] },
      { h: "Contact", list: [
        `Pour toute question relative à la confidentialité, contactez-nous à ${CONTACT_EMAIL}.`,
      ] },
    ],
  },
} as const;

const Privacy = () => {
  const { lang } = useLang();
  const c = content[lang];
  useEffect(() => { document.title = "ZÜMA — Privacy Policy"; }, []);
  return (
    <InfoPage title={c.title} intro={c.intro}>
      {c.sections.map((s, i) => (
        <InfoSection key={i} heading={s.h}>
          <InfoList items={s.list} />
        </InfoSection>
      ))}
    </InfoPage>
  );
};

export default Privacy;
