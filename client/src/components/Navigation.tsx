import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, ShoppingBag, X, User, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/lib/CartContext";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useAuth } from "@/lib/AuthContext";
import { storeConfig } from "@/config/store";
import { useStore } from "@/lib/StoreContext";
import logoImg from "/logo.png";

interface NavigationProps {
  forceDark?: boolean;
}

export function Navigation({ forceDark }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [location] = useLocation();
  const { items, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const { groups } = useStore();
  const isNavVisible = useScrollDirection();

  const isDark = true;

  const activeGroups = groups.filter(g => g.isActive !== false);

  const topLinks = [
    { label: "Início", href: "/" },
    { label: "Loja", href: "/shop" },
    { label: "Kits & Presentes", href: "/kits" },
  ];

  const bottomLinks = [
    ...(user
      ? [{ label: user.role === "admin" ? "Painel Admin" : "Minha Conta", href: user.role === "admin" ? "/admin" : "/account" }]
      : [{ label: "Entrar", href: "/login" }]),
    { label: "Sobre", href: "/about" },
    { label: "Contato", href: "/contact" },
    { label: "Políticas", href: "/politicas" },
  ];

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsCategoriesOpen(false);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 pointer-events-none ${
          isNavVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        } ${
          isDark
            ? "py-6 border-b border-white/10"
            : "py-4 bg-white border-b border-gray-200"
        }`}
        style={isDark ? { backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" } : {}}
      >
        <div className="container mx-auto px-6 flex items-center justify-between">
          {/* Left: Menu + links */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsMenuOpen(true)}
              className={`p-2 hover:opacity-70 transition-opacity pointer-events-auto ${isDark ? "text-white" : "text-gray-800"}`}
              data-testid="button-open-menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link href="/shop" className="pointer-events-auto">
              <span className={`hidden md:block text-xs tracking-widest uppercase cursor-pointer hover:opacity-70 transition-opacity ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                Loja
              </span>
            </Link>
            <Link href="/about" className="pointer-events-auto">
              <span className={`hidden md:block text-xs tracking-widest uppercase cursor-pointer hover:opacity-70 transition-opacity ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                Sobre
              </span>
            </Link>
          </div>

          {/* Center: Logo */}
          <Link href="/" className="pointer-events-auto absolute left-1/2 transform -translate-x-1/2">
            <img
              src={logoImg}
              alt={storeConfig.name}
              className="h-12 md:h-14 w-auto object-contain cursor-pointer"
              style={isDark ? { filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" } : {}}
            />
          </Link>

          {/* Right: User + Cart */}
          <div className="flex items-center gap-4">
            <Link href={user ? (user.role === "admin" ? "/admin" : "/account") : "/login"} className="pointer-events-auto hidden md:block">
              <span className={`text-xs tracking-widest uppercase cursor-pointer hover:opacity-70 transition-opacity ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                {user ? (user.name?.split(" ")[0] || user.email.split("@")[0]) : "Entrar"}
              </span>
            </Link>
            <Link href={user ? (user.role === "admin" ? "/admin" : "/account") : "/login"} className="pointer-events-auto md:hidden">
              <User className={`w-5 h-5 ${isDark ? "text-white" : "text-gray-800"}`} />
            </Link>
            <button
              onClick={() => setIsCartOpen(true)}
              className={`p-2 hover:opacity-70 transition-opacity relative pointer-events-auto ${isDark ? "text-white" : "text-gray-800"}`}
              data-testid="button-open-cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {items.length > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold text-white"
                  style={{ backgroundColor: "#8b1a1a" }}
                >
                  {items.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Full Screen Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, clipPath: "circle(0% at 3% 4%)" }}
            animate={{ opacity: 1, clipPath: "circle(150% at 3% 4%)" }}
            exit={{ opacity: 0, clipPath: "circle(0% at 3% 4%)" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[60] flex flex-col"
            style={{ backgroundColor: "#000000" }}
          >
            {/* Decorative gradient */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at top right, #8b1a1a 0%, transparent 60%)" }}
            />

            {/* Header */}
            <div className="p-6 md:p-8 flex justify-between items-center relative z-10">
              <img src={logoImg} alt={storeConfig.name} className="h-12 w-auto object-contain" />
              <button
                onClick={closeMenu}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                data-testid="button-close-menu"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Menu items */}
            <div className="flex-1 flex flex-col justify-center px-8 md:px-16 relative z-10 overflow-y-auto">
              <nav className="space-y-1 py-4">

                {/* Top links */}
                {topLinks.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.06, ease: "easeOut" }}
                  >
                    <Link href={item.href}>
                      <span
                        onClick={closeMenu}
                        className="block text-3xl md:text-5xl font-serif cursor-pointer transition-colors py-1"
                        style={{ color: location === item.href ? "#c9a96e" : "#ffffff" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#c9a96e")}
                        onMouseLeave={e => (e.currentTarget.style.color = location === item.href ? "#c9a96e" : "#ffffff")}
                        data-testid={`menu-link-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </motion.div>
                ))}

                {/* Categorias — accordion */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + topLinks.length * 0.06, ease: "easeOut" }}
                >
                  <button
                    onClick={() => setIsCategoriesOpen(o => !o)}
                    className="flex items-center gap-3 py-1 w-full text-left group"
                    data-testid="menu-btn-categorias"
                  >
                    <span
                      className="text-3xl md:text-5xl font-serif transition-colors"
                      style={{ color: isCategoriesOpen ? "#c9a96e" : "#ffffff" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#c9a96e")}
                      onMouseLeave={e => (e.currentTarget.style.color = isCategoriesOpen ? "#c9a96e" : "#ffffff")}
                    >
                      Categorias
                    </span>
                    <motion.div
                      animate={{ rotate: isCategoriesOpen ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                      className="mt-1"
                    >
                      <ChevronDown
                        className="w-5 h-5 md:w-7 md:h-7"
                        style={{ color: isCategoriesOpen ? "#c9a96e" : "rgba(255,255,255,0.5)" }}
                      />
                    </motion.div>
                  </button>

                  {/* Dynamic group sub-items */}
                  <AnimatePresence>
                    {isCategoriesOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden pl-4 md:pl-6"
                      >
                        <div
                          className="py-3 space-y-1 border-l-2"
                          style={{ borderColor: "rgba(201,169,110,0.3)" }}
                        >
                          {activeGroups.length === 0 ? (
                            <span className="text-sm text-gray-500 pl-4">Nenhuma categoria cadastrada</span>
                          ) : (
                            activeGroups.map((group, gi) => (
                              <motion.div
                                key={group.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: gi * 0.04 }}
                              >
                                <Link href={`/grupo/${group.id}`}>
                                  <span
                                    onClick={closeMenu}
                                    className="block text-xl md:text-2xl font-serif cursor-pointer transition-colors py-1 pl-4"
                                    style={{ color: location === `/grupo/${group.id}` ? "#c9a96e" : "rgba(255,255,255,0.75)" }}
                                    onMouseEnter={e => (e.currentTarget.style.color = "#c9a96e")}
                                    onMouseLeave={e => (e.currentTarget.style.color = location === `/grupo/${group.id}` ? "#c9a96e" : "rgba(255,255,255,0.75)")}
                                    data-testid={`menu-link-group-${group.id}`}
                                  >
                                    {group.name}
                                  </span>
                                </Link>
                              </motion.div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Separator */}
                <div className="py-2">
                  <div className="h-px w-12" style={{ backgroundColor: "rgba(201,169,110,0.25)" }} />
                </div>

                {/* Bottom links */}
                {bottomLinks.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + (topLinks.length + 1 + i) * 0.06, ease: "easeOut" }}
                  >
                    <Link href={item.href}>
                      <span
                        onClick={closeMenu}
                        className="block text-xl md:text-2xl font-serif cursor-pointer transition-colors py-1"
                        style={{ color: location === item.href ? "#c9a96e" : "rgba(255,255,255,0.55)" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#c9a96e")}
                        onMouseLeave={e => (e.currentTarget.style.color = location === item.href ? "#c9a96e" : "rgba(255,255,255,0.55)")}
                        data-testid={`menu-link-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </nav>
            </div>

            {/* Footer info */}
            <div className="p-8 relative z-10 flex justify-between items-end text-xs text-gray-500 uppercase tracking-widest">
              <span>{storeConfig.contact.hours}</span>
              <span>Est. {storeConfig.foundedYear} — {storeConfig.address.city}, {storeConfig.address.state}</span>
            </div>

            {/* Decorative line */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, #c9a96e, transparent)" }} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
