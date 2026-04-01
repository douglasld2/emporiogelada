import { db } from "./db";
import { collections, products } from "@shared/schema";

const collectionsData = [
  {
    id: 'ethereal-dawn',
    title: 'Ethereal Dawn',
    description: 'Soft light, flowing fabrics, and the promise of a new day.',
    image: '/attached_assets/generated_images/high_fashion_model_in_ethereal_dawn_setting.png',
    theme: 'light',
  },
  {
    id: 'urban-noir',
    title: 'Urban Noir',
    description: 'Shadows, leather, and the electric pulse of the city.',
    image: '/attached_assets/generated_images/high_fashion_model_in_urban_noir_setting.png',
    theme: 'dark',
  },
  {
    id: 'velvet-renaissance',
    title: 'Velvet Renaissance',
    description: 'Rich textures and deep hues inspired by classical mastery.',
    image: '/attached_assets/generated_images/high_fashion_model_in_velvet_renaissance_setting.png',
    theme: 'dark',
  },
  {
    id: 'minimalist-future',
    title: 'Minimalist Future',
    description: 'Clean lines and architectural silhouettes for the modern era.',
    image: '/attached_assets/generated_images/high_fashion_model_in_minimalist_future_setting.png',
    theme: 'light',
  },
];

const productsData = [
  { id: '1', name: 'Silk Morning Gown', price: '1250.00', image: '/attached_assets/generated_images/high_fashion_model_in_ethereal_dawn_setting.png', collectionId: 'ethereal-dawn', description: 'Luxurious silk gown with flowing design' },
  { id: '2', name: 'Mist Layered Skirt', price: '890.00', image: '/attached_assets/generated_images/high_fashion_model_in_ethereal_dawn_setting.png', collectionId: 'ethereal-dawn', description: 'Layered design with ethereal quality' },
  { id: '3', name: 'Sunrise Blouse', price: '650.00', image: '/attached_assets/generated_images/high_fashion_model_in_ethereal_dawn_setting.png', collectionId: 'ethereal-dawn', description: 'Light and airy blouse' },
  
  { id: '4', name: 'Midnight Trench', price: '2400.00', image: '/attached_assets/generated_images/high_fashion_model_in_urban_noir_setting.png', collectionId: 'urban-noir', description: 'Classic trench with modern edge' },
  { id: '5', name: 'Neon Leather Pant', price: '1100.00', image: '/attached_assets/generated_images/high_fashion_model_in_urban_noir_setting.png', collectionId: 'urban-noir', description: 'Bold leather pants' },
  { id: '6', name: 'Shadow Blazer', price: '1500.00', image: '/attached_assets/generated_images/high_fashion_model_in_urban_noir_setting.png', collectionId: 'urban-noir', description: 'Structured blazer with sharp lines' },

  { id: '7', name: 'Crimson Velvet Dress', price: '3200.00', image: '/attached_assets/generated_images/high_fashion_model_in_velvet_renaissance_setting.png', collectionId: 'velvet-renaissance', description: 'Rich velvet evening dress' },
  { id: '8', name: 'Gold Thread Corset', price: '950.00', image: '/attached_assets/generated_images/high_fashion_model_in_velvet_renaissance_setting.png', collectionId: 'velvet-renaissance', description: 'Ornate corset with gold threading' },
  
  { id: '9', name: 'Structure White Coat', price: '1800.00', image: '/attached_assets/generated_images/high_fashion_model_in_minimalist_future_setting.png', collectionId: 'minimalist-future', description: 'Architectural white coat' },
  { id: '10', name: 'Geometric Tunic', price: '700.00', image: '/attached_assets/generated_images/high_fashion_model_in_minimalist_future_setting.png', collectionId: 'minimalist-future', description: 'Minimalist geometric design' },
];

async function seed() {
  console.log("Seeding database...");
  
  try {
    const existingCollections = await db.select().from(collections);
    
    if (existingCollections.length === 0) {
      console.log("Adding collections...");
      await db.insert(collections).values(collectionsData);
      console.log("Collections added.");
      
      console.log("Adding products...");
      await db.insert(products).values(productsData);
      console.log("Products added.");
      
      console.log("Database seeded successfully!");
    } else {
      console.log("Database already seeded. Skipping.");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

seed().catch(console.error);
