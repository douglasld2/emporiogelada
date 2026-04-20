/**
 * Melhor Envio API integration.
 * Docs: https://docs.melhorenvio.com.br/
 *
 * Authentication: personal access token (Bearer) created at
 * https://melhorenvio.com.br/painel/gerenciar/tokens
 *
 * Required env vars:
 *   - MELHOR_ENVIO_TOKEN          (required) Bearer token
 *   - MELHOR_ENVIO_SANDBOX        (optional) "true" for sandbox env
 *   - MELHOR_ENVIO_USER_AGENT     (optional) User-Agent header (recommended by ME)
 */

export interface MelhorEnvioQuoteOption {
  service: string;
  serviceCode: string;
  price: number;
  deliveryTime: number;
  company?: string;
  companyPicture?: string;
  meServiceId?: number;
}

/**
 * Clean up service names from Melhor Envio.
 * Examples:
 *   "Jadlog .Package" -> "Package"
 *   "Jadlog .Com"     -> ".Com"
 *   "PAC"             -> "PAC"
 */
function cleanServiceName(raw: string): string {
  if (!raw) return "";
  const cleaned = raw
    .replace(/^Jadlog\s+\.?/i, "")
    .replace(/^Correios\s+/i, "")
    .replace(/^LATAM\s+Cargo\s+/i, "")
    .replace(/^Azul\s+Cargo\s+/i, "")
    .replace(/^Buslog\s+/i, "")
    .replace(/^Loggi\s+/i, "")
    .replace(/^\./, "")
    .replace(/éFácil/i, "")
    .trim();
  return cleaned || raw;
}

export interface MelhorEnvioCartResult {
  cartId: string;
  protocol?: string;
  status: string;
}

export interface MelhorEnvioCheckoutResult {
  purchaseId?: string;
  paid: boolean;
  status: string;
}

export interface MelhorEnvioLabelResult {
  status: string;
  trackingCode?: string;
  labelUrl?: string;
}

export interface MelhorEnvioTrackingEvent {
  date: string;
  status: string;
  description: string;
  location?: string;
}

export interface MelhorEnvioTrackingResult {
  status: string;
  trackingCode?: string;
  trackingUrl?: string;
  events: MelhorEnvioTrackingEvent[];
}

function getBaseUrl(): string {
  const sandbox = (process.env.MELHOR_ENVIO_SANDBOX || "").toLowerCase() === "true";
  return sandbox
    ? "https://sandbox.melhorenvio.com.br"
    : "https://melhorenvio.com.br";
}

function getUserAgent(): string {
  return (
    process.env.MELHOR_ENVIO_USER_AGENT ||
    "Emporio Gelada (contato@emporiogelada.com.br)"
  );
}

export function isMelhorEnvioEnabled(): boolean {
  return !!process.env.MELHOR_ENVIO_TOKEN;
}

async function meRequest(
  method: string,
  path: string,
  body?: any,
): Promise<any> {
  const token = process.env.MELHOR_ENVIO_TOKEN;
  if (!token) {
    throw new Error("MELHOR_ENVIO_TOKEN not configured");
  }

  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": getUserAgent(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const errMsg =
      (data && (data.message || data.error)) ||
      (typeof data === "string" ? data : `HTTP ${res.status}`);
    console.error(`[MelhorEnvio] ${method} ${path} failed:`, res.status, errMsg);
    throw new Error(`Melhor Envio API error: ${res.status} - ${errMsg}`);
  }

  return data;
}

/**
 * Calculate shipping rates for a destination.
 * POST /api/v2/me/shipment/calculate
 */
