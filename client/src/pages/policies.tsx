import { Navigation } from "@/components/Navigation";
import { storeConfig } from "@/config/store";
import { Shield, Truck, RefreshCw, Lock, AlertTriangle } from "lucide-react";

export default function PoliciesPage() {
  const { policies, contact } = storeConfig;

  const sections = [
    {
      icon: Truck,
      title: policies.shipping.title,
      color: "#c9a96e",
      content: policies.shipping.content,
    },
    {
      icon: RefreshCw,
      title: policies.returns.title,
      color: "#c9a96e",
      content: policies.returns.content,
    },
    {
      icon: Lock,
      title: policies.privacy.title,
      color: "#c9a96e",
      content: policies.privacy.content,
    },
    {
      icon: AlertTriangle,
      title: policies.ageRestriction.title,
      color: "#8b1a1a",
      content: policies.ageRestriction.content,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero */}
      <section
        className="pt-32 pb-16 text-white"
        style={{ background: "linear-gradient(135deg, #000000 0%, #000000 100%)" }}
      >
        <div className="container mx-auto px-6 text-center">
          <div className="flex justify-center mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(201,169,110,0.15)", border: "1px solid rgba(201,169,110,0.3)" }}
            >
              <Shield className="w-8 h-8" style={{ color: "#c9a96e" }} />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif mb-4">Políticas da Loja</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Transparência e compromisso com nossos clientes em todas as etapas da compra.
          </p>
        </div>
      </section>

      {/* Navigation Pills */}
      <nav className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-6 overflow-x-auto">
          <div className="flex gap-6 py-4 whitespace-nowrap">
            {sections.map((s, i) => (
              <a
                key={i}
                href={`#policy-${i}`}
                className="text-sm font-medium transition-colors hover:opacity-70"
                style={{ color: "#000000" }}
              >
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Policy Sections */}
      <div className="container mx-auto px-6 py-16 max-w-3xl">
        {sections.map((section, i) => (
          <section key={i} id={`policy-${i}`} className="mb-16 scroll-mt-24">
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${section.color}15`, border: `1px solid ${section.color}30` }}
              >
                <section.icon className="w-6 h-6" style={{ color: section.color }} />
              </div>
              <h2 className="text-2xl font-serif" style={{ color: "#000000" }}>
                {section.title}
              </h2>
            </div>
            <div
              className="space-y-3"
              style={{ borderLeft: `3px solid ${section.color}30`, paddingLeft: "1.5rem" }}
            >
              {section.content.map((paragraph, j) => (
                <p key={j} className="text-gray-600 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer Banner */}
      <section className="py-12 text-center text-white" style={{ backgroundColor: "#000000" }}>
        <p className="text-gray-400 text-sm max-w-xl mx-auto px-6">
          Dúvidas? Entre em contato pelo{" "}
          <a
            href={`https://wa.me/${contact.phoneClean}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "#c9a96e" }}
          >
            WhatsApp
          </a>{" "}
          ou{" "}
          <a href={`mailto:${contact.email}`} className="underline" style={{ color: "#c9a96e" }}>
            e-mail
          </a>
          .
        </p>
        <p className="text-gray-600 text-xs mt-4">Última atualização: março de 2026</p>
      </section>
    </div>
  );
}
