import { useState, useEffect } from "react";
import { Link } from "wouter";
import { HeroCarousel } from "@/components/HeroCarousel";
import { Navigation } from "@/components/Navigation";
import { useStore } from "@/lib/StoreContext";
import { useKitsWithItems } from "@/lib/api";
import { storeConfig } from "@/config/store";
import {
  Package,
  Gift,
  Instagram,
  Facebook,
  Phone,
  Mail,
  MapPin,
  Clock,
  Shield,
  ArrowRight,
  ChevronRight,
  Navigation2,
  Zap,
} from "lucide-react";
import logoImg from "/logo.png";
import {
  motion,
  useMotionValue,
  useTransform,
  animate as animateValue,
} from "framer-motion";

const PHYSICAL_STORES = [
  {
    id: "sao-pedro",
    name: "Empório Gelada São Pedro",
    address: "Av. Pedro Henrique Krambeck, nº 1249",
    neighborhood: "São Pedro, Juiz de Fora/MG",
    openTime: "10:45",
    closeTime: "22:00",
    mapsRoute:
      "https://www.google.com/maps/dir/?api=1&destination=Av.+Pedro+Henrique+Krambeck,+1249,+São+Pedro,+Juiz+de+Fora,+MG",
    mapsView:
      "https://www.google.com/maps/search/Empório+Gelada+São+Pedro+Juiz+de+Fora",
    onlineMenu: "https://app.cardapioweb.com/emporio_gelada",
  },
  {
    id: "cascatinha",
    name: "Empório Gelada Cascatinha",
    address: "Av. Deusdedith Salgado, nº 1232",
    neighborhood: "Cascatinha, Juiz de Fora/MG",
    openTime: "11:00",
    closeTime: "22:00",
    mapsRoute:
      "https://www.google.com/maps/dir/?api=1&destination=Av.+Deusdedith+Salgado,+1232,+Cascatinha,+Juiz+de+Fora,+MG",
    mapsView:
      "https://www.google.com/maps/search/Empório+Gelada+Cascatinha+Juiz+de+Fora",
    onlineMenu: "https://app.cardapioweb.com/emporio_gelada_cascatinha",
  },
];

function getStoreStatus(openTime: string, closeTime: string) {
  const now = new Date();
  const [oh, om] = openTime.split(":").map(Number);
  const [ch, cm] = closeTime.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  if (nowMin >= openMin && nowMin < closeMin) {
    return { open: true, label: `Aberto · Fecha às ${closeTime}` };
  }
  if (nowMin < openMin) {
    return { open: false, label: `Abre às ${openTime}` };
  }
  return { open: false, label: "Fechado hoje" };
}

