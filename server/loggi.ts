export interface LoggiQuoteOption {
  service: string;
  serviceCode: string;
  price: number;
  deliveryTime: number;
  loggiServiceId?: string;
}

export interface LoggiShipmentResult {
  loggiKey: string;
  trackingCode: string;
  status: string;
}

export interface LoggiLabelResult {
  labelUrl: string;
  labelBase64?: string;
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

function getBaseUrl(): string {
  const env = process.env.LOGGI_ENV || 'production';
  return env === 'staging'
    ? 'https://stg.api.loggi.com'
    : 'https://api.loggi.com';
}

function isConfigured(): boolean {
  return !!(
    process.env.LOGGI_CLIENT_ID &&
    process.env.LOGGI_CLIENT_SECRET &&
    process.env.LOGGI_COMPANY_ID
  );
}

export function isLoggiEnabled(): boolean {
  return isConfigured();
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
    return tokenCache.accessToken;
  }

  const base = getBaseUrl();
  const res = await fetch(`${base}/v2/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.LOGGI_CLIENT_ID,
      client_secret: process.env.LOGGI_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[Loggi] Auth failed:', res.status, text);
    throw new Error(`Loggi auth failed: ${res.status}`);
  }

  const data = await res.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  return tokenCache.accessToken;
}

async function loggiRequest(
  method: string,
  path: string,
  body?: any,
): Promise<any> {
  const token = await getAccessToken();
  const base = getBaseUrl();
  const companyId = process.env.LOGGI_COMPANY_ID;
  const url = `${base}/v1/companies/${companyId}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Loggi] ${method} ${path} failed:`, res.status, text);
    throw new Error(`Loggi API error: ${res.status} - ${text}`);
  }

  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export async function getLoggiQuote(params: {
  originZip: string;
  destinationZip: string;
  packages: Array<{
    weight: number;
    height: number;
    width: number;
    length: number;
  }>;
}): Promise<LoggiQuoteOption[]> {
  if (!isConfigured()) return [];

  try {
    const body = {
      shipFrom: {
        postalCode: params.originZip.replace(/\D/g, ''),
      },
      shipTo: {
        postalCode: params.destinationZip.replace(/\D/g, ''),
      },
      packages: params.packages.map(pkg => ({
        weight: Math.max(0.1, pkg.weight),
        dimensions: {
          height: Math.max(1, Math.min(100, pkg.height)),
          width: Math.max(1, Math.min(100, pkg.width)),
          length: Math.max(1, Math.min(100, pkg.length)),
        },
      })),
    };

    const data = await loggiRequest('POST', '/quotations', body);

    if (!data || !Array.isArray(data)) {
      console.log('[Loggi] No quote options returned');
      return [];
    }

    const options: LoggiQuoteOption[] = data.map((q: any, i: number) => ({
      service: q.label || q.serviceName || `Loggi ${q.serviceType || ''}`.trim(),
      serviceCode: `loggi_${q.externalServiceId || q.serviceId || i}`,
      price: parseFloat(q.totalAmount || q.price || q.amount || '0'),
      deliveryTime: q.deliveryBusinessDays || q.estimatedDeliveryDays || q.sla || 5,
      loggiServiceId: q.externalServiceId || q.serviceId || undefined,
    }));

    return options
      .filter(o => o.price > 0)
      .sort((a, b) => a.price - b.price);
  } catch (error: any) {
    console.error('[Loggi] Quote error:', error.message);
    return [];
  }
}

export async function createLoggiShipment(params: {
  originName: string;
  originPhone: string;
  originZip: string;
  originAddress: string;
  originCity: string;
  originState: string;
  destinationName: string;
  destinationPhone: string;
  destinationZip: string;
  destinationAddress: string;
  destinationCity: string;
  destinationState: string;
  packages: Array<{
    weight: number;
    height: number;
    width: number;
    length: number;
    declaredValue?: number;
  }>;
  externalOrderId?: string;
}): Promise<LoggiShipmentResult> {
  const body = {
    shipFrom: {
      name: params.originName,
      phone: params.originPhone.replace(/\D/g, ''),
      postalCode: params.originZip.replace(/\D/g, ''),
      address: params.originAddress,
      city: params.originCity,
      state: params.originState,
      country: 'BR',
    },
    shipTo: {
      name: params.destinationName,
      phone: params.destinationPhone.replace(/\D/g, ''),
      postalCode: params.destinationZip.replace(/\D/g, ''),
      address: params.destinationAddress,
      city: params.destinationCity,
      state: params.destinationState || '',
      country: 'BR',
    },
    packages: params.packages.map(pkg => ({
      weight: Math.max(0.1, pkg.weight),
      dimensions: {
        height: Math.max(1, Math.min(100, pkg.height)),
        width: Math.max(1, Math.min(100, pkg.width)),
        length: Math.max(1, Math.min(100, pkg.length)),
      },
      declaredValue: pkg.declaredValue || 0,
    })),
    externalOrderId: params.externalOrderId,
  };

  const data = await loggiRequest('POST', '/async-shipments', body);

  return {
    loggiKey: data.loggiKey || data.loggi_key || data.id || '',
    trackingCode: data.trackingCode || data.tracking_code || data.loggiKey || '',
    status: data.status || 'created',
  };
}

export async function getLoggiLabel(loggiKeys: string[]): Promise<LoggiLabelResult> {
  const data = await loggiRequest('POST', '/labels', { loggiKeys });

  return {
    labelUrl: data.url || data.labelUrl || '',
    labelBase64: data.base64 || data.content || undefined,
  };
}

export async function getLoggiTracking(trackingCode: string): Promise<{
  status: string;
  statusCode: number;
  statusDescription: string;
  events: Array<{
    date: string;
    status: string;
    description: string;
    location?: string;
  }>;
}> {
  const token = await getAccessToken();
  const base = getBaseUrl();
  const companyId = process.env.LOGGI_COMPANY_ID;

  const res = await fetch(
    `${base}/v1/companies/${companyId}/packages/${trackingCode}/tracking`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Loggi tracking error: ${res.status} - ${text}`);
  }

  const data = await res.json();

  return {
    status: data.status || data.highLevelStatus || 'unknown',
    statusCode: data.statusCode || data.code || 0,
    statusDescription: data.statusDescription || data.description || '',
    events: (data.events || data.history || []).map((e: any) => ({
      date: e.date || e.timestamp || e.createdAt || '',
      status: e.status || e.highLevelStatus || '',
      description: e.description || e.message || '',
      location: e.location || e.city || undefined,
    })),
  };
}
