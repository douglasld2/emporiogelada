import { MessageCircle } from "lucide-react";
import { storeConfig } from "@/config/store";

export function WhatsAppButton() {
  const handleClick = () => {
    const message = encodeURIComponent(storeConfig.contact.whatsappMessage);
    window.open(`https://wa.me/${storeConfig.contact.phoneClean}?text=${message}`, "_blank");
  };

  return (
    <button
      onClick={handleClick}
      data-testid="button-whatsapp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl"
      aria-label="Contato via WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </button>
  );
}