function PhysicalStoreCard({
  store,
  index,
}: {
  store: (typeof PHYSICAL_STORES)[0];
  index: number;
}) {
  const [status, setStatus] = useState(() =>
    getStoreStatus(store.openTime, store.closeTime),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getStoreStatus(store.openTime, store.closeTime));
    }, 60000);
    return () => clearInterval(interval);
  }, [store.openTime, store.closeTime]);

  const shortName = store.name.replace("Empório Gelada ", "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.12 }}
      className="relative overflow-hidden rounded-2xl flex flex-col"
      style={{
        backgroundColor: "#0f0f0f",
        border: "1px solid rgba(201,169,110,0.28)",
        boxShadow:
          "0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,169,110,0.12)",
      }}
    >
      {/* Gold top accent line */}
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, #c9a96e, transparent)",
        }}
      />

      {/* Decorative corner ornament */}
      <div
        className="absolute top-4 right-4 text-[10px] tracking-[0.3em] uppercase font-medium px-2.5 py-1 rounded-full"
        style={{
          backgroundColor: "rgba(201,169,110,0.1)",
          color: "rgba(201,169,110,0.7)",
          border: "1px solid rgba(201,169,110,0.2)",
        }}
      >
        Desde 2016
      </div>

      {/* Card content */}
      <div className="p-6 flex flex-col gap-5 flex-1">
        {/* Header: icon + store name */}
        <div className="flex items-center gap-4 pr-20">
          <div
            className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: "rgba(201,169,110,0.08)",
              border: "1px solid rgba(201,169,110,0.3)",
              boxShadow: "0 0 20px rgba(201,169,110,0.08)",
            }}
          >
            <MapPin className="w-6 h-6" style={{ color: "#c9a96e" }} />
          </div>
          <div>
            <p
              className="text-[9px] tracking-[0.35em] uppercase mb-1"
              style={{ color: "rgba(201,169,110,0.55)" }}
            >
              Loja Física
            </p>
            <h3 className="font-serif text-white text-xl leading-tight">
              {shortName}
            </h3>
          </div>
        </div>

        {/* Gold divider */}
        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, rgba(201,169,110,0.25), transparent)",
          }}
        />

        {/* Address block */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-2.5">
            <div
              className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: "#c9a96e", opacity: 0.6 }}
            />
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
              {store.address}
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <div
              className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: "#c9a96e", opacity: 0.6 }}
            />
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              {store.neighborhood}
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <Clock
              className="w-3 h-3 mt-0.5 flex-shrink-0"
              style={{ color: "rgba(201,169,110,0.5)" }}
            />
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              {store.openTime} – {store.closeTime}h
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-auto pt-1">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                backgroundColor: status.open
                  ? "#4ade80"
                  : "rgba(201,169,110,0.5)",
                boxShadow: status.open ? "0 0 6px #4ade80" : "none",
              }}
            />
            <span
              className="text-xs font-medium"
              style={{
                color: status.open ? "#4ade80" : "rgba(201,169,110,0.75)",
              }}
            >
              {status.label}
            </span>
          </div>
        </div>

        {/* Status + CTA */}
        <div className="flex items-center justify-between gap-3 mt-auto pt-1">
          <a
            href={store.onlineMenu}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200"
            style={{
              backgroundColor: "rgba(201,169,110,0.12)",
              color: "#c9a96e",
              border: "1px solid rgba(201,169,110,0.3)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "rgba(201,169,110,0.22)";
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(201,169,110,0.55)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "rgba(201,169,110,0.12)";
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(201,169,110,0.3)";
            }}
            data-testid={`button-store-route-${store.id}`}
          >
            <Navigation2 className="w-3 h-3" />
            Cardápio Online
          </a>

          <a
            href={store.mapsRoute}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200"
            style={{
              backgroundColor: "rgba(201,169,110,0.12)",
              color: "#c9a96e",
              border: "1px solid rgba(201,169,110,0.3)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "rgba(201,169,110,0.22)";
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(201,169,110,0.55)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "rgba(201,169,110,0.12)";
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(201,169,110,0.3)";
            }}
            data-testid={`button-store-route-${store.id}`}
          >
            <Navigation2 className="w-3 h-3" />
            Ver rota
          </a>
        </div>
      </div>

      {/* Bottom gold line */}
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(201,169,110,0.2), transparent)",
        }}
      />
    </motion.div>
  );
}

