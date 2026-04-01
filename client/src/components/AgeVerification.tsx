import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { storeConfig } from "@/config/store";
import { AlertTriangle } from "lucide-react";
import logoImg from "/logo.png";

const STORAGE_KEY = "age_verified";

export function AgeVerification() {
  const [visible, setVisible] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!storeConfig.ageVerification.enabled) return;
    const verified = sessionStorage.getItem(STORAGE_KEY);
    if (!verified) {
      setVisible(true);
    }
  }, []);

  const handleConfirm = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  const handleDeny = () => {
    setDenied(true);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl"
          style={{ backgroundColor: "#000000", border: "1px solid rgba(201,169,110,0.3)" }}
        >
          {/* Decorative top bar */}
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #8b1a1a, #c9a96e, #8b1a1a)" }} />

          <div className="p-8 text-center">
            {denied ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(139,26,26,0.2)", border: "1px solid rgba(139,26,26,0.4)" }}>
                  <AlertTriangle className="w-8 h-8" style={{ color: "#c9a96e" }} />
                </div>
                <h2 className="text-2xl font-serif text-white">Acesso Restrito</h2>
                <p className="text-gray-400 leading-relaxed text-sm">
                  {storeConfig.ageVerification.deniedMessage}
                </p>
                <p className="text-xs text-gray-600">
                  A venda de bebidas alcoólicas e produtos de tabaco é proibida para menores de 18 anos.
                </p>
              </motion.div>
            ) : (
              <>
                {/* Logo area */}
                <div className="flex items-center justify-center mb-6">
                  <img src={logoImg} alt={storeConfig.name} className="h-20 w-auto object-contain" />
                </div>

                {/* Age badge */}
                <div className="flex items-center justify-center mb-6">
                  <div className="w-20 h-20 rounded-full border-2 flex items-center justify-center flex-col"
                    style={{ borderColor: "#c9a96e" }}>
                    <span className="text-3xl font-bold font-serif" style={{ color: "#c9a96e" }}>18</span>
                    <span className="text-[10px] tracking-widest text-gray-400 uppercase">anos</span>
                  </div>
                </div>

                <h2 className="text-xl font-serif text-white mb-3">
                  {storeConfig.ageVerification.title}
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-8">
                  {storeConfig.ageVerification.message}
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleConfirm}
                    className="w-full py-3 px-6 rounded-lg font-medium text-sm tracking-wide transition-all duration-200 hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: "#c9a96e", color: "#000000" }}
                    data-testid="button-age-confirm"
                  >
                    {storeConfig.ageVerification.confirmText}
                  </button>
                  <button
                    onClick={handleDeny}
                    className="w-full py-3 px-6 rounded-lg font-medium text-sm tracking-wide transition-all duration-200 hover:bg-white/5"
                    style={{ border: "1px solid rgba(255,255,255,0.15)", color: "#9ca3af" }}
                    data-testid="button-age-deny"
                  >
                    {storeConfig.ageVerification.denyText}
                  </button>
                </div>

                <p className="mt-6 text-xs text-gray-600 leading-relaxed">
                  Proibida a venda de bebidas alcoólicas e produtos de tabaco para menores de 18 anos.
                  Lei nº 9.294/96 e Estatuto da Criança e Adolescente.
                </p>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
