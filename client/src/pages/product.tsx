import { useState, useMemo, useCallback, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useStore } from "@/lib/StoreContext";
import { Navigation } from "@/components/Navigation";
import { useCart } from "@/lib/CartContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  ShoppingCart,
  Minus,
  Plus,
  MapPin,
  Droplets,
  Package,
  Tag,
  Truck,
  RotateCcw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { storeConfig } from "@/config/store";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";

function ShippingInfo() {
  const { data: shippingConfig } = useQuery<{
    freeShippingThreshold: number | null;
    freeShippingEnabled: boolean;
  }>({
    queryKey: ["shipping-config"],
    queryFn: async () => {
      const res = await fetch("/api/store/shipping-config");
      if (!res.ok)
        return { freeShippingThreshold: null, freeShippingEnabled: false };
      return res.json();
    },
    staleTime: 60000,
  });

  const threshold = shippingConfig?.freeShippingThreshold;
  const freeText =
    shippingConfig?.freeShippingEnabled && threshold
      ? `Frete grátis para compras acima de R$ ${threshold.toFixed(2).replace(".", ",")}.`
      : "";

  return (
    <div
      className="space-y-2 text-sm"
      style={{ color: "rgba(255,255,255,0.6)" }}
    >
      {freeText && <p>{freeText}</p>}
      <p>
        Entrega para todo o Brasil. Prazo de 3 a 7 dias úteis dependendo da sua
        região.
      </p>
      <p>
        Bebidas alcoólicas somente para maiores de 18 anos. Necessário
        apresentar documento na entrega.
      </p>
    </div>
  );
}

