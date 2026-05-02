import { MessageCircle } from "lucide-react";

export const WhatsAppFab = ({ href }: { href: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    aria-label="Chat on WhatsApp"
    className="fixed bottom-6 right-6 z-[150] w-14 h-14 rounded-full bg-[#25D366] text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
  >
    <MessageCircle className="w-6 h-6" fill="currentColor" />
  </a>
);