export async function getMelhorEnvioQuote(params: {
  originZip: string;
  destinationZip: string;
  packages: Array<{
    weight: number;
    height: number;
    width: number;
    length: number;
  }>;
  insuranceValue?: number;
}): Promise<MelhorEnvioQuoteOption[]> {
  if (!isMelhorEnvioEnabled()) return [];

  try {
    const totalWeight = params.packages.reduce(
      (sum, p) => sum + Math.max(0.1, p.weight),
      0,
    );
    const maxHeight = Math.max(2, ...params.packages.map((p) => p.height));
    const maxWidth = Math.max(11, ...params.packages.map((p) => p.width));
    const sumLength = params.packages.reduce(
      (sum, p) => sum + Math.max(16, p.length),
      0,
    );

    const body = {
      from: { postal_code: params.originZip.replace(/\D/g, "") },
      to: { postal_code: params.destinationZip.replace(/\D/g, "") },
      package: {
        height: Math.max(2, Math.min(100, maxHeight)),
        width: Math.max(11, Math.min(100, maxWidth)),
        length: Math.max(16, Math.min(100, sumLength)),
        weight: Math.max(0.1, totalWeight),
      },
      options: {
        insurance_value: params.insuranceValue || 0,
        receipt: false,
        own_hand: false,
      },
      services: "1,2,3,4,7,11,12,17",
    };

    const data = await meRequest("POST", "/api/v2/me/shipment/calculate", body);

    if (!Array.isArray(data)) {
      console.log("[MelhorEnvio] Unexpected quote response:", data);
      return [];
    }

    const options: MelhorEnvioQuoteOption[] = data
      .filter((q: any) => !q.error && q.price)
      .map((q: any) => {
        const companyName = q.company?.name || "";
        const companyPicture = q.company?.picture || undefined;
        const serviceName = cleanServiceName(q.name || "");
        const label = companyName
          ? `${companyName} ${serviceName}`.trim()
          : serviceName;
        return {
          service: label || `Melhor Envio ${q.id}`,
          serviceCode: `melhorenvio_${q.id}`,
          price: parseFloat(String(q.price || q.custom_price || "0")),
          deliveryTime: parseInt(
            String(q.delivery_time || q.custom_delivery_time || "5"),
            10,
          ),
          company: companyName || undefined,
          companyPicture,
          meServiceId: typeof q.id === "number" ? q.id : parseInt(q.id, 10),
        };
      })
      .filter((o) => o.price > 0);

    return options.sort((a, b) => a.price - b.price);
  } catch (error: any) {
    console.error("[MelhorEnvio] Quote error:", error.message);
    return [];
  }
}

/**
 * Add a shipment to the Melhor Envio cart (creates a pre-order to be paid).
 * POST /api/v2/me/cart
 */
export async function addToMelhorEnvioCart(params: {
  serviceId: number;
  fromName: string;
  fromPhone: string;
  fromEmail: string;
  fromDocument: string;
  fromCompanyDocument?: string;
  fromAddress: string;
  fromNumber: string;
  fromComplement?: string;
  fromDistrict: string;
  fromCity: string;
  fromState: string;
  fromZip: string;
  toName: string;
  toPhone: string;
  toEmail?: string;
  toDocument?: string;
  toAddress: string;
  toNumber: string;
  toComplement?: string;
  toDistrict: string;
  toCity: string;
  toState: string;
  toZip: string;
  packageWeight: number;
  packageHeight: number;
  packageWidth: number;
  packageLength: number;
  insuranceValue: number;
  externalOrderId?: string;
  invoiceKey?: string;
  /** Request pickup (coleta) by Melhor Envio — required for LATAM Cargo when no unit is set */
  collect?: boolean;
  /** ISO date string (YYYY-MM-DD) for pickup scheduling, defaults to tomorrow */
  collectScheduledDate?: string;
  productsList: Array<{ name: string; quantity: number; unitary_value: number }>;
}): Promise<MelhorEnvioCartResult> {
  const body: any = {
    service: params.serviceId,
    from: {
      name: params.fromName,
      phone: params.fromPhone.replace(/\D/g, ""),
      email: params.fromEmail,
      document: params.fromDocument.replace(/\D/g, ""),
      ...(params.fromCompanyDocument
        ? { company_document: params.fromCompanyDocument.replace(/\D/g, "") }
        : {}),
      address: params.fromAddress,
      number: params.fromNumber,
      ...(params.fromComplement ? { complement: params.fromComplement } : {}),
      district: params.fromDistrict,
      city: params.fromCity,
      state_abbr: params.fromState,
      country_id: "BR",
      postal_code: params.fromZip.replace(/\D/g, ""),
    },
    to: {
      name: params.toName,
      phone: params.toPhone.replace(/\D/g, ""),
      ...(params.toEmail ? { email: params.toEmail } : {}),
      ...(params.toDocument
        ? { document: params.toDocument.replace(/\D/g, "") }
        : {}),
      address: params.toAddress,
      number: params.toNumber,
      ...(params.toComplement ? { complement: params.toComplement } : {}),
      district: params.toDistrict,
      city: params.toCity,
      state_abbr: params.toState,
      country_id: "BR",
      postal_code: params.toZip.replace(/\D/g, ""),
    },
    products: params.productsList,
    volumes: [
      {
        height: Math.max(2, params.packageHeight),
        width: Math.max(11, params.packageWidth),
        length: Math.max(16, params.packageLength),
        weight: Math.max(0.1, params.packageWeight),
      },
    ],
    options: {
      insurance_value: params.insuranceValue,
      receipt: false,
      own_hand: false,
      reverse: false,
      non_commercial: !params.invoiceKey,
      ...(params.collect
        ? {
            collect: true,
            collect_scheduled_date:
              params.collectScheduledDate ||
              (() => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                return d.toISOString().slice(0, 10);
              })(),
          }
        : {}),
      ...(params.invoiceKey
        ? { invoice: { key: params.invoiceKey } }
        : {}),
      ...(params.externalOrderId
        ? { tags: [{ tag: params.externalOrderId, url: null }] }
        : {}),
    },
  };

  const data = await meRequest("POST", "/api/v2/me/cart", body);

  return {
    cartId: data.id || data.order_id || "",
    protocol: data.protocol || undefined,
    status: data.status || "pending",
  };
}