export default function ProductPage() {
  const [, params] = useRoute("/product/:id");
  const productId = params?.id;
  const { products, collections, isLoadingProducts } = useStore();
  const product = products.find((p) => p.id === productId);
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    dragFree: false,
  });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentImage(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const allImages = useMemo(() => {
    if (!product) return [];
    const imgs = [product.image];
    if (product.images && Array.isArray(product.images))
      imgs.push(...product.images);
    return imgs.filter(Boolean);
  }, [product]);

  const parsedSizes: Record<string, number> = useMemo(() => {
    if (!product?.sizes) return {};
    try {
      return JSON.parse(product.sizes);
    } catch {
      return {};
    }
  }, [product?.sizes]);

  const availableSizes = Object.entries(parsedSizes)
    .filter(([, qty]) => qty > 0)
    .map(([size]) => size);

  if (isLoadingProducts) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#000000" }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "#c9a96e", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!product) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#000000" }}
      >
        <p className="text-white text-lg font-serif">Produto não encontrado</p>
      </div>
    );
  }

  const collection = collections.find((c) => c.id === product.collectionId);

  const price = parseFloat(product.price as string);
  const promoPrice = product.promotionPrice
    ? parseFloat(product.promotionPrice)
    : null;
  const promoLabel = product.promoLabel ?? null;
  const cashbackPct = (product as any).cashbackPct ?? null;

  const computeTotalStock = () => {
    if (product.sizes) {
      try {
        const sizesObj = JSON.parse(product.sizes) as Record<string, number>;
        const keys = Object.keys(sizesObj);
        if (keys.length === 0) return null;
        return keys.reduce((sum, k) => sum + (sizesObj[k] || 0), 0);
      } catch { return null; }
    }
    const s = (product as any).stock;
    return s ?? null;
  };
  const totalStock = computeTotalStock();
  const isOutOfStock = totalStock !== null && totalStock === 0;

  const formatPrice = (val: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);

  const handleAddToCart = async () => {
    await addToCart(product, quantity, selectedSize ?? undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const specs: { label: string; value: string; icon?: any }[] = [
    product.brand && { label: "Marca", value: product.brand, icon: Tag },
    product.volume && {
      label: "Volume / Quantidade",
      value: product.volume,
      icon: Droplets,
    },
    product.alcoholContent && {
      label: "Teor Alcoólico",
      value: product.alcoholContent,
      icon: Droplets,
    },
    product.origin && { label: "Origem", value: product.origin, icon: MapPin },
    product.weight && {
      label: "Peso",
      value: `${product.weight} kg`,
      icon: Package,
    },
  ].filter(Boolean) as { label: string; value: string; icon: any }[];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#000000" }}>
      <Navigation forceDark />

      <div className="flex flex-col lg:flex-row pt-20 lg:pt-0 min-h-screen">
        {/* LEFT — Image Carousel */}
        <div
          className="w-full lg:w-[55%] lg:sticky lg:top-0 lg:h-screen flex flex-col justify-center"
          style={{ backgroundColor: "#0a0a0a" }}
        >
          {/* Embla swipeable carousel */}
          <div
            className="overflow-hidden cursor-grab active:cursor-grabbing"
            ref={emblaRef}
          >
            <div className="flex">
              {allImages.map((img, i) => (
                <div
                  key={i}
                  className="flex-[0_0_100%] min-w-0 flex items-center justify-center px-8 py-12 lg:py-16"
                >
                  <div
                    className="relative w-full overflow-hidden rounded-2xl"
                    style={{
                      maxHeight: "65vh",
                      boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
                    }}
                  >
                    <img
                      src={img}
                      alt={`${product.name} — foto ${i + 1}`}
                      className="w-full h-full object-cover block"
                      style={{ maxHeight: "65vh", objectPosition: "center" }}
                      draggable={false}
                    />
                    {/* Subtle gold rim */}
                    <div
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{ border: "1px solid rgba(201,169,110,0.12)" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dot indicators + count */}
          {allImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 pb-6">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className="transition-all duration-300"
                  style={{
                    height: "2px",
                    width: currentImage === i ? "28px" : "12px",
                    backgroundColor:
                      currentImage === i ? "#c9a96e" : "rgba(255,255,255,0.2)",
                    borderRadius: "1px",
                  }}
                  data-testid={`btn-img-dot-${i}`}
                />
              ))}
              <span
                className="ml-3 text-xs"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {currentImage + 1}/{allImages.length}
              </span>
            </div>
          )}
        </div>

        {/* RIGHT — Info */}
        <div
          className="w-full lg:w-[45%] lg:h-screen lg:overflow-y-auto"
          style={{ backgroundColor: "#000000" }}
        >
          <div className="p-8 lg:p-14 flex flex-col min-h-full">
            {/* Back */}
            <Link href={`/collection/${product.collectionId}`}>
              <div
                className="inline-flex items-center gap-2 text-xs uppercase tracking-widest mb-8 cursor-pointer transition-colors hover:opacity-100"
                style={{ color: "rgba(201,169,110,0.7)" }}
              >
                <ArrowLeft className="w-3 h-3" />
                {collection?.title ?? "Voltar"}
              </div>
            </Link>

            {/* Title & Price */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {product.brand && (
                <span
                  className="text-xs uppercase tracking-[0.4em] block mb-2"
                  style={{ color: "#c9a96e" }}
                >
                  {product.brand}
                </span>
              )}
              <h1 className="text-3xl md:text-4xl font-serif text-white mb-1 leading-tight">
                {product.name}
              </h1>
              {product.volume && (
                <p
                  className="text-sm mb-6"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  {product.volume}
                  {product.alcoholContent ? ` · ${product.alcoholContent}` : ""}
                  {product.origin ? ` · ${product.origin}` : ""}
                </p>
              )}

              {/* Price */}
              <div className="mb-8">
                {promoLabel && (
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3"
                    style={{
                      backgroundColor: "rgba(139,26,26,0.25)",
                      color: "#ffbbbb",
                      border: "1px solid rgba(139,26,26,0.5)",
                    }}
                  >
                    <span>🏷</span>
                    {promoLabel}
                  </div>
                )}
                <div className="flex items-baseline gap-3">
                  <span
                    className="text-4xl font-serif font-bold"
                    style={{ color: "#c9a96e" }}
                  >
                    {formatPrice(promoPrice ?? price)}
                  </span>
                  {promoPrice && (
                    <span
                      className="text-lg line-through"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      {formatPrice(price)}
                    </span>
                  )}
                </div>
                {cashbackPct && (
                  <div
                    className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: "rgba(201,169,110,0.12)",
                      color: "#c9a96e",
                      border: "1px solid rgba(201,169,110,0.4)",
                    }}
                  >
                    <RotateCcw className="w-3 h-3" />+{cashbackPct}% de cashback
                  </div>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <p
                  className="text-base leading-relaxed mb-8"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  {product.description}
                </p>
              )}
            </motion.div>

            {/* Size selector */}
            {availableSizes.length > 0 && (
              <div className="mb-6">
                <p
                  className="text-xs uppercase tracking-widest mb-3"
                  style={{ color: "#c9a96e" }}
                >
                  Variação / Tamanho
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() =>
                        setSelectedSize(size === selectedSize ? null : size)
                      }
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                      style={{
                        backgroundColor:
                          selectedSize === size
                            ? "#c9a96e"
                            : "rgba(255,255,255,0.06)",
                        color:
                          selectedSize === size
                            ? "#000000"
                            : "rgba(255,255,255,0.7)",
                        border: `1px solid ${selectedSize === size ? "#c9a96e" : "rgba(201,169,110,0.2)"}`,
                      }}
                      data-testid={`btn-size-${size}`}
                    >
                      {size}
                      <span className="ml-1.5 text-xs opacity-60">
                        ({parsedSizes[size]})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div className="flex gap-3 mb-6">
              <div
                className="flex items-center rounded-xl overflow-hidden"
                style={{
                  border: "1px solid rgba(201,169,110,0.25)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                }}
              >
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-4 py-4 transition-all hover:opacity-70 text-white"
                  data-testid="btn-qty-minus"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span
                  className="w-10 text-center text-white font-medium"
                  data-testid="text-quantity"
                >
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-4 py-4 transition-all hover:opacity-70 text-white"
                  data-testid="btn-qty-plus"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={isOutOfStock ? undefined : handleAddToCart}
                disabled={isOutOfStock}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-4 font-medium text-sm tracking-wide transition-all duration-200"
                style={{
                  backgroundColor: isOutOfStock ? "rgba(255,255,255,0.08)" : added ? "#2d5a2d" : "#c9a96e",
                  color: isOutOfStock ? "rgba(255,255,255,0.35)" : "#000000",
                  cursor: isOutOfStock ? "not-allowed" : "pointer",
                }}
                data-testid="btn-add-to-cart"
              >
                <ShoppingCart className="w-4 h-4" />
                {isOutOfStock ? "Produto Indisponível" : added ? "Adicionado!" : "Adicionar ao Carrinho"}
              </button>
            </div>

            {/* Specs table */}
            {specs.length > 0 && (
              <div
                className="rounded-xl p-5 mb-6"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(201,169,110,0.12)",
                }}
              >
                <p
                  className="text-xs uppercase tracking-widest mb-4"
                  style={{ color: "#c9a96e" }}
                >
                  Especificações
                </p>
                <div className="space-y-3">
                  {specs.map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between"
                    >
                      <span
                        className="flex items-center gap-2 text-xs"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                      >
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        {label}
                      </span>
                      <span className="text-sm text-white font-medium">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accordion */}
            <div className="pt-2">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem
                  value="delivery"
                  style={{ borderColor: "rgba(201,169,110,0.15)" }}
                >
                  <AccordionTrigger
                    className="text-xs uppercase tracking-widest font-normal py-4 hover:no-underline"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    <span className="flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5" /> Entrega
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ShippingInfo />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Store info footer */}
            <div className="mt-auto pt-8">
              <div
                className="rounded-xl p-4 flex items-start gap-3"
                style={{
                  backgroundColor: "rgba(201,169,110,0.06)",
                  border: "1px solid rgba(201,169,110,0.12)",
                }}
              >
                <MapPin
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  style={{ color: "#c9a96e" }}
                />
                <div>
                  <p className="text-xs font-medium text-white mb-0.5">
                    {storeConfig.name}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {storeConfig.address.street}, {storeConfig.address.city} -{" "}
                    {storeConfig.address.state}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {storeConfig.contact.hours}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
