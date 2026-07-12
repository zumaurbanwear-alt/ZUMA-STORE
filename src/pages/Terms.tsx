import { useEffect } from "react";
import { InfoPage, InfoSection } from "@/components/zuma/InfoPage";
import { useLang } from "@/context/LanguageContext";
import { CONTACT_EMAIL } from "@/lib/contactInfo";

const content = {
  EN: {
    title: "Terms & Conditions",
    intro: "Please read these terms carefully before placing an order on ZÜMA.",
    sections: [
      { h: "Orders", p: "By placing an order, you confirm that the information you provide (name, address, phone number, email) is accurate. All orders are subject to product availability and confirmation via WhatsApp or phone before dispatch. We reserve the right to cancel any order in case of unavailability, pricing error, or suspected fraud." },
      { h: "Pricing", p: "All prices are listed in Moroccan Dirhams (MAD) and include applicable taxes unless stated otherwise. Prices are subject to change without notice, but changes will never affect orders already confirmed." },
      { h: "Payment", p: "Orders are currently paid by Cash on Delivery (COD) only. Payment is collected in cash by our delivery partner at the moment of drop-off and later transferred to us — we do not process the payment directly. No online payment or card details are collected through this site." },
      { h: "Shipping", p: "Shipping is currently available within Morocco only. Delivery fees and estimated timeframes are shown at checkout based on your city. See our Shipping Policy for full details." },
      { h: "Returns", p: "Returns and refunds are handled according to our Return & Refund Policy, available on this site." },
      { h: "Liability", p: "ZÜMA is not liable for indirect, incidental, or consequential damages arising from the use of our products or website, to the fullest extent permitted by law. Nothing in these terms excludes liability that cannot be excluded under applicable law." },
      { h: "Intellectual Property", p: "All content on this site — including the ZÜMA name, logo, product designs, photography, and text — is the property of ZÜMA and may not be reproduced, distributed, or used without prior written consent." },
      { h: "Customer Responsibilities", p: "You are responsible for providing accurate delivery information and for being reasonably available to receive your order. Repeated failed deliveries due to incorrect information may result in order cancellation." },
      { h: "Governing Law", p: `These terms are governed by the laws of Morocco. Any dispute arising from these terms or your use of this site will be subject to the exclusive jurisdiction of the competent Moroccan courts. For any question, contact us at ${CONTACT_EMAIL}.` },
    ],
  },
  FR: {
    title: "Conditions générales de vente",
    intro: "Merci de lire attentivement ces conditions avant de passer commande sur ZÜMA.",
    sections: [
      { h: "Commandes", p: "En passant commande, vous confirmez l'exactitude des informations fournies (nom, adresse, téléphone, email). Toute commande est soumise à disponibilité du produit et à une confirmation par WhatsApp ou téléphone avant expédition. Nous nous réservons le droit d'annuler une commande en cas d'indisponibilité, d'erreur de prix ou de suspicion de fraude." },
      { h: "Prix", p: "Tous les prix sont indiqués en Dirhams marocains (MAD) et incluent les taxes applicables sauf mention contraire. Les prix peuvent être modifiés sans préavis, mais ces modifications n'affecteront jamais les commandes déjà confirmées." },
      { h: "Paiement", p: "Les commandes sont actuellement payées uniquement à la livraison (paiement en espèces). Le paiement est collecté en espèces par notre partenaire de livraison au moment de la remise, puis transféré vers nous — nous ne traitons pas le paiement directement. Aucune donnée de paiement en ligne ou de carte bancaire n'est collectée sur ce site." },
      { h: "Livraison", p: "La livraison est actuellement disponible uniquement au Maroc. Les frais et délais estimés sont affichés lors de la commande selon votre ville. Voir notre Politique de livraison pour plus de détails." },
      { h: "Retours", p: "Les retours et remboursements sont gérés conformément à notre Politique de retour et remboursement, disponible sur ce site." },
      { h: "Responsabilité", p: "ZÜMA ne saurait être tenue responsable des dommages indirects, accessoires ou consécutifs résultant de l'utilisation de nos produits ou de ce site, dans la mesure permise par la loi. Rien dans ces conditions n'exclut une responsabilité qui ne peut être exclue en vertu du droit applicable." },
      { h: "Propriété intellectuelle", p: "L'ensemble du contenu de ce site — nom ZÜMA, logo, designs des produits, photographies et textes — est la propriété de ZÜMA et ne peut être reproduit, distribué ou utilisé sans autorisation écrite préalable." },
      { h: "Responsabilités du client", p: "Vous êtes responsable de fournir des informations de livraison exactes et d'être raisonnablement disponible pour réceptionner votre commande. Des échecs de livraison répétés dus à des informations incorrectes peuvent entraîner l'annulation de la commande." },
      { h: "Droit applicable", p: `Ces conditions sont régies par le droit marocain. Tout litige relatif à ces conditions ou à l'utilisation de ce site relève de la compétence exclusive des tribunaux marocains compétents. Pour toute question, contactez-nous à ${CONTACT_EMAIL}.` },
    ],
  },
} as const;

const Terms = () => {
  const { lang } = useLang();
  const c = content[lang];
  useEffect(() => { document.title = "ZÜMA — Terms & Conditions"; }, []);
  return (
    <InfoPage title={c.title} intro={c.intro}>
      {c.sections.map((s, i) => (
        <InfoSection key={i} heading={s.h}>
          <p>{s.p}</p>
        </InfoSection>
      ))}
    </InfoPage>
  );
};

export default Terms;
