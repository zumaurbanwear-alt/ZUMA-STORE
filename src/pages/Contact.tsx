import { useEffect } from "react";
import { InfoPage } from "@/components/zuma/InfoPage";
import { useLang } from "@/context/LanguageContext";
import { WHATSAPP_LINK } from "@/components/zuma/SiteLayout";
import { CONTACT_EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/contactInfo";

const copy = {
  EN: {
    title: "Contact",
    intro: "Questions about an order, a product, or a partnership? Here's how to reach us.",
    email: "Email",
    emailNote: "For orders, returns and business inquiries alike.",
    responseTime: "Response Time",
    responseTimeBody: "We typically reply within 24 to 48 hours, Monday to Saturday.",
    support: "Customer Support",
    supportBody: "A dedicated support email is coming soon. Until then, use the email above for order or return requests.",
    whatsapp: "WhatsApp",
  },
  FR: {
    title: "Contact",
    intro: "Une question sur une commande, un produit, ou un partenariat ? Voici comment nous joindre.",
    email: "Email",
    emailNote: "Pour les commandes, les retours et les demandes professionnelles.",
    responseTime: "Délai de réponse",
    responseTimeBody: "Nous répondons généralement sous 24 à 48 heures, du lundi au samedi.",
    support: "Service client",
    supportBody: "Une adresse dédiée au support client arrive bientôt. En attendant, utilisez l'email ci-dessus pour vos demandes de commande ou de retour.",
    whatsapp: "WhatsApp",
  },
} as const;

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 py-4 border-b border-border">
    <span className="w-40 shrink-0 text-[9px] tracking-[0.22em] uppercase text-muted-foreground">{label}</span>
    <div className="text-[11px] tracking-[0.02em] text-foreground leading-relaxed">{children}</div>
  </div>
);

const Contact = () => {
  const { lang } = useLang();
  const c = copy[lang];
  useEffect(() => { document.title = "ZÜMA — Contact"; }, []);

  return (
    <InfoPage title={c.title} intro={c.intro}>
      <div className="flex flex-col">
        <Row label={c.email}>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-primary-hi transition-colors">{CONTACT_EMAIL}</a>
          <p className="text-[9px] tracking-[0.05em] text-muted-foreground mt-1">{c.emailNote}</p>
        </Row>
        <Row label="Instagram">
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary-hi transition-colors">{INSTAGRAM_HANDLE}</a>
        </Row>
        <Row label={c.whatsapp}>
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-primary-hi transition-colors">+212 6 00 36 52 83</a>
        </Row>
        <Row label={c.responseTime}>{c.responseTimeBody}</Row>
        <Row label={c.support}>{c.supportBody}</Row>
      </div>
    </InfoPage>
  );
};

export default Contact;
