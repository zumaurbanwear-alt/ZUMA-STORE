import { MessageCircle } from "lucide-react";

export const WhatsAppFab = ({ href }: { href: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    aria-label="Chat on WhatsApp"
    className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-crimson text-black flex items-center justify-center relative whatsapp-pulse hover:bg-crimson-hi transition-colors duration-0"
  >
    <MessageCircle className="w-6 h-6" fill="currentColor" />
  </a>
);
