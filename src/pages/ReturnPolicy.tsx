import { useEffect } from "react";
import { InfoPage, InfoSection, InfoList } from "@/components/zuma/InfoPage";
import { useLang } from "@/context/LanguageContext";
import { CONTACT_EMAIL } from "@/lib/contactInfo";

const content = {
  EN: {
    title: "Return & Refund Policy",
    intro: "Our return process happens at the moment of delivery — here's how it works.",
    sections: [
      {
        h: "Try It On at Delivery",
        p: [
          "When your order arrives, you can try the item on right there with the delivery agent before paying. If it doesn't fit or isn't what you expected, simply hand it back — you pay nothing and the order is returned to us at no cost to you.",
        ],
      },
      {
        h: "Once You've Accepted and Paid",
        p: [
          "Payment is collected in cash by our delivery partner at the moment of drop-off, and is later transferred to us — we do not process the payment directly. Because of this, once you've accepted the item and paid, the sale is final: we're unable to offer a refund or exchange after delivery.",
        ],
      },
      {
        h: "Before Your Order Ships",
        p: [
          `Changed your mind, or need to update your size before dispatch? Contact us at ${CONTACT_EMAIL} as soon as possible — we'll do our best to adjust or cancel the order before it leaves.`,
        ],
      },
      {
        h: "Damaged or Incorrect Items",
        p: [
          `If you receive the wrong item or a visibly damaged product, refuse it with the delivery agent, or contact us at ${CONTACT_EMAIL} within 24 hours of delivery with photos — we'll make it right.`,
        ],
      },
    ],
  },
  FR: {
    title: "Politique de retour et remboursement",
    intro: "Notre processus de retour se déroule au moment même de la livraison — voici comment ça fonctionne.",
    sections: [
      {
        h: "Essayage à la livraison",
        p: [
          "À la réception de votre commande, vous pouvez essayer l'article directement avec le livreur, avant de payer. Si la taille ne convient pas ou que l'article ne correspond pas à vos attentes, il vous suffit de le rendre sur place — vous ne payez rien et la commande nous est retournée sans aucun frais pour vous.",
        ],
      },
      {
        h: "Une fois la commande acceptée et payée",
        p: [
          "Le paiement est collecté en espèces par notre partenaire de livraison au moment de la remise, puis transféré vers nous — nous ne traitons pas le paiement directement. Pour cette raison, une fois l'article accepté et payé, la vente est définitive : nous ne sommes pas en mesure de proposer un remboursement ou un échange après la livraison.",
        ],
      },
      {
        h: "Avant l'expédition de votre commande",
        p: [
          `Vous avez changé d'avis ou souhaitez modifier votre taille avant l'expédition ? Contactez-nous au plus vite à ${CONTACT_EMAIL} — nous ferons notre possible pour ajuster ou annuler la commande avant son départ.`,
        ],
      },
      {
        h: "Article endommagé ou erroné",
        p: [
          `Si vous recevez le mauvais article ou un produit visiblement endommagé, refusez-le auprès du livreur, ou contactez-nous à ${CONTACT_EMAIL} dans les 24 heures suivant la livraison avec des photos — nous trouverons une solution.`,
        ],
      },
    ],
  },
} as const;

const ReturnPolicy = () => {
  const { lang } = useLang();
  const c = content[lang];
  useEffect(() => { document.title = "ZÜMA — Return & Refund Policy"; }, []);
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

export default ReturnPolicy;
