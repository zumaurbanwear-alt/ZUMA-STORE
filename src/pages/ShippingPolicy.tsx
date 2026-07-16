import { useEffect } from "react";
import { InfoPage, InfoSection, InfoList } from "@/components/zuma/common/InfoPage";
import { useLang } from "@/context/LanguageContext";
import { CONTACT_EMAIL } from "@/lib/contactInfo";

const content = {
  EN: {
    title: "Shipping Policy",
    intro: "Everything you need to know about how and when your order will arrive.",
    sections: [
      { h: "Processing Time", p: ["Orders are processed within 24 to 48 hours after confirmation, excluding weekends and public holidays."] },
      { h: "Shipping Times", p: ["Delivery times depend on your city and are calculated automatically at checkout once you enter your address — generally between 24h and 96h across Morocco."] },
      { h: "Countries Served", p: ["We currently deliver within Morocco only. International shipping is not available yet."] },
      { h: "Tracking", p: [`Our delivery partner will contact you by WhatsApp on the day of delivery to coordinate. If you have questions about your order status, contact us at ${CONTACT_EMAIL}.`] },
      { h: "Customs", p: ["Not applicable — all deliveries are domestic (within Morocco)."] },
      { h: "Shipping Costs", p: ["The delivery fee is calculated automatically based on the city you select at checkout and shown separately from the product subtotal before you confirm your order."] },
      { h: "Lost or Delayed Packages", p: [`If your order hasn't arrived within the expected timeframe, contact us at ${CONTACT_EMAIL} with your order number and we'll investigate with our delivery partner.`] },
    ],
  },
  FR: {
    title: "Politique de livraison",
    intro: "Tout ce qu'il faut savoir sur le comment et le quand de la réception de votre commande.",
    sections: [
      { h: "Délai de traitement", p: ["Les commandes sont traitées sous 24 à 48 heures après confirmation, hors week-ends et jours fériés."] },
      { h: "Délais de livraison", p: ["Le délai dépend de votre ville et est calculé automatiquement lors de la commande une fois votre adresse renseignée — généralement entre 24h et 96h partout au Maroc."] },
      { h: "Pays livrés", p: ["Nous livrons actuellement uniquement au Maroc. La livraison internationale n'est pas encore disponible."] },
      { h: "Suivi de commande", p: [`Notre livreur vous contactera par WhatsApp le jour de la livraison pour se coordonner avec vous. Pour toute question sur l'état de votre commande, contactez-nous à ${CONTACT_EMAIL}.`] },
      { h: "Douane", p: ["Non applicable — toutes les livraisons sont domestiques (à l'intérieur du Maroc)."] },
      { h: "Frais de livraison", p: ["Les frais de livraison sont calculés automatiquement selon la ville sélectionnée lors de la commande, et affichés séparément du sous-total des produits avant confirmation."] },
      { h: "Colis perdu ou retardé", p: [`Si votre commande n'est pas arrivée dans le délai prévu, contactez-nous à ${CONTACT_EMAIL} avec votre numéro de commande et nous ferons le nécessaire avec notre livreur.`] },
    ],
  },
} as const;

const ShippingPolicy = () => {
  const { lang } = useLang();
  const c = content[lang];
  useEffect(() => { document.title = "ZÜMA — Shipping Policy"; }, []);
  return (
    <InfoPage title={c.title} intro={c.intro}>
      {c.sections.map((s, i) => (
        <InfoSection key={i} heading={s.h}>
          {s.p.length > 1 ? <InfoList items={s.p} /> : <p>{s.p[0]}</p>}
        </InfoSection>
      ))}
    </InfoPage>
  );
};

export default ShippingPolicy;
