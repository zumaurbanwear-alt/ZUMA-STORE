import { useEffect } from "react";
import { Link } from "react-router-dom";
import { InfoPage, FaqItem } from "@/components/zuma/InfoPage";
import { useLang } from "@/context/LanguageContext";
import { INSTAGRAM_HANDLE, CONTACT_EMAIL } from "@/lib/contactInfo";

const content = {
  EN: {
    title: "FAQ",
    intro: "Answers to the most common questions about ordering, shipping and returns.",
    items: [
      { q: "How long does shipping take?", a: "Delivery times depend on your city and are shown automatically at checkout once you select your city — typically between 24h and 96h across Morocco." },
      { q: "Which countries do you ship to?", a: "We currently ship within Morocco only. International shipping is not yet available — contact us if you'd like to be notified when it opens." },
      { q: "Can I return an order?", a: "You can try the item on with the delivery agent before paying — if it doesn't fit, just hand it back on the spot, free of charge. Once you've accepted and paid for the item, the sale is final, since payment is collected and transferred by our delivery partner rather than processed directly by us." },
      { q: "What if the item is damaged or wrong?", a: "Refuse it with the delivery agent, or contact us within 24 hours of delivery with photos and we'll make it right." },
      { q: "How can I contact ZÜMA?", a: `Email us at ${CONTACT_EMAIL}, message us on Instagram (${INSTAGRAM_HANDLE}), or reach us on WhatsApp — see our Contact page for details.` },
      { q: "Will sold-out products be restocked?", a: "Some pieces are restocked, others are limited-run and won't return. Follow our Instagram or subscribe to our newsletter for restock updates." },
      { q: "Where are the garments manufactured?", a: "Each product page lists the material and origin details for that specific piece." },
      { q: "What is the Archive?", a: "The Archive documents past drops and discontinued pieces for reference. It's separate from the Store, which only shows items currently available to buy." },
    ],
  },
  FR: {
    title: "FAQ",
    intro: "Réponses aux questions les plus fréquentes sur les commandes, la livraison et les retours.",
    items: [
      { q: "Quel est le délai de livraison ?", a: "Le délai dépend de votre ville et s'affiche automatiquement lors de la commande une fois la ville sélectionnée — généralement entre 24h et 96h partout au Maroc." },
      { q: "Vers quels pays livrez-vous ?", a: "Nous livrons actuellement uniquement au Maroc. La livraison internationale n'est pas encore disponible — contactez-nous pour être informé de son ouverture." },
      { q: "Puis-je retourner une commande ?", a: "Vous pouvez essayer l'article avec le livreur avant de payer — s'il ne vous va pas, il vous suffit de le rendre sur place, sans frais. Une fois l'article accepté et payé, la vente est définitive, le paiement étant collecté puis transféré par notre partenaire de livraison plutôt que traité directement par nous." },
      { q: "Et si l'article est endommagé ou erroné ?", a: "Refusez-le auprès du livreur, ou contactez-nous dans les 24 heures suivant la livraison avec des photos, et nous trouverons une solution." },
      { q: "Comment contacter ZÜMA ?", a: `Par email à ${CONTACT_EMAIL}, sur Instagram (${INSTAGRAM_HANDLE}), ou via WhatsApp — voir notre page Contact pour les détails.` },
      { q: "Les produits épuisés seront-ils réapprovisionnés ?", a: "Certaines pièces sont réapprovisionnées, d'autres sont en édition limitée et ne reviendront pas. Suivez notre Instagram ou inscrivez-vous à la newsletter pour être informé des réassorts." },
      { q: "Où sont fabriqués les vêtements ?", a: "Chaque fiche produit précise la matière et l'origine de la pièce concernée." },
      { q: "Qu'est-ce que l'Archive ?", a: "L'Archive documente les anciens drops et les pièces retirées de la vente, à titre de référence. Elle est distincte de la Boutique, qui ne présente que les articles actuellement disponibles à l'achat." },
    ],
  },
} as const;

const Faq = () => {
  const { lang } = useLang();
  const c = content[lang];
  useEffect(() => { document.title = "ZÜMA — FAQ"; }, []);
  return (
    <InfoPage title={c.title} intro={c.intro}>
      <div className="flex flex-col">
        {c.items.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
      </div>
      <p className="text-[10px] tracking-[0.1em] text-muted-foreground">
        {lang === "FR" ? "Vous ne trouvez pas votre réponse ? " : "Can't find your answer? "}
        <Link to="/contact" className="text-primary-hi hover:underline">
          {lang === "FR" ? "Contactez-nous" : "Contact us"}
        </Link>
      </p>
    </InfoPage>
  );
};

export default Faq;