/**
 * Pay (checkout) the cart items.
 * POST /api/v2/me/shipment/checkout
 */
export async function checkoutMelhorEnvioCart(
  cartIds: string[],
): Promise<MelhorEnvioCheckoutResult> {
  const data = await meRequest("POST", "/api/v2/me/shipment/checkout", {
    orders: cartIds,
  });
  const purchase = data?.purchase || data;
  return {
    purchaseId: purchase?.id || purchase?.purchase_id || undefined,
    paid: !!(purchase?.paid_at || purchase?.status === "paid"),
    status: purchase?.status || data?.status || "unknown",
  };
}

/**
 * Generate the labels (must be called after checkout).
 * POST /api/v2/me/shipment/generate
 */
export async function generateMelhorEnvioLabel(
  cartIds: string[],
): Promise<{ status: string; trackingCode?: string }> {
  const data = await meRequest("POST", "/api/v2/me/shipment/generate", {
    orders: cartIds,
  });

  // ME returns an object keyed by cart ID, e.g. { "abc123": { status, tracking, errors } }
  const first =
    data && typeof data === "object" ? (Object.values(data)[0] as any) : null;

  console.log("[MelhorEnvio] generate response:", JSON.stringify(first, null, 2));

  // Detect inner errors returned with 200 status
  if (first?.errors && first.errors.length > 0) {
    const errMsg = Array.isArray(first.errors)
      ? first.errors.join("; ")
      : String(first.errors);
    throw new Error(`Erro ao gerar etiqueta Melhor Envio: ${errMsg}`);
  }
  if (first?.status === "error" || first?.status === "cancelled") {
    throw new Error(
      `Etiqueta com status inesperado: ${first.status}. Verifique os dados da remessa no painel Melhor Envio.`,
    );
  }

  return {
    status: first?.status || "generated",
    trackingCode: first?.tracking || first?.tracking_code || undefined,
  };
}

/**
 * Get a printable label URL.
 * POST /api/v2/me/shipment/print
 */
export async function printMelhorEnvioLabel(
  cartIds: string[],
  mode: "private" | "public" = "public",
): Promise<{ url: string }> {
  const data = await meRequest("POST", "/api/v2/me/shipment/print", {
    mode,
    orders: cartIds,
  });
  const url = data?.url || data?.link || "";
  if (!url) {
    throw new Error(
      "URL da etiqueta não retornada pelo Melhor Envio. Tente novamente em alguns segundos ou acesse o painel ME.",
    );
  }
  return { url };
}

/**
 * Track shipments by Melhor Envio cart/order id(s).
 * POST /api/v2/me/shipment/tracking
 */
export async function getMelhorEnvioTracking(
  cartIds: string[],
): Promise<Record<string, MelhorEnvioTrackingResult>> {
  const data = await meRequest("POST", "/api/v2/me/shipment/tracking", {
    orders: cartIds,
  });

  const result: Record<string, MelhorEnvioTrackingResult> = {};
  if (data && typeof data === "object") {
    for (const [id, raw] of Object.entries<any>(data)) {
      const events = (raw?.tracking?.events ||
        raw?.events ||
        raw?.history ||
        []) as any[];
      result[id] = {
        status: raw?.status || raw?.tracking?.status || "unknown",
        trackingCode:
          raw?.tracking_code ||
          raw?.tracking ||
          raw?.protocol ||
          undefined,
        trackingUrl: raw?.url_tracking || undefined,
        events: events.map((e: any) => ({
          date:
            e.date ||
            e.created_at ||
            e.event_date ||
            e.timestamp ||
            "",
          status: e.status || e.event_status || "",
          description: e.description || e.message || e.event || "",
          location: e.location || e.city || undefined,
        })),
      };
    }
  }
  return result;
}

/**
 * Cancel a Melhor Envio cart item that hasn't been paid yet.
 * POST /api/v2/me/shipment/cancel
 */
export async function cancelMelhorEnvioShipment(
  cartId: string,
  reasonId: number = 2,
  description: string = "Cancelado pelo lojista",
): Promise<{ status: string }> {
  const data = await meRequest("POST", "/api/v2/me/shipment/cancel", {
    order: { id: cartId, reason_id: reasonId, description },
  });
  return { status: data?.status || "cancelled" };
}

/**
 * Build a public tracking URL for the customer.
 */
export function buildMelhorEnvioTrackingUrl(
  protocolOrTrackingCode: string,
): string {
  if (!protocolOrTrackingCode) return "";
  return `https://www.melhorrastreio.com.br/rastreio/${encodeURIComponent(
    protocolOrTrackingCode,
  )}`;
}