function CompactCollectionCard({
  collection,
  index,
}: {
  collection: any;
  index: number;
}) {
  const isDark = collection.theme === "dark";
  return (
    <Link href={`/collection/${collection.id}`}>
      <motion.div
        className="relative overflow-hidden rounded-2xl cursor-pointer group"
        style={{ height: 320 }}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
      >
        {/* Image */}
        {collection.image ? (
          <img
            src={collection.image}
            alt={collection.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <Package className="w-10 h-10 text-gray-300" />
          </div>
        )}

        {/* Overlay */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            background: isDark
              ? "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)"
              : "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
          }}
        />

        {/* Badge "Novo" */}
        {collection.isNewArrival && (
          <span
            className="absolute top-4 left-4 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest font-medium"
            style={{
              backgroundColor: "rgba(139,26,26,0.85)",
              color: "#ffbbbb",
              border: "1px solid rgba(139,26,26,0.6)",
            }}
          >
            Novo
          </span>
        )}

        {/* Text */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="font-serif text-white text-xl md:text-2xl leading-tight mb-1 drop-shadow">
            {collection.title}
          </h3>
          {collection.description && (
            <p className="text-xs text-white/65 leading-relaxed line-clamp-2 mb-3">
              {collection.description}
            </p>
          )}
          <div
            className="flex items-center gap-2 text-xs uppercase tracking-widest transition-all duration-300 group-hover:gap-3"
            style={{ color: "#c9a96e" }}
          >
            <span>Explorar</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function KitDeck({ kitsData }: { kitsData: { kit: any; items: any[] }[] }) {
  const [current, setCurrent] = useState(0);
  const n = kitsData.length;
  const x = useMotionValue(0);
  const rotation = useTransform(x, [-220, 220], [-14, 14]);

  const formatPrice = (v: string | number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(v));

  const flyOff = (dir: 1 | -1, next: number) => {
    animateValue(x, dir * 550, { duration: 0.32, ease: "easeIn" }).then(() => {
      x.set(0);
      setCurrent(next);
    });
  };

  const handleDragEnd = (_: any, info: any) => {
    if (Math.abs(info.offset.x) > 90) {
      flyOff(info.offset.x > 0 ? 1 : -1, (current + 1) % n);
    } else {
      animateValue(x, 0, {
        type: "spring",
        stiffness: 380,
        damping: 26,
      } as any);
    }
  };

  if (n === 0) return null;

  const { kit, items } = kitsData[current];
  const nextKit = kitsData[(current + 1) % n].kit;

  return (
    <div className="w-full max-w-[330px] mx-auto">
      <div className="relative" style={{ height: 380 }}>
        {/* 3rd card (back) */}
        {n > 2 && (
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              transform: "rotate(6deg) scale(0.87) translateY(8px)",
              backgroundColor: "rgba(139,26,26,0.18)",
              border: "1px solid rgba(139,26,26,0.28)",
            }}
          />
        )}

        {/* 2nd card — shows next kit image as hint */}
        {n > 1 && (
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden"
            style={{
              transform: "rotate(-3.5deg) scale(0.93) translateY(4px)",
              backgroundColor: "#0f0f0f",
              border: "1px solid rgba(201,169,110,0.18)",
            }}
          >
            {nextKit.image && (
              <img
                src={nextKit.image}
                alt=""
                className="w-full h-full object-cover opacity-15"
                draggable={false}
              />
            )}
          </div>
        )}

        {/* Top card — draggable, keyed for enter animation */}
        <motion.div
          key={current}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.85}
          onDragEnd={handleDragEnd}
          initial={{ scale: 0.93, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          style={{
            x,
            rotate: rotation,
            zIndex: 20,
            position: "absolute",
            inset: 0,
          }}
          className="rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing flex flex-col"
        >
          {/* Background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: "#111111",
              border: "1px solid rgba(201,169,110,0.3)",
            }}
          />

          {/* Image band */}
          <div
            className="relative flex-shrink-0 overflow-hidden"
            style={{ height: 140 }}
          >
            {kit.image ? (
              <img
                src={kit.image}
                alt={kit.name}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(201,169,110,0.06)" }}
              >
                <Gift
                  className="w-10 h-10 opacity-20"
                  style={{ color: "#c9a96e" }}
                />
              </div>
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(17,17,17,0.75) 100%)",
              }}
            />
            <span
              className="absolute top-3 left-3 text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-widest font-medium"
              style={{
                backgroundColor: "rgba(201,169,110,0.18)",
                color: "#c9a96e",
                border: "1px solid rgba(201,169,110,0.35)",
              }}
            >
              Kit Premium
            </span>
            <span
              className="absolute top-3 right-3 text-[9px] px-2.5 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: "rgba(139,26,26,0.45)",
                color: "#ffbbbb",
                border: "1px solid rgba(139,26,26,0.5)",
              }}
            >
              +18
            </span>
            {/* Kit name over image */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="font-serif text-white text-lg leading-tight drop-shadow-lg">
                {kit.name}
              </h3>
            </div>
          </div>

          {/* Card body */}
          <div className="relative flex flex-col flex-1 p-4 gap-3 z-10">
            {/* Description */}
            {kit.description && (
              <p
                className="text-[11px] leading-relaxed line-clamp-2"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                {kit.description}
              </p>
            )}

            {/* Products */}
            {items.length > 0 && (
              <div className="flex-1">
                <p
                  className="text-[9px] uppercase tracking-[0.3em] mb-2"
                  style={{ color: "rgba(201,169,110,0.55)" }}
                >
                  Inclui
                </p>
                <div className="space-y-1.5">
                  {items.slice(0, 3).map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ backgroundColor: "#c9a96e", opacity: 0.7 }}
                      />
                      <span
                        className="text-xs truncate"
                        style={{ color: "rgba(255,255,255,0.6)" }}
                      >
                        {item.product?.name ?? item.name ?? "Produto"}
                      </span>
                      {item.quantity > 1 && (
                        <span
                          className="text-[10px] ml-auto flex-shrink-0"
                          style={{ color: "rgba(255,255,255,0.3)" }}
                        >
                          ×{item.quantity}
                        </span>
                      )}
                    </div>
                  ))}
                  {items.length > 3 && (
                    <p
                      className="text-[11px] pl-3"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      + {items.length - 3} itens
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Price row */}
            <div
              className="flex items-end justify-between pt-2 mt-auto"
              style={{ borderTop: "1px solid rgba(201,169,110,0.1)" }}
            >
              <div>
                {kit.promotionPrice && (
                  <p
                    className="text-xs line-through"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    {formatPrice(kit.price)}
                  </p>
                )}
                <p className="text-xl font-serif" style={{ color: "#c9a96e" }}>
                  {formatPrice(kit.promotionPrice ?? kit.price)}
                </p>
              </div>
              <p
                className="text-[10px] uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                Arraste →
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-5 px-1">
        <div className="flex gap-1.5 items-center">
          {kitsData.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                x.set(0);
                setCurrent(i);
              }}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? "22px" : "6px",
                height: "6px",
                backgroundColor:
                  i === current ? "#c9a96e" : "rgba(201,169,110,0.22)",
              }}
            />
          ))}
        </div>
        {n > 1 && (
          <button
            onClick={() => flyOff(-1, (current + 1) % n)}
            className="flex items-center gap-1 text-[11px] uppercase tracking-widest transition-colors"
            style={{ color: "rgba(201,169,110,0.5)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#c9a96e")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(201,169,110,0.5)")
            }
          >
            Próximo <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function promoLabel(promo: any): string {
  if (!promo) return "";
  if (promo.discountType === "percentage")
    return `${Number(promo.discountValue)}% OFF`;
  return `R$ ${Number(promo.discountValue).toFixed(2).replace(".", ",")} OFF`;
}

function getGroupPromo(activePromotions: any[], groupId: string): any | null {
  return (
    activePromotions.find(
      (p) =>
        p.targetType === "all" ||
        (p.targetType === "group" && p.targetId === groupId),
    ) ?? null
  );
}

export default function Home() {
  const { collections, groups, activePromotions } = useStore();
  const { data: kitsData = [] } = useKitsWithItems();

  const featuredCollections = collections
    .filter((c) => c.featured)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const newArrivals = collections
    .filter((c) => c.isNewArrival)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const allCollections = [...collections].sort(
    (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0),
  );

  const heroCollections =
    featuredCollections.length > 0 ? featuredCollections : allCollections;

  return (
    <div style={{ backgroundColor: "#000000" }} className="text-white">
      <Navigation />

      {/* Hero Carousel */}
      <HeroCarousel collections={heroCollections} />

      {/* Groups / Category Showcase */}
      {groups.length > 0 && (
        <section className="py-20 px-6" style={{ backgroundColor: "#000000" }}>
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <span
                className="text-xs tracking-[0.4em] uppercase mb-3 block"
                style={{ color: "#c9a96e" }}
              >
                Nossas Categorias
              </span>
              <h2 className="text-4xl md:text-5xl font-serif">
                O Melhor em Cada Categoria
              </h2>
            </div>
            <div
              className={`grid gap-4 ${groups.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : groups.length === 2 ? "grid-cols-2 max-w-md mx-auto" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}`}
            >
              {groups
                .filter((g) => g.isActive !== false)
                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                .map((group) => {
                  const promo = getGroupPromo(activePromotions, group.id);
                  return (
                    <Link key={group.id} href={`/grupo/${group.id}`}>
                      <div
                        className="relative overflow-hidden rounded-2xl cursor-pointer group transition-transform duration-300 hover:scale-[1.02]"
                        style={{
                          aspectRatio: "3/4",
                          backgroundColor: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(201,169,110,0.15)",
                        }}
                      >
                        {group.image ? (
                          <img
                            src={group.image}
                            alt={group.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package
                              className="w-12 h-12 opacity-30"
                              style={{ color: "#c9a96e" }}
                            />
                          </div>
                        )}

                        {/* Promo badge */}
                        {promo && (
                          <div
                            className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                            style={{
                              backgroundColor: "rgba(139,26,26,0.88)",
                              color: "#ffbbbb",
                              border: "1px solid rgba(139,26,26,0.65)",
                            }}
                          >
                            <Zap className="w-2.5 h-2.5" />
                            {promoLabel(promo)}
                          </div>
                        )}

                        <div
                          className="absolute inset-0 flex flex-col justify-end p-5"
                          style={{
                            background:
                              "linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 60%)",
                          }}
                        >
                          <h3 className="font-serif text-xl text-white">
                            {group.name}
                          </h3>
                          {group.description && (
                            <p className="text-sm mt-1 opacity-70 line-clamp-2">
                              {group.description}
                            </p>
                          )}
                          <span
                            className="text-xs mt-3 tracking-widest uppercase transition-colors"
                            style={{ color: "#c9a96e" }}
                          >
                            Explorar →
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        </section>
      )}

      {/* Kits & Presentes Banner */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: "#000000" }}
      >
        {/* Background texture */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 80% 50%, #8b1a1a 0%, transparent 55%), radial-gradient(ellipse at 20% 50%, #c9a96e 0%, transparent 50%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(201,169,110,0.03) 60px, rgba(201,169,110,0.03) 61px)",
          }}
        />

        <div className="container mx-auto px-6 py-20 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16 max-w-5xl mx-auto">
            {/* Left: text */}
            <motion.div
              className="flex-1 text-center md:text-left"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <span
                className="text-xs tracking-[0.45em] uppercase mb-4 block font-medium"
                style={{ color: "#c9a96e" }}
              >
                Presenteie com Elegância
              </span>
              <h2 className="text-4xl md:text-6xl font-serif text-white leading-tight mb-5">
                Kits &<br />
                Presentes
              </h2>
              <p className="text-gray-400 text-base md:text-lg leading-relaxed mb-8 max-w-sm md:max-w-none">
                Combinações exclusivas para tornar cada ocasião especial —
                churrasco, celebrações ou simplesmente uma noite memorável.
                {kitsData.length > 0 && (
                  <span
                    className="block mt-2 text-sm"
                    style={{ color: "rgba(201,169,110,0.7)" }}
                  >
                    {kitsData.length} kit{kitsData.length > 1 ? "s" : ""}{" "}
                    disponíve{kitsData.length > 1 ? "is" : "l"}
                  </span>
                )}
              </p>
              <Link href="/kits">
                <button
                  className="inline-flex items-center gap-3 px-8 py-4 text-sm tracking-widest uppercase font-medium transition-all duration-300 hover:gap-5 hover:shadow-2xl"
                  style={{
                    backgroundColor: "#c9a96e",
                    color: "#000000",
                  }}
                  onMouseEnter={(e) => {
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.backgroundColor = "#b8955a";
                  }}
                  onMouseLeave={(e) => {
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.backgroundColor = "#c9a96e";
                  }}
                  data-testid="button-kits-banner"
                >
                  Ver Kits
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </motion.div>

            {/* Right: dynamic KitDeck */}
            <motion.div
              className="flex-1 w-full flex justify-center"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            >
              <KitDeck kitsData={kitsData} />
            </motion.div>
          </div>
        </div>

        {/* Bottom border */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(201,169,110,0.4), transparent)",
          }}
        />
      </section>

      {/* Novidades — dark section */}
      {allCollections.length > 0 && newArrivals.length > 0 && (
        <section
          className="relative overflow-hidden"
          style={{ backgroundColor: "#000000" }}
        >
          {/* Subtle radial glow */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.06]"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, #c9a96e 0%, transparent 65%)",
            }}
          />
          <div className="relative z-10 px-4 md:px-8 py-16">
            <div className="text-center mb-10">
              <span
                className="text-xs uppercase tracking-[0.4em] mb-3 block"
                style={{ color: "#8b1a1a" }}
              >
                Chegadas Recentes
              </span>
              <h2 className="text-3xl md:text-5xl font-serif text-white">
                Novidades
              </h2>
            </div>
            <div className="container mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {newArrivals.map((collection, i) => (
                  <CompactCollectionCard
                    key={`new-${collection.id}`}
                    collection={collection}
                    index={i}
                  />
                ))}
              </div>
            </div>
          </div>
          <div
            className="h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(201,169,110,0.25), transparent)",
            }}
          />
        </section>
      )}

      {/* Nossa Seleção — dark section matching Kits palette */}
      {allCollections.filter((c) => (c as any).isSelection).length > 0 && (
        <section
          className="relative overflow-hidden"
          style={{ backgroundColor: "#050505" }}
        >
          {/* Background texture lines */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 60px, #c9a96e 60px, #c9a96e 61px)",
            }}
          />
          {/* Subtle bordeaux glow bottom-left */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.07]"
            style={{
              background:
                "radial-gradient(ellipse at 10% 100%, #8b1a1a 0%, transparent 55%)",
            }}
          />

          <div className="relative z-10 px-4 md:px-8 py-20">
            {/* Section header */}
            <div className="text-center mb-12">
              <span
                className="text-xs uppercase tracking-[0.5em] mb-4 block font-medium"
                style={{ color: "#c9a96e" }}
              >
                Descubra
              </span>
              <h2 className="text-4xl md:text-6xl font-serif text-white mb-3">
                Nossa Seleção
              </h2>
              {/* Gold ornament line */}
              <div className="flex items-center justify-center gap-4 mt-5">
                <div
                  className="h-px w-16"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(201,169,110,0.5))",
                  }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "#c9a96e", opacity: 0.6 }}
                />
                <div
                  className="h-px w-16"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(201,169,110,0.5), transparent)",
                  }}
                />
              </div>
            </div>

            <div className="container mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {allCollections
                  .filter((c) => (c as any).isSelection)
                  .map((collection, i) => (
                    <CompactCollectionCard
                      key={`sel-${collection.id}`}
                      collection={collection}
                      index={i}
                    />
                  ))}
              </div>
            </div>
          </div>

          {/* Bottom border */}
          <div
            className="h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(201,169,110,0.3), transparent)",
            }}
          />
        </section>
      )}

      {/* Value Propositions */}
      <section className="py-20 px-6" style={{ backgroundColor: "#000000" }}>
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: Package,
                title: "Curadoria Premium",
                desc: "Cada produto selecionado por especialistas apaixonados",
              },
              {
                icon: Package,
                title: "Embalagem Segura",
                desc: "Produtos frágeis enviados com proteção especial",
              },
              {
                icon: Gift,
                title: "Kits & Presentes",
                desc: "Monte combinações únicas para presentear",
              },
            ].map((item, i) => (
              <div key={i} className="text-center group">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: "rgba(201,169,110,0.1)",
                    border: "1px solid rgba(201,169,110,0.3)",
                  }}
                >
                  <item.icon className="w-7 h-7" style={{ color: "#c9a96e" }} />
                </div>
                <h3 className="font-serif text-lg mb-2 text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nossas Lojas Físicas */}
      <section
        className="relative overflow-hidden py-20 px-6"
        style={{ backgroundColor: "#0a0a0a" }}
      >
        {/* Diagonal texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent, transparent 40px, #c9a96e 40px, #c9a96e 41px)",
          }}
        />
        {/* Radial glow top-right */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            background:
              "radial-gradient(ellipse at 90% 0%, #c9a96e 0%, transparent 55%)",
          }}
        />
        {/* Top border */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(201,169,110,0.35), transparent)",
          }}
        />

        <div className="container mx-auto max-w-3xl relative z-10">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p
              className="text-xs uppercase tracking-[0.5em] mb-4 font-medium"
              style={{ color: "#c9a96e" }}
            >
              Venha nos visitar
            </p>
            <h2 className="text-4xl md:text-5xl font-serif text-white mb-4">
              Nossas Lojas
            </h2>
            {/* Ornament */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <div
                className="h-px w-12"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(201,169,110,0.5))",
                }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: "#c9a96e", opacity: 0.6 }}
              />
              <div
                className="h-px w-12"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(201,169,110,0.5), transparent)",
                }}
              />
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Duas unidades em Juiz de Fora — sempre gelado, sempre premium
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PHYSICAL_STORES.map((store, i) => (
              <PhysicalStoreCard key={store.id} store={store} index={i} />
            ))}
          </div>
        </div>

        {/* Bottom border */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(201,169,110,0.25), transparent)",
          }}
        />
      </section>

      {/* Age Warning Banner */}
      <div
        className="py-4 px-6 text-center text-xs text-gray-500"
        style={{ backgroundColor: "#111111" }}
      >
        <div className="flex items-center justify-center gap-2">
          <Shield
            className="w-4 h-4 flex-shrink-0"
            style={{ color: "#c9a96e" }}
          />
          <span>{storeConfig.footer.ageWarning}</span>
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: "#000000",
          borderTop: "1px solid rgba(201,169,110,0.15)",
        }}
        className="py-16 px-6"
      >
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="mb-4">
                <img
                  src={logoImg}
                  alt={storeConfig.name}
                  className="h-16 w-auto object-contain"
                />
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs mb-5">
                {storeConfig.description}
              </p>
              <div className="flex gap-4">
                {storeConfig.social.instagram && (
                  <a
                    href={storeConfig.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {storeConfig.social.facebook && (
                  <a
                    href={storeConfig.social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>

            {/* Links */}
            <div>
              <h4
                className="text-xs uppercase tracking-widest mb-4"
                style={{ color: "#c9a96e" }}
              >
                Navegação
              </h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {[
                  { label: "Início", href: "/" },
                  { label: "Loja", href: "/shop" },
                  { label: "Sobre Nós", href: "/about" },
                  { label: "Kits & Presentes", href: "/kits" },
                  { label: "Políticas", href: "/politicas" },
                  { label: "Contato", href: "/contact" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>
                      <span className="cursor-pointer hover:text-white transition-colors">
                        {link.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4
                className="text-xs uppercase tracking-widest mb-4"
                style={{ color: "#c9a96e" }}
              >
                Contato
              </h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <MapPin
                    className="w-4 h-4 flex-shrink-0 mt-0.5"
                    style={{ color: "#c9a96e" }}
                  />
                  <span>
                    {storeConfig.address.street}, {storeConfig.address.city} -{" "}
                    {storeConfig.address.state}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: "#c9a96e" }}
                  />
                  <a
                    href={`https://wa.me/${storeConfig.contact.phoneClean}`}
                    className="hover:text-white transition-colors"
                  >
                    {storeConfig.contact.phone}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: "#c9a96e" }}
                  />
                  <a
                    href={`mailto:${storeConfig.contact.email}`}
                    className="hover:text-white transition-colors"
                  >
                    {storeConfig.contact.email}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Clock
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: "#c9a96e" }}
                  />
                  <span>{storeConfig.contact.hours}</span>
                </li>
              </ul>
            </div>
          </div>

          <div
            className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p>
              © {new Date().getFullYear()} {storeConfig.name}.{" "}
              {storeConfig.footer.copyright}
            </p>
            <p>
              Desenvolvido por{" "}
              <a
                href={storeConfig.footer.developer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-400 transition-colors underline"
              >
                {storeConfig.footer.developer.name}
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
