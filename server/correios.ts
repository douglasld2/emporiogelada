export interface ShippingOption {
  service: string;
  serviceCode: string;
  price: number;
  deliveryTime: number;
  error?: string;
}

export interface ShippingCalculationParams {
  originZip: string;
  destinationZip: string;
  weight: number;
  height: number;
  width: number;
  length: number;
  declaredValue?: number;
}

const SERVICE_CODES = {
  SEDEX: '04014',
  PAC: '04510',
};

const REGIONS: Record<string, string[]> = {
  sudeste: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39'],
  sul: ['80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99'],
  nordeste: ['40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65'],
  norte: ['66', '67', '68', '69', '76', '77', '78'],
  centroOeste: ['70', '71', '72', '73', '74', '75', '79'],
};

function getRegion(cep: string): string {
  const prefix = cep.substring(0, 2);
  for (const [region, prefixes] of Object.entries(REGIONS)) {
    if (prefixes.includes(prefix)) {
      return region;
    }
  }
  return 'sudeste';
}

const PAC_BASE_PRICES: Record<string, Record<string, number>> = {
  sudeste: { sudeste: 18.50, sul: 25.00, nordeste: 35.00, norte: 45.00, centroOeste: 28.00 },
  sul: { sudeste: 25.00, sul: 18.50, nordeste: 42.00, norte: 55.00, centroOeste: 35.00 },
  nordeste: { sudeste: 35.00, sul: 42.00, nordeste: 18.50, norte: 38.00, centroOeste: 32.00 },
  norte: { sudeste: 45.00, sul: 55.00, nordeste: 38.00, norte: 22.00, centroOeste: 42.00 },
  centroOeste: { sudeste: 28.00, sul: 35.00, nordeste: 32.00, norte: 42.00, centroOeste: 18.50 },
};

const SEDEX_BASE_PRICES: Record<string, Record<string, number>> = {
  sudeste: { sudeste: 32.00, sul: 45.00, nordeste: 65.00, norte: 85.00, centroOeste: 52.00 },
  sul: { sudeste: 45.00, sul: 32.00, nordeste: 78.00, norte: 98.00, centroOeste: 62.00 },
  nordeste: { sudeste: 65.00, sul: 78.00, nordeste: 32.00, norte: 72.00, centroOeste: 58.00 },
  norte: { sudeste: 85.00, sul: 98.00, nordeste: 72.00, norte: 38.00, centroOeste: 78.00 },
  centroOeste: { sudeste: 52.00, sul: 62.00, nordeste: 58.00, norte: 78.00, centroOeste: 32.00 },
};

const PAC_DELIVERY_DAYS: Record<string, Record<string, number>> = {
  sudeste: { sudeste: 5, sul: 7, nordeste: 10, norte: 15, centroOeste: 8 },
  sul: { sudeste: 7, sul: 5, nordeste: 12, norte: 18, centroOeste: 10 },
  nordeste: { sudeste: 10, sul: 12, nordeste: 5, norte: 12, centroOeste: 9 },
  norte: { sudeste: 15, sul: 18, nordeste: 12, norte: 6, centroOeste: 14 },
  centroOeste: { sudeste: 8, sul: 10, nordeste: 9, norte: 14, centroOeste: 5 },
};

const SEDEX_DELIVERY_DAYS: Record<string, Record<string, number>> = {
  sudeste: { sudeste: 2, sul: 3, nordeste: 5, norte: 7, centroOeste: 3 },
  sul: { sudeste: 3, sul: 2, nordeste: 6, norte: 8, centroOeste: 4 },
  nordeste: { sudeste: 5, sul: 6, nordeste: 2, norte: 5, centroOeste: 4 },
  norte: { sudeste: 7, sul: 8, nordeste: 5, norte: 3, centroOeste: 6 },
  centroOeste: { sudeste: 3, sul: 4, nordeste: 4, norte: 6, centroOeste: 2 },
};

function calculatePriceByWeight(basePrice: number, weight: number): number {
  if (weight <= 0.3) return basePrice;
  if (weight <= 0.5) return basePrice * 1.1;
  if (weight <= 1) return basePrice * 1.25;
  if (weight <= 2) return basePrice * 1.5;
  if (weight <= 3) return basePrice * 1.75;
  if (weight <= 5) return basePrice * 2.0;
  if (weight <= 10) return basePrice * 2.5;
  if (weight <= 15) return basePrice * 3.0;
  if (weight <= 20) return basePrice * 3.5;
  return basePrice * 4.0;
}

function calculateVolumetricWeight(height: number, width: number, length: number): number {
  return (height * width * length) / 6000;
}

export async function calculateShipping(params: ShippingCalculationParams): Promise<ShippingOption[]> {
  const {
    originZip,
    destinationZip,
    weight,
    height,
    width,
    length,
  } = params;

  const cleanOriginZip = originZip.replace(/\D/g, '');
  const cleanDestinationZip = destinationZip.replace(/\D/g, '');

  if (cleanOriginZip.length !== 8 || cleanDestinationZip.length !== 8) {
    console.log('Invalid ZIP codes, using default shipping');
    return [
      { service: 'PAC', serviceCode: SERVICE_CODES.PAC, price: 25.00, deliveryTime: 8 },
      { service: 'SEDEX', serviceCode: SERVICE_CODES.SEDEX, price: 45.00, deliveryTime: 3 },
    ];
  }

  const originRegion = getRegion(cleanOriginZip);
  const destRegion = getRegion(cleanDestinationZip);

  console.log(`Calculating shipping: ${originRegion} -> ${destRegion}, weight: ${weight}kg`);

  const volumetricWeight = calculateVolumetricWeight(height, width, length);
  const billableWeight = Math.max(weight, volumetricWeight);

  const pacBasePrice = PAC_BASE_PRICES[originRegion]?.[destRegion] || 25.00;
  const sedexBasePrice = SEDEX_BASE_PRICES[originRegion]?.[destRegion] || 45.00;

  const pacPrice = Math.round(calculatePriceByWeight(pacBasePrice, billableWeight) * 100) / 100;
  const sedexPrice = Math.round(calculatePriceByWeight(sedexBasePrice, billableWeight) * 100) / 100;

  const pacDays = PAC_DELIVERY_DAYS[originRegion]?.[destRegion] || 8;
  const sedexDays = SEDEX_DELIVERY_DAYS[originRegion]?.[destRegion] || 3;

  const options: ShippingOption[] = [
    {
      service: 'PAC',
      serviceCode: SERVICE_CODES.PAC,
      price: pacPrice,
      deliveryTime: pacDays,
    },
    {
      service: 'SEDEX',
      serviceCode: SERVICE_CODES.SEDEX,
      price: sedexPrice,
      deliveryTime: sedexDays,
    },
  ];

  console.log('Shipping options calculated:', JSON.stringify(options));
  return options.sort((a, b) => a.price - b.price);
}

export function calculatePackageDimensions(products: Array<{ weight: number; height: number; width: number; length: number; quantity: number }>) {
  let totalWeight = 0;
  let maxHeight = 0;
  let maxWidth = 0;
  let totalLength = 0;
  
  for (const product of products) {
    totalWeight += product.weight * product.quantity;
    maxHeight = Math.max(maxHeight, product.height);
    maxWidth = Math.max(maxWidth, product.width);
    totalLength += product.length * product.quantity;
  }
  
  totalLength = Math.min(totalLength, 100);
  
  return {
    weight: Math.max(0.3, totalWeight),
    height: Math.max(2, maxHeight),
    width: Math.max(11, maxWidth),
    length: Math.max(16, totalLength),
  };
}
