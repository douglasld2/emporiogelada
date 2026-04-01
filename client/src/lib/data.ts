import etherealDawn from '@assets/generated_images/high_fashion_model_in_ethereal_dawn_setting.png';
import urbanNoir from '@assets/generated_images/high_fashion_model_in_urban_noir_setting.png';
import velvetRenaissance from '@assets/generated_images/high_fashion_model_in_velvet_renaissance_setting.png';
import minimalistFuture from '@assets/generated_images/high_fashion_model_in_minimalist_future_setting.png';

export interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  collectionId: string;
  promotionPrice?: string | null;
  promoLabel?: string | null;
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  image: string;
  theme: string;
}

export const COLLECTIONS: Collection[] = [
  {
    id: 'ethereal-dawn',
    title: 'Ethereal Dawn',
    description: 'Soft light, flowing fabrics, and the promise of a new day.',
    image: etherealDawn,
    theme: 'light',
  },
  {
    id: 'urban-noir',
    title: 'Urban Noir',
    description: 'Shadows, leather, and the electric pulse of the city.',
    image: urbanNoir,
    theme: 'dark',
  },
  {
    id: 'velvet-renaissance',
    title: 'Velvet Renaissance',
    description: 'Rich textures and deep hues inspired by classical mastery.',
    image: velvetRenaissance,
    theme: 'dark',
  },
  {
    id: 'minimalist-future',
    title: 'Minimalist Future',
    description: 'Clean lines and architectural silhouettes for the modern era.',
    image: minimalistFuture,
    theme: 'light',
  },
];

export const PRODUCTS: Product[] = [
  // Ethereal Dawn
  { id: '1', name: 'Silk Morning Gown', price: '1250.00', image: etherealDawn, collectionId: 'ethereal-dawn' },
  { id: '2', name: 'Mist Layered Skirt', price: '890.00', image: etherealDawn, collectionId: 'ethereal-dawn' },
  { id: '3', name: 'Sunrise Blouse', price: '650.00', image: etherealDawn, collectionId: 'ethereal-dawn' },
  
  // Urban Noir
  { id: '4', name: 'Midnight Trench', price: '2400.00', image: urbanNoir, collectionId: 'urban-noir' },
  { id: '5', name: 'Neon Leather Pant', price: '1100.00', image: urbanNoir, collectionId: 'urban-noir' },
  { id: '6', name: 'Shadow Blazer', price: '1500.00', image: urbanNoir, collectionId: 'urban-noir' },

  // Velvet Renaissance
  { id: '7', name: 'Crimson Velvet Dress', price: '3200.00', image: velvetRenaissance, collectionId: 'velvet-renaissance' },
  { id: '8', name: 'Gold Thread Corset', price: '950.00', image: velvetRenaissance, collectionId: 'velvet-renaissance' },
  
  // Minimalist Future
  { id: '9', name: 'Structure White Coat', price: '1800.00', image: minimalistFuture, collectionId: 'minimalist-future' },
  { id: '10', name: 'Geometric Tunic', price: '700.00', image: minimalistFuture, collectionId: 'minimalist-future' },
];
