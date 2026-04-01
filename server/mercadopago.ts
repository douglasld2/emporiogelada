import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const getClient = () => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
  }
  return new MercadoPagoConfig({ accessToken });
};

export interface CreatePreferenceData {
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    currency_id?: string;
  }>;
  payer?: {
    email?: string;
    name?: string;
  };
  external_reference?: string;
  notification_url?: string;
  back_urls?: {
    success: string;
    failure: string;
    pending: string;
  };
}

export async function createPaymentPreference(data: CreatePreferenceData) {
  const client = getClient();
  const preference = new Preference(client);

  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : `https://${process.env.URL_APP}` || "http://localhost:5000";

  const result = await preference.create({
    body: {
      items: data.items.map((item) => ({
        id: Math.random().toString(36).substring(7),
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: item.currency_id || "BRL",
      })),
      payer: data.payer
        ? {
            email: data.payer.email,
            name: data.payer.name,
          }
        : undefined,
      external_reference: data.external_reference,
      notification_url:
        data.notification_url || `${baseUrl}/api/payments/webhook`,
      back_urls: data.back_urls || {
        success: `${baseUrl}/checkout/success`,
        failure: `${baseUrl}/checkout/failure`,
        pending: `${baseUrl}/checkout/pending`,
      },
      auto_return: "approved",
      payment_methods: {
        excluded_payment_types: [],
        installments: 12,
      },
    },
  });

  return {
    id: result.id,
    init_point: result.init_point,
    sandbox_init_point: result.sandbox_init_point,
  };
}

export async function getPaymentDetails(paymentId: string) {
  const client = getClient();
  const payment = new Payment(client);

  const result = await payment.get({ id: paymentId });

  return {
    id: result.id?.toString(),
    status: result.status,
    status_detail: result.status_detail,
    payment_method_id: result.payment_method_id,
    payment_type_id: result.payment_type_id,
    transaction_amount: result.transaction_amount,
    currency_id: result.currency_id,
    payer: result.payer,
    external_reference: result.external_reference,
    date_created: result.date_created,
    date_approved: result.date_approved,
    point_of_interaction: result.point_of_interaction,
  };
}

export async function searchPaymentsByExternalReference(
  externalReference: string,
) {
  const client = getClient();
  const payment = new Payment(client);

  const result = await payment.search({
    options: {
      criteria: "desc",
      sort: "date_created",
      external_reference: externalReference,
    },
  });

  return result.results || [];
}

export function isMercadoPagoConfigured(): boolean {
  return !!process.env.MERCADOPAGO_ACCESS_TOKEN;
}
