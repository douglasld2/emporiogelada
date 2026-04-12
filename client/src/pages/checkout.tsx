import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Check,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Plus,
  User,
  CreditCard,
  QrCode,
  Loader2,
  Truck,
  Package,
  Tag,
  X,
  Mail,
  AlertCircle,
  Wallet as WalletIcon,
  Gift,
  FileText,
  Building2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address } from "@shared/schema";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import { storeConfig } from "@/config/store";

interface ShippingOption {
  service: string;
  serviceCode: string;
  price: number;
  deliveryTime: number;
  error?: string;
}

interface ShippingInfo {
  shippingName: string;
  shippingEmail: string;
  shippingAddress: string;
  shippingCity: string;
  shippingZip: string;
  shippingCountry: string;
  shippingPhone: string;
}

function getItemEffectivePrice(item: any): string {
  if (item.effectivePrice) return item.effectivePrice.toString();
  const prod = item.product as any;
  if (prod.promotionPrice && parseFloat(prod.promotionPrice) > 0) return prod.promotionPrice;
  // Variation-specific base price
  if (prod.sizePrices) {
    try {
      const sp = JSON.parse(prod.sizePrices) as Record<string, string>;
      const key = item.selectedSize && sp[item.selectedSize] ? item.selectedSize : Object.keys(sp)[0];
      if (key && sp[key] && sp[key] !== '') return sp[key];
    } catch { /* ignore */ }
  }
  if (prod.displayPrice) return prod.displayPrice;
  return item.product.price;
}

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"information" | "shipping" | "payment">(
    "information",
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [useNewAddress, setUseNewAddress] = useState(false);

  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [isCreatingPreference, setIsCreatingPreference] = useState(false);
  const [mpConfigured, setMpConfigured] = useState(false);
  const [mpPublicKey, setMpPublicKey] = useState<string | null>(null);
  const [mpInitialized, setMpInitialized] = useState(false);
  const [mpIsSandbox, setMpIsSandbox] = useState(false);

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] =
    useState<ShippingOption | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [lastCalculatedZip, setLastCalculatedZip] = useState<string | null>(
    null,
  );

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discountType: string;
    discountValue: string;
    description: string | null;
    freeShipping?: boolean;
  } | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [useCashback, setUseCashback] = useState(false);
  const [useReferralReward, setUseReferralReward] = useState(false);

  const referralCode =
    typeof window !== "undefined"
      ? localStorage.getItem("referral_code")
      : null;

  const { data: wallet } = useQuery<{ balance: number; transactions: any[]; enabled: boolean; minPurchase: number; maxDiscountPct: number }>({
    queryKey: ["cashback-wallet"],
    queryFn: async () => {
      const res = await fetch("/api/cashback/wallet", {
        credentials: "include",
      });
      if (!res.ok) return { balance: 0, transactions: [], enabled: true, minPurchase: 0, maxDiscountPct: 100 };
      return res.json();
    },
    enabled: !!user,
  });

  const { data: referralRewardData } = useQuery<{
    hasReward: boolean;
    availableCount: number;
    rewardType: string;
    rewardValue: number;
    minReferrerPurchase: number;
  } | null>({
    queryKey: ["referral-preview"],
    queryFn: async () => {
      const res = await fetch("/api/referral/preview", {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
  });

  const { data: referredDiscountData } = useQuery<{
    applicable: boolean;
    rewardType?: string;
    rewardValue?: number;
  } | null>({
    queryKey: ["referral-referred-discount", referralCode],
    queryFn: async () => {
      if (!referralCode) return null;
      const res = await fetch(
        `/api/referral/referred-discount?code=${referralCode}`,
        { credentials: "include" },
      );
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user && !!referralCode,
  });

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

  const [formData, setFormData] = useState<ShippingInfo>({
    shippingName: "",
    shippingEmail: "",
    shippingAddress: "",
    shippingCity: "",
    shippingZip: "",
    shippingCountry: "Brasil",
    shippingPhone: "",
  });

  const [fiscalData, setFiscalData] = useState({
    personType: "PF" as "PF" | "PJ",
    cpf: "",
    cnpj: "",
    razaoSocial: "",
    inscricaoEstadual: "",
  });

  const formatCPF = (v: string) => v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

  const formatCNPJ = (v: string) => v.replace(/\D/g, "").slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");

  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ["addresses"],
    queryFn: async () => {
      const res = await fetch("/api/addresses", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (user) {
      if (addresses.length > 0 && !selectedAddressId && !useNewAddress) {
        const defaultAddress =
          addresses.find((a) => a.isDefault) || addresses[0];
        setSelectedAddressId(defaultAddress.id);
      } else if (addresses.length === 0) {
        setUseNewAddress(true);
      }
    }
  }, [addresses, selectedAddressId, user, useNewAddress]);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        shippingEmail: user.email,
        shippingName: user.name || "",
      }));
      // Pre-fill fiscal data from user profile
      const u = user as any;
      setFiscalData({
        personType: u.personType ?? "PF",
        cpf: u.cpf ? formatCPF(u.cpf) : "",
        cnpj: u.cnpj ? formatCNPJ(u.cnpj) : "",
        razaoSocial: u.razaoSocial ?? "",
        inscricaoEstadual: u.inscricaoEstadual ?? "",
      });
    }
  }, [user]);

  useEffect(() => {
    fetch("/api/payments/config")
      .then((res) => res.json())
      .then((data) => {
        setMpConfigured(data.configured);
        setMpPublicKey(data.publicKey);
        setMpIsSandbox(data.isSandbox || false);
        if (data.configured && data.publicKey && !mpInitialized) {
          initMercadoPago(data.publicKey, { locale: "pt-BR" });
          setMpInitialized(true);
        }
      })
      .catch(console.error);
  }, [mpInitialized]);

  const createPreference = async () => {
    if (isCreatingPreference || preferenceId) return;

    setIsCreatingPreference(true);
    try {
      const shippingInfo = getShippingInfo();

      const res = await fetch("/api/payments/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productIds: items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            selectedSize: item.selectedSize,
            kitId: item.kitId || undefined,
          })),
          payer: {
            email: shippingInfo.shippingEmail,
            name: shippingInfo.shippingName,
          },
          shippingInfo,
          fiscalData: {
            personType: fiscalData.personType,
            cpf: fiscalData.personType === "PF" ? fiscalData.cpf.replace(/\D/g, "") : null,
            cnpj: fiscalData.personType === "PJ" ? fiscalData.cnpj.replace(/\D/g, "") : null,
            razaoSocial: fiscalData.personType === "PJ" ? fiscalData.razaoSocial : null,
            inscricaoEstadual: fiscalData.personType === "PJ" ? fiscalData.inscricaoEstadual : null,
          },
          shippingCost: shippingCost,
          shippingMethod: selectedShipping?.serviceCode?.startsWith("loggi")
            ? `Loggi - ${selectedShipping?.service || "Express"}`
            : selectedShipping?.service || "PAC",
          couponCode: appliedCoupon?.code || null,
          couponDiscount: couponDiscount || 0,
          cashbackDiscount:
            useCashback && walletBalance > 0 ? cashbackDiscount : 0,
          referralCode: referralCode || null,
          useReferralReward:
            useReferralReward && (referralRewardData?.hasReward ?? false),
          referredDiscount: referredFromCodeDiscount,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create payment preference");
      }

      const data = await res.json();
      setPreferenceId(data.preferenceId);

      if (data.externalReference) {
        localStorage.setItem(
          "emporio-pending-payment",
          JSON.stringify({
            externalReference: data.externalReference,
            shippingInfo,
            items: items.map((item) => ({
              productId: item.product.id,
              productName: item.kit ? item.kit.name : item.product.name,
              quantity: item.quantity,
              price: item.kit
                ? item.kit.promotionPrice &&
                  parseFloat(item.kit.promotionPrice) > 0
                  ? item.kit.promotionPrice
                  : item.kit.price
                : getItemEffectivePrice(item),
              selectedSize: item.selectedSize,
              kitId: item.kitId,
            })),
          }),
        );
      }
    } catch (error) {
      console.error("Error creating preference:", error);
    } finally {
      setIsCreatingPreference(false);
    }
  };

  useEffect(() => {
    if (
      step === "payment" &&
      mpConfigured &&
      !preferenceId &&
      !isCreatingPreference
    ) {
      createPreference();
    }
  }, [step, mpConfigured, preferenceId, isCreatingPreference]);

  const isFreeShippingByThreshold =
    shippingConfig?.freeShippingEnabled &&
    shippingConfig.freeShippingThreshold !== null &&
    subtotal >= shippingConfig.freeShippingThreshold;
  const isFreeShippingByCoupon = appliedCoupon?.freeShipping === true;
  const hasFreeShipping = isFreeShippingByThreshold || isFreeShippingByCoupon;
  const shippingCost = hasFreeShipping ? 0 : selectedShipping?.price || 0;
  const walletBalance = wallet?.balance ?? 0;
  const cashbackEnabled = wallet?.enabled !== false;
  const cashbackMinPurchase = wallet?.minPurchase ?? 0;
  const cashbackMaxPct = wallet?.maxDiscountPct ?? 100;
  // All CRM discounts apply to product subtotal only (not including shipping), matching MercadoPago behavior
  const productBaseAfterCoupon = Math.max(0, subtotal - couponDiscount);
  const maxCashbackDiscount = (productBaseAfterCoupon * cashbackMaxPct) / 100;
  const cashbackDiscount =
    useCashback && walletBalance > 0 && cashbackEnabled && productBaseAfterCoupon >= cashbackMinPurchase
      ? Math.min(walletBalance, maxCashbackDiscount)
      : 0;
  const baseAfterCashback = Math.max(0, productBaseAfterCoupon - cashbackDiscount);
  const referralDiscount = (() => {
    if (!useReferralReward || !referralRewardData?.hasReward) return 0;
    const minP = referralRewardData.minReferrerPurchase ?? 0;
    if (baseAfterCashback < minP) return 0;
    if (referralRewardData.rewardType === "percentage") {
      return Math.min(
        baseAfterCashback,
        (baseAfterCashback * referralRewardData.rewardValue) / 100,
      );
    }
    return Math.min(baseAfterCashback, referralRewardData.rewardValue);
  })();
  const baseAfterReferralReward = Math.max(
    0,
    baseAfterCashback - referralDiscount,
  );
  const referredFromCodeDiscount = (() => {
    if (!referredDiscountData?.applicable || !referredDiscountData.rewardValue)
      return 0;
    if (referredDiscountData.rewardType === "percentage") {
      return Math.min(
        baseAfterReferralReward,
        (baseAfterReferralReward * referredDiscountData.rewardValue) / 100,
      );
    }
    return Math.min(baseAfterReferralReward, referredDiscountData.rewardValue);
  })();
  // Shipping is added back after all product discounts
  const total = Math.max(0, baseAfterReferralReward - referredFromCodeDiscount + shippingCost);

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          cartItems: items.map((item) => ({
            productId: item.product.id,
            price: item.kit
              ? item.kit.promotionPrice &&
                parseFloat(item.kit.promotionPrice) > 0
                ? item.kit.promotionPrice
                : item.kit.price
              : getItemEffectivePrice(item),
            quantity: item.quantity,
            kitId: item.kitId,
          })),
          subtotal: subtotal.toString(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Cupom inválido");
      }

      const data = await res.json();
      setAppliedCoupon(data.coupon);
      setCouponDiscount(parseFloat(data.discountAmount));
      setCouponCode("");
      setPreferenceId(null);
    } catch (error: any) {
      setCouponError(error.message || "Erro ao validar cupom");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponError(null);
    setPreferenceId(null);
  };

  const calculateShippingOptions = async (destinationZip: string) => {
    if (!destinationZip || destinationZip.replace(/\D/g, "").length < 8) return;

    const cleanZip = destinationZip.replace(/\D/g, "");
    if (cleanZip === lastCalculatedZip) return;

    setIsCalculatingShipping(true);
    setShippingError(null);

    try {
      const res = await fetch("/api/shipping/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationZip: cleanZip,
          items: items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            kitId: item.kitId || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao calcular frete");
      }

      const data = await res.json();
      setShippingOptions(data.options || []);
      setLastCalculatedZip(cleanZip);

      if (data.options && data.options.length > 0) {
        setSelectedShipping(data.options[0]);
      }
    } catch (error: any) {
      setShippingError(error.message || "Erro ao calcular frete");
      setShippingOptions([]);
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  const getSelectedAddress = () => {
    if (!selectedAddressId) return null;
    return addresses.find((a) => a.id === selectedAddressId);
  };

  const getShippingInfo = (): ShippingInfo => {
    if (user && !useNewAddress && selectedAddressId) {
      const addr = getSelectedAddress();
      if (addr) {
        return {
          shippingName: `${addr.firstName} ${addr.lastName}`,
          shippingEmail: user.email,
          shippingAddress: addr.apartment
            ? `${addr.address}, ${addr.apartment}`
            : addr.address,
          shippingCity: addr.city,
          shippingZip: addr.postalCode,
          shippingCountry: addr.country,
          shippingPhone: addr.phone || "",
        };
      }
    }
    return formData;
  };

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const shippingInfo = getShippingInfo();
      const orderItems = items.map((item) => {
        if (item.kit) {
          const kitPrice =
            item.kit.promotionPrice && parseFloat(item.kit.promotionPrice) > 0
              ? item.kit.promotionPrice
              : item.kit.price;
          return {
            productId: item.product.id,
            productName: item.kit.name,
            quantity: item.quantity,
            price: kitPrice,
            kitId: item.kitId,
          };
        }
        return {
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: getItemEffectivePrice(item),
          selectedSize: item.selectedSize,
        };
      });

      const endpoint = user ? "/api/orders" : "/api/orders/guest";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: orderItems,
          shippingInfo,
          fiscalData: {
            personType: fiscalData.personType,
            cpf: fiscalData.personType === "PF" ? fiscalData.cpf.replace(/\D/g, "") : null,
            cnpj: fiscalData.personType === "PJ" ? fiscalData.cnpj.replace(/\D/g, "") : null,
            razaoSocial: fiscalData.personType === "PJ" ? fiscalData.razaoSocial : null,
            inscricaoEstadual: fiscalData.personType === "PJ" ? fiscalData.inscricaoEstadual : null,
          },
          totalAmount: total.toString(),
          cashbackDiscount:
            cashbackDiscount > 0 ? cashbackDiscount.toString() : undefined,
          referralCode: referralCode ?? undefined,
          useReferralReward:
            useReferralReward && (referralRewardData?.hasReward ?? false),
          couponCode: appliedCoupon?.code ?? undefined,
          couponId: appliedCoupon?.id ?? undefined,
          couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create order");
      }

      return res.json();
    },
    onSuccess: () => {
      setIsProcessing(false);
      setIsComplete(true);
      clearCart();
    },
    onError: () => {
      setIsProcessing(false);
    },
  });

  const handleComplete = () => {
    setIsProcessing(true);
    createOrderMutation.mutate();
  };

  const isFormValid = () => {
    if (user && !useNewAddress && selectedAddressId) {
      return true;
    }
    return (
      formData.shippingName.trim() !== "" &&
      formData.shippingEmail.trim() !== "" &&
      formData.shippingAddress.trim() !== "" &&
      formData.shippingCity.trim() !== "" &&
      formData.shippingZip.trim() !== ""
    );
  };

  const handleInputChange =
    (field: keyof ShippingInfo) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-200">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-serif mb-4">Pedido Confirmado</h1>
          <p className="text-gray-600 mb-8">
            Obrigado pela sua compra. Você receberá um e-mail de confirmação em
            breve.
          </p>
          <Link href="/">
            <Button
              className="bg-black text-white hover:bg-gray-900 rounded-lg h-12 px-8 uppercase tracking-widest font-medium transition-colors"
              data-testid="button-return-home"
            >
              Voltar para a Loja
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-serif mb-4">Sua sacola está vazia</h1>
          <Link href="/shop">
            <Button
              className="bg-black text-white hover:bg-gray-900 rounded-lg uppercase tracking-widest font-medium transition-colors"
              data-testid="button-start-shopping"
            >
              Começar a Comprar
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (user && !user.emailVerified) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-amber-200">
            <AlertCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-serif mb-4">
            Verificação de E-mail Necessária
          </h1>
          <p className="text-gray-600 mb-6">
            Para finalizar sua compra, você precisa verificar seu e-mail.
            Enviamos um link de verificação para <strong>{user.email}</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Verifique sua caixa de entrada e pasta de spam. Após verificar,
            atualize esta página para continuar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={async () => {
                try {
                  const res = await fetch("/api/auth/resend-verification", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                    credentials: "include",
                  });
                  const data = await res.json();
                  if (res.ok) {
                    alert(
                      "E-mail de verificação reenviado! Verifique sua caixa de entrada.",
                    );
                  } else if (data.error === "Este e-mail já foi verificado") {
                    await queryClient.invalidateQueries({
                      queryKey: ["currentUser"],
                    });
                  }
                } catch {
                  console.error("Failed to resend verification email");
                }
              }}
              variant="outline"
              className="border-amber-500 text-amber-600 hover:bg-amber-50"
              data-testid="button-resend-verification-checkout"
            >
              <Mail className="w-4 h-4 mr-2" />
              Reenviar E-mail
            </Button>
            <Button
              onClick={async () => {
                await queryClient.invalidateQueries({
                  queryKey: ["currentUser"],
                });
              }}
              variant="outline"
              className="border-gray-300"
              data-testid="button-refresh-checkout"
            >
              Já verifiquei, atualizar
            </Button>
            <Link href="/shop">
              <Button
                className="bg-black text-white hover:bg-gray-900"
                data-testid="button-continue-shopping"
              >
                Continuar Comprando
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const shippingInfo = getShippingInfo();

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      <div className="flex-1 p-8 lg:p-20 lg:border-r border-gray-100">
        <Link href="/">
          <span className="text-2xl font-serif font-bold mb-12 block cursor-pointer hover:opacity-80 transition-opacity">
            {storeConfig.shortName}
          </span>
        </Link>

        <div className="flex items-center gap-2 text-sm mb-12 text-gray-500">
          <span
            className={step === "information" ? "text-black font-medium" : ""}
          >
            Informações
          </span>
          <ChevronRight className="w-4 h-4" />
          <span className={step === "shipping" ? "text-black font-medium" : ""}>
            Envio
          </span>
          <ChevronRight className="w-4 h-4" />
          <span className={step === "payment" ? "text-black font-medium" : ""}>
            Pagamento
          </span>
        </div>

        <AnimatePresence mode="wait">
          {step === "information" && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 max-w-lg"
            >
              {user ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.name || user.email}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </div>

                  <h2 className="text-xl font-serif mb-4">
                    Endereço de Entrega
                  </h2>

                  {addresses.length > 0 && !useNewAddress ? (
                    <div className="space-y-3">
                      <RadioGroup
                        value={selectedAddressId || ""}
                        onValueChange={setSelectedAddressId}
                        className="space-y-3"
                      >
                        {addresses.map((address) => (
                          <div
                            key={address.id}
                            className={`border rounded-lg p-4 cursor-pointer transition-all ${
                              selectedAddressId === address.id
                                ? "border-black bg-gray-50"
                                : "border-gray-200 hover:border-gray-400"
                            }`}
                            onClick={() => setSelectedAddressId(address.id)}
                          >
                            <div className="flex items-start gap-3">
                              <RadioGroupItem
                                value={address.id}
                                id={address.id}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Label
                                    htmlFor={address.id}
                                    className="font-medium text-gray-900 cursor-pointer"
                                  >
                                    {address.firstName} {address.lastName}
                                  </Label>
                                  {address.isDefault && (
                                    <span className="text-xs bg-black text-white px-2 py-0.5 rounded">
                                      Padrão
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {address.label}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  {address.address}
                                  {address.apartment &&
                                    `, ${address.apartment}`}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {address.city}, {address.postalCode}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {address.country}
                                </p>
                                {address.phone && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    {address.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>

                      <button
                        onClick={() => setUseNewAddress(true)}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors mt-4"
                        data-testid="button-use-new-address"
                      >
                        <Plus className="w-4 h-4" />
                        Usar outro endereço
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {addresses.length > 0 && (
                        <button
                          onClick={() => setUseNewAddress(false)}
                          className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors mb-4"
                          data-testid="button-use-saved-address"
                        >
                          <MapPin className="w-4 h-4" />
                          Usar endereço salvo
                        </button>
                      )}
                      <div className="flex gap-4">
                        <Input
                          placeholder="Nome"
                          value={formData.shippingName.split(" ")[0] || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              shippingName:
                                `${e.target.value} ${prev.shippingName.split(" ").slice(1).join(" ")}`.trim(),
                            }))
                          }
                          className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                          data-testid="input-firstname"
                        />
                        <Input
                          placeholder="Sobrenome"
                          value={
                            formData.shippingName
                              .split(" ")
                              .slice(1)
                              .join(" ") || ""
                          }
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              shippingName:
                                `${prev.shippingName.split(" ")[0] || ""} ${e.target.value}`.trim(),
                            }))
                          }
                          className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                          data-testid="input-lastname"
                        />
                      </div>
                      <Input
                        placeholder="Endereço"
                        value={formData.shippingAddress}
                        onChange={handleInputChange("shippingAddress")}
                        className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                        data-testid="input-address"
                      />
                      <div className="flex gap-4">
                        <Input
                          placeholder="Cidade"
                          value={formData.shippingCity}
                          onChange={handleInputChange("shippingCity")}
                          className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                          data-testid="input-city"
                        />
                        <Input
                          placeholder="CEP"
                          value={formData.shippingZip}
                          onChange={handleInputChange("shippingZip")}
                          className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                          data-testid="input-postal"
                        />
                      </div>
                      <Input
                        placeholder="País"
                        value={formData.shippingCountry}
                        onChange={handleInputChange("shippingCountry")}
                        className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                        data-testid="input-country"
                      />
                      <Input
                        placeholder="Telefone (opcional)"
                        value={formData.shippingPhone}
                        onChange={handleInputChange("shippingPhone")}
                        className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                        data-testid="input-phone"
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-serif">
                      Informações de Contato
                    </h2>
                    <span className="text-sm text-gray-500">
                      Já tem conta?{" "}
                      <Link href="/login">
                        <span className="underline text-black hover:no-underline cursor-pointer">
                          Entrar
                        </span>
                      </Link>
                    </span>
                  </div>
                  <div className="space-y-4">
                    <Input
                      placeholder="E-mail"
                      type="email"
                      value={formData.shippingEmail}
                      onChange={handleInputChange("shippingEmail")}
                      className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                      data-testid="input-email-checkout"
                    />
                    <Input
                      placeholder="Telefone (opcional)"
                      value={formData.shippingPhone}
                      onChange={handleInputChange("shippingPhone")}
                      className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                      data-testid="input-phone"
                    />
                  </div>

                  <h2 className="text-xl font-serif mt-8 mb-4">
                    Endereço de Entrega
                  </h2>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Input
                        placeholder="Nome"
                        value={formData.shippingName.split(" ")[0] || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            shippingName:
                              `${e.target.value} ${prev.shippingName.split(" ").slice(1).join(" ")}`.trim(),
                          }))
                        }
                        className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                        data-testid="input-firstname"
                      />
                      <Input
                        placeholder="Sobrenome"
                        value={
                          formData.shippingName.split(" ").slice(1).join(" ") ||
                          ""
                        }
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            shippingName:
                              `${prev.shippingName.split(" ")[0] || ""} ${e.target.value}`.trim(),
                          }))
                        }
                        className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                        data-testid="input-lastname"
                      />
                    </div>
                    <Input
                      placeholder="Endereço"
                      value={formData.shippingAddress}
                      onChange={handleInputChange("shippingAddress")}
                      className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                      data-testid="input-address"
                    />
                    <div className="flex gap-4">
                      <Input
                        placeholder="Cidade"
                        value={formData.shippingCity}
                        onChange={handleInputChange("shippingCity")}
                        className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                        data-testid="input-city"
                      />
                      <Input
                        placeholder="CEP"
                        value={formData.shippingZip}
                        onChange={handleInputChange("shippingZip")}
                        className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                        data-testid="input-postal"
                      />
                    </div>
                    <Input
                      placeholder="País"
                      value={formData.shippingCountry}
                      onChange={handleInputChange("shippingCountry")}
                      className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                      data-testid="input-country"
                    />
                    <Input
                      placeholder="Telefone (opcional)"
                      value={formData.shippingPhone}
                      onChange={handleInputChange("shippingPhone")}
                      className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                      data-testid="input-phone"
                    />
                  </div>
                </>
              )}

              {/* Fiscal / Nota Fiscal section */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-5">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <h2 className="text-base font-medium text-gray-800">Dados para Nota Fiscal</h2>
                </div>

                {/* Person type toggle */}
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setFiscalData(f => ({ ...f, personType: "PF" }))}
                    className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${fiscalData.personType === "PF" ? "border-black bg-black text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}
                    data-testid="button-fiscal-pf"
                  >
                    Pessoa Física (CPF)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiscalData(f => ({ ...f, personType: "PJ" }))}
                    className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${fiscalData.personType === "PJ" ? "border-black bg-black text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}
                    data-testid="button-fiscal-pj"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Pessoa Jurídica (CNPJ)
                  </button>
                </div>

                {fiscalData.personType === "PF" ? (
                  <Input
                    placeholder="CPF (opcional)"
                    value={fiscalData.cpf}
                    onChange={e => setFiscalData(f => ({ ...f, cpf: formatCPF(e.target.value) }))}
                    className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                    data-testid="input-fiscal-cpf"
                  />
                ) : (
                  <div className="space-y-3">
                    <Input
                      placeholder="CNPJ"
                      value={fiscalData.cnpj}
                      onChange={e => setFiscalData(f => ({ ...f, cnpj: formatCNPJ(e.target.value) }))}
                      className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                      data-testid="input-fiscal-cnpj"
                    />
                    <Input
                      placeholder="Razão Social"
                      value={fiscalData.razaoSocial}
                      onChange={e => setFiscalData(f => ({ ...f, razaoSocial: e.target.value }))}
                      className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                      data-testid="input-fiscal-razao-social"
                    />
                    <Input
                      placeholder="Inscrição Estadual (opcional)"
                      value={fiscalData.inscricaoEstadual}
                      onChange={e => setFiscalData(f => ({ ...f, inscricaoEstadual: e.target.value }))}
                      className="rounded-lg border border-gray-300 h-12 focus:border-black focus:ring-1 focus:ring-black"
                      data-testid="input-fiscal-inscricao-estadual"
                    />
                  </div>
                )}
              </div>

              <Button
                onClick={() => {
                  const info = getShippingInfo();
                  calculateShippingOptions(info.shippingZip);
                  setStep("shipping");
                }}
                disabled={!isFormValid()}
                className="w-full bg-black text-white hover:bg-gray-900 rounded-lg h-14 uppercase tracking-widest font-medium transition-colors mt-6 disabled:opacity-50"
                data-testid="button-continue-shipping"
              >
                Continuar para Envio
              </Button>
            </motion.div>
          )}

          {step === "shipping" && (
            <motion.div
              key="shipping"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 max-w-lg"
            >
              <div className="border border-gray-300 p-4 rounded-lg mb-8 text-sm bg-gray-50">
                <div className="flex justify-between mb-3">
                  <span className="text-gray-600 font-medium">Contato</span>
                  <span className="text-gray-900 truncate max-w-[200px]">
                    {shippingInfo.shippingEmail}
                  </span>
                  <button
                    onClick={() => setStep("information")}
                    className="underline text-xs text-black hover:no-underline"
                  >
                    Alterar
                  </button>
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Enviar para</span>
                  <span className="text-gray-900 truncate max-w-[200px]">
                    {shippingInfo.shippingAddress}, {shippingInfo.shippingCity}
                  </span>
                  <button
                    onClick={() => setStep("information")}
                    className="underline text-xs text-black hover:no-underline"
                  >
                    Alterar
                  </button>
                </div>
              </div>

              <h2 className="text-xl font-serif mb-6">Método de Envio</h2>

              {isCalculatingShipping ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-4" />
                  <p className="text-gray-600">Calculando frete...</p>
                </div>
              ) : shippingError ? (
                <div className="border border-red-200 bg-red-50 p-4 rounded-lg">
                  <p className="text-red-600 text-sm">{shippingError}</p>
                  <Button
                    onClick={() =>
                      calculateShippingOptions(shippingInfo.shippingZip)
                    }
                    variant="outline"
                    className="mt-3 text-sm"
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : shippingOptions.length === 0 ? (
                <div className="border border-yellow-200 bg-yellow-50 p-4 rounded-lg">
                  <p className="text-yellow-700 text-sm">
                    Nenhuma opção de frete disponível para este CEP.
                  </p>
                </div>
              ) : (
                <RadioGroup
                  value={selectedShipping?.serviceCode || ""}
                  onValueChange={(code) => {
                    const option = shippingOptions.find(
                      (o) => o.serviceCode === code,
                    );
                    if (option) setSelectedShipping(option);
                  }}
                  className="space-y-3"
                >
                  {shippingOptions.map((option) => (
                    <div
                      key={option.serviceCode}
                      className={`border p-4 rounded-lg flex justify-between items-center cursor-pointer transition-all ${
                        selectedShipping?.serviceCode === option.serviceCode
                          ? "border-black bg-black/5"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      onClick={() => setSelectedShipping(option)}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem
                          value={option.serviceCode}
                          id={option.serviceCode}
                        />
                        <div>
                          <Label
                            htmlFor={option.serviceCode}
                            className="font-medium text-gray-900 cursor-pointer flex items-center gap-2"
                          >
                            {option.serviceCode?.startsWith("loggi") ? (
                              <Truck className="w-4 h-4 text-[#c9a96e]" />
                            ) : option.service === "SEDEX" ? (
                              <Truck className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Package className="w-4 h-4 text-green-600" />
                            )}
                            {option.service}
                            {option.serviceCode?.startsWith("loggi") && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-[#c9a96e]/10 text-[#c9a96e] rounded font-semibold uppercase">
                                Loggi
                              </span>
                            )}
                          </Label>
                          <p className="text-xs text-gray-500 mt-1">
                            Entrega em {option.deliveryTime}{" "}
                            {option.deliveryTime === 1
                              ? "dia útil"
                              : "dias úteis"}
                          </p>
                        </div>
                      </div>
                      <span className="font-medium text-gray-900">
                        R$ {option.price.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  ))}
                </RadioGroup>
              )}

              <div className="flex gap-4 mt-8 pt-6">
                <button
                  onClick={() => setStep("information")}
                  className="text-sm underline text-black hover:no-underline"
                >
                  Voltar para informações
                </button>
                <Button
                  onClick={() => setStep("payment")}
                  disabled={!selectedShipping}
                  className="flex-1 bg-black text-white hover:bg-gray-900 rounded-lg h-14 uppercase tracking-widest font-medium transition-colors disabled:opacity-50"
                  data-testid="button-continue-payment"
                >
                  Continuar para Pagamento
                </Button>
              </div>
            </motion.div>
          )}

          {step === "payment" && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 max-w-lg"
            >
              <div className="border border-gray-300 p-4 rounded-lg mb-8 text-sm bg-gray-50">
                <div className="flex justify-between mb-3">
                  <span className="text-gray-600 font-medium">Contato</span>
                  <span className="text-gray-900 truncate max-w-[200px]">
                    {shippingInfo.shippingEmail}
                  </span>
                  <button
                    onClick={() => setStep("information")}
                    className="underline text-xs text-black hover:no-underline"
                  >
                    Alterar
                  </button>
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between mb-3">
                  <span className="text-gray-600 font-medium">Enviar para</span>
                  <span className="text-gray-900 truncate max-w-[200px]">
                    {shippingInfo.shippingAddress}, {shippingInfo.shippingCity}
                  </span>
                  <button
                    onClick={() => setStep("information")}
                    className="underline text-xs text-black hover:no-underline"
                  >
                    Alterar
                  </button>
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Método</span>
                  <span className="text-gray-900">
                    {selectedShipping
                      ? hasFreeShipping
                        ? `${selectedShipping.service} · Grátis`
                        : `${selectedShipping.service} · R$ ${selectedShipping.price.toFixed(2).replace(".", ",")}`
                      : "Não selecionado"}
                  </span>
                  <button
                    onClick={() => setStep("shipping")}
                    className="underline text-xs text-black hover:no-underline"
                  >
                    Alterar
                  </button>
                </div>
              </div>

              <h2 className="text-xl font-serif mb-6">Pagamento</h2>
              <div className="space-y-4">
                {!mpConfigured ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">
                      Sistema de pagamento não configurado.
                    </p>
                    <p className="text-sm text-gray-500">
                      Entre em contato com o administrador.
                    </p>
                  </div>
                ) : isCreatingPreference ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-4" />
                    <p className="text-gray-600">Preparando pagamento...</p>
                  </div>
                ) : preferenceId && mpInitialized ? (
                  <>
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex gap-2 items-center">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium">
                            Cartão de Crédito/Débito
                          </span>
                        </div>
                        <span className="text-gray-300">|</span>
                        <div className="flex gap-2 items-center">
                          <QrCode className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium">PIX</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        Escolha a forma de pagamento que preferir. Você será
                        redirecionado para o Mercado Pago.
                      </p>
                      <div data-testid="mercadopago-wallet">
                        <Wallet initialization={{ preferenceId }} />
                      </div>
                    </div>

                    {mpIsSandbox && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs space-y-2">
                        <p className="font-semibold text-amber-800">
                          🧪 Modo de teste — cartões válidos para sandbox:
                        </p>
                        <div className="text-amber-700 space-y-1">
                          <p>
                            <span className="font-medium">Mastercard:</span>{" "}
                            5031 4332 1540 6351
                          </p>
                          <p>
                            <span className="font-medium">CVV:</span> 123
                            &nbsp;|&nbsp;{" "}
                            <span className="font-medium">Vencimento:</span>{" "}
                            11/30
                          </p>
                          <p>
                            <span className="font-medium">Nome:</span> APRO
                            &nbsp;|&nbsp;{" "}
                            <span className="font-medium">CPF:</span>{" "}
                            123.456.789-09
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-green-700 text-sm bg-green-50 p-4 rounded-lg border border-green-200">
                      <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="font-medium">
                        Pagamento Seguro via Mercado Pago
                      </span>
                    </div>

                    <p className="text-xs text-center text-gray-500">
                      Ao clicar no botão acima, você será redirecionado para
                      finalizar o pagamento de forma segura.
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-4" />
                    <p className="text-gray-600">
                      Carregando opções de pagamento...
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full lg:w-[450px] bg-gray-50 p-8 lg:p-20 border-l border-gray-200 h-full min-h-screen">
        <div className="sticky top-20">
          <div className="space-y-6 mb-8">
            {items.map((item) => {
              const isKit = !!item.kit;
              const displayName = isKit ? item.kit!.name : item.product.name;
              const displayImage = isKit
                ? item.kit!.image || item.product.image
                : item.product.image;
              const kitPromo =
                isKit && item.kit!.promotionPrice
                  ? parseFloat(item.kit!.promotionPrice)
                  : null;
              const kitBase = isKit ? parseFloat(item.kit!.price) : 0;
              // prodBase = variation-specific price (not the single product.price)
              const _prod = item.product as any;
              let prodBase = parseFloat(String(item.product.price));
              if (_prod.sizePrices) {
                try {
                  const _sp = JSON.parse(_prod.sizePrices) as Record<string, string>;
                  const _key = item.selectedSize && _sp[item.selectedSize] ? item.selectedSize : Object.keys(_sp)[0];
                  if (_key && _sp[_key] && _sp[_key] !== '') prodBase = parseFloat(_sp[_key]);
                } catch { /* ignore */ }
              } else if (_prod.displayPrice) {
                prodBase = parseFloat(_prod.displayPrice);
              }
              const prodEffective = item.effectivePrice
                ? parseFloat(item.effectivePrice)
                : _prod.promotionPrice && parseFloat(_prod.promotionPrice) > 0
                  ? parseFloat(_prod.promotionPrice)
                  : prodBase;
              const effectivePrice = isKit
                ? kitPromo && kitPromo > 0
                  ? kitPromo
                  : kitBase
                : prodEffective;
              const originalPrice = isKit
                ? kitPromo && kitPromo > 0
                  ? kitBase
                  : null
                : prodEffective < prodBase
                  ? prodBase
                  : null;

              return (
                <div
                  key={item.id}
                  className="flex gap-4 items-center"
                  data-testid={`checkout-item-${item.kitId || item.product.id}`}
                >
                  <div className="relative w-16 h-20 bg-gray-200 rounded-lg overflow-hidden border border-gray-300">
                    <img
                      src={displayImage}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-gray-800 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {item.quantity}
                    </span>
                    {isKit && (
                      <span className="absolute bottom-0.5 left-0.5 bg-[#c9a96e] rounded px-1 py-0.5 text-[8px] font-bold text-black">
                        KIT
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-serif text-sm text-gray-900">
                      {displayName}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">
                      R${" "}
                      {(effectivePrice * item.quantity)
                        .toFixed(2)
                        .replace(".", ",")}
                    </span>
                    {originalPrice && (
                      <p className="text-xs line-through text-gray-400">
                        R${" "}
                        {(originalPrice * item.quantity)
                          .toFixed(2)
                          .replace(".", ",")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Separator className="my-6" />

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Tag className="w-4 h-4" />
              <span>Cupom de Desconto</span>
            </div>
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <div>
                    <span className="font-mono font-medium text-green-800">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-green-600 text-sm ml-2">
                      -
                      {appliedCoupon.discountType === "percentage"
                        ? `${parseFloat(appliedCoupon.discountValue)}%`
                        : `R$ ${parseFloat(appliedCoupon.discountValue).toFixed(2).replace(".", ",")}`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={removeCoupon}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  data-testid="button-remove-coupon"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Código do cupom"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  onKeyPress={(e) => e.key === "Enter" && validateCoupon()}
                  className="flex-1 rounded-lg border border-gray-300 h-10 focus:border-black focus:ring-1 focus:ring-black font-mono uppercase text-sm"
                  data-testid="input-coupon-code"
                />
                <Button
                  onClick={validateCoupon}
                  disabled={isValidatingCoupon || !couponCode.trim()}
                  className="bg-gray-900 text-white hover:bg-black px-4 h-10 text-sm rounded-lg transition-colors disabled:opacity-50"
                  data-testid="button-apply-coupon"
                >
                  {isValidatingCoupon ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Aplicar"
                  )}
                </Button>
              </div>
            )}
            {couponError && (
              <p className="text-red-500 text-xs">{couponError}</p>
            )}
          </div>

          {user && walletBalance > 0 && cashbackEnabled && (
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <WalletIcon className="w-4 h-4" />
                <span>Cashback</span>
              </div>
              {cashbackMinPurchase > 0 && productBaseAfterCoupon < cashbackMinPurchase ? (
                <div className="border rounded-lg p-3 border-gray-200 bg-gray-50 flex items-center justify-between opacity-60">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Usar saldo de cashback</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Saldo disponível: R${" "}
                      {walletBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      {" · "}compra mínima de R${" "}
                      {cashbackMinPurchase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="w-5 h-5 rounded border-2 border-gray-300" />
                </div>
              ) : (
                <div
                  className={`border rounded-lg p-3 cursor-pointer transition-all flex items-center justify-between ${useCashback ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-gray-400"}`}
                  onClick={() => setUseCashback((v) => !v)}
                  data-testid="toggle-cashback"
                >
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: useCashback ? "#b45309" : "#374151" }}
                    >
                      Usar saldo de cashback
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Saldo disponível: R${" "}
                      {walletBalance.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                      {cashbackMaxPct < 100 && ` · máx. ${cashbackMaxPct}% do valor`}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${useCashback ? "border-amber-500 bg-amber-500" : "border-gray-300"}`}
                  >
                    {useCashback && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              )}
            </div>
          )}

          {user &&
            referredDiscountData?.applicable &&
            referredDiscountData.rewardValue &&
            referredDiscountData.rewardValue > 0 && (
              <div
                className="mb-4 rounded-lg p-3 flex items-start gap-2.5"
                style={{
                  backgroundColor: "rgba(22,163,74,0.08)",
                  border: "1px solid rgba(22,163,74,0.25)",
                }}
              >
                <Gift
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  style={{ color: "#16a34a" }}
                />
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "#16a34a" }}
                  >
                    Desconto de boas-vindas aplicado!
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#15803d" }}>
                    {referredDiscountData.rewardType === "percentage"
                      ? `${referredDiscountData.rewardValue}% de desconto`
                      : `R$ ${Number(referredDiscountData.rewardValue).toFixed(2).replace(".", ",")} de desconto`}{" "}
                    na sua primeira compra via indicação
                  </p>
                </div>
              </div>
            )}

          {user && referralRewardData?.hasReward && (
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Gift className="w-4 h-4" />
                <span>Créditos de Indicação</span>
                {(referralRewardData.availableCount ?? 0) > 1 && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: '#c9a96e' }}>
                    {referralRewardData.availableCount} disponíveis
                  </span>
                )}
              </div>
              <div
                className={`border rounded-lg p-3 cursor-pointer transition-all flex items-center justify-between ${useReferralReward ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-400"}`}
                onClick={() => setUseReferralReward((v) => !v)}
                data-testid="toggle-referral-reward"
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: useReferralReward ? "#16a34a" : "#374151" }}
                  >
                    Usar 1 crédito de indicação nesta compra
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {referralRewardData.rewardType === "percentage"
                      ? `${referralRewardData.rewardValue}% de desconto`
                      : `R$ ${Number(referralRewardData.rewardValue).toFixed(2).replace(".", ",")} de desconto`}
                    {referralRewardData.minReferrerPurchase > 0 &&
                      ` · compra mínima R$ ${Number(referralRewardData.minReferrerPurchase).toFixed(2).replace(".", ",")}`}
                    {(referralRewardData.availableCount ?? 0) > 1 &&
                      ` · restam ${(referralRewardData.availableCount ?? 0) - 1} crédito${(referralRewardData.availableCount ?? 0) - 1 > 1 ? 's' : ''} após esta compra`}
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${useReferralReward ? "border-green-500 bg-green-500" : "border-gray-300"}`}
                >
                  {useReferralReward && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Subtotal</span>
              <span className="text-gray-900 font-medium">
                R$ {subtotal.toFixed(2).replace(".", ",")}
              </span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Desconto ({appliedCoupon?.code})</span>
                <span className="font-medium">
                  -R$ {couponDiscount.toFixed(2).replace(".", ",")}
                </span>
              </div>
            )}
            {cashbackDiscount > 0 && (
              <div
                className="flex justify-between"
                style={{ color: "#b45309" }}
              >
                <span>Cashback usado</span>
                <span className="font-medium">
                  -R$ {cashbackDiscount.toFixed(2).replace(".", ",")}
                </span>
              </div>
            )}
            {referralDiscount > 0 && (
              <div
                className="flex justify-between"
                style={{ color: "#16a34a" }}
              >
                <span>Desconto de indicação</span>
                <span className="font-medium">
                  -R$ {referralDiscount.toFixed(2).replace(".", ",")}
                </span>
              </div>
            )}
            {referredFromCodeDiscount > 0 && (
              <div
                className="flex justify-between"
                style={{ color: "#16a34a" }}
              >
                <span>Desconto de boas-vindas</span>
                <span className="font-medium">
                  -R$ {referredFromCodeDiscount.toFixed(2).replace(".", ",")}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-700">Frete</span>
              <span
                className={`font-medium ${hasFreeShipping ? "text-green-600" : "text-gray-900"}`}
              >
                {!selectedShipping && step === "information"
                  ? "Calcular no próximo passo"
                  : hasFreeShipping
                    ? "Grátis"
                    : `R$ ${shippingCost.toFixed(2).replace(".", ",")}`}
              </span>
            </div>
            {hasFreeShipping && (
              <p className="text-xs text-green-600 mt-1">
                {isFreeShippingByCoupon
                  ? `Frete grátis pelo cupom ${appliedCoupon?.code}`
                  : `Frete grátis para compras acima de R$ ${shippingConfig?.freeShippingThreshold?.toFixed(2).replace(".", ",")}`}
              </p>
            )}
          </div>

          <Separator className="my-6" />

          <div className="flex justify-between items-center">
            <span className="text-lg font-serif text-gray-900">Total</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-gray-500 font-medium">BRL</span>
              <span className="text-2xl font-serif text-gray-900">
                R$ {total.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
