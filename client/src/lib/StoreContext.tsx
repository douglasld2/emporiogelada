import React, { createContext, useContext, ReactNode } from 'react';
import { 
  useGroups,
  useCollections, 
  useProducts, 
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useCreateCollection, 
  useUpdateCollection, 
  useDeleteCollection,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useKits,
  useCreateKit,
  useUpdateKit,
  useDeleteKit,
  useActivePromotions,
} from './api';
import type { Collection, Product, Group, Kit } from '@shared/schema';
import type { EnrichedProduct } from '@/components/ProductCard';

interface StoreContextType {
  groups: Group[];
  collections: Collection[];
  products: EnrichedProduct[];
  kits: Kit[];
  activePromotions: any[];
  isLoadingGroups: boolean;
  isLoadingCollections: boolean;
  isLoadingProducts: boolean;
  isLoadingKits: boolean;
  addGroup: (group: Omit<Group, 'id'>) => Promise<void>;
  updateGroup: (id: string, group: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  addCollection: (collection: Omit<Collection, 'id'>) => Promise<void>;
  updateCollection: (id: string, collection: Partial<Collection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addKit: (kit: any) => Promise<void>;
  updateKit: (id: string, kit: any) => Promise<void>;
  deleteKit: (id: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { data: groups = [], isLoading: isLoadingGroups } = useGroups();
  const { data: collections = [], isLoading: isLoadingCollections } = useCollections();
  const { data: products = [], isLoading: isLoadingProducts } = useProducts();
  const { data: kits = [], isLoading: isLoadingKits } = useKits();
  const { data: activePromotions = [] } = useActivePromotions();
  
  const createGroupMutation = useCreateGroup();
  const updateGroupMutation = useUpdateGroup();
  const deleteGroupMutation = useDeleteGroup();
  const createCollectionMutation = useCreateCollection();
  const updateCollectionMutation = useUpdateCollection();
  const deleteCollectionMutation = useDeleteCollection();
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  const createKitMutation = useCreateKit();
  const updateKitMutation = useUpdateKit();
  const deleteKitMutation = useDeleteKit();

  const addGroup = async (group: Omit<Group, 'id'>) => {
    try {
      await createGroupMutation.mutateAsync(group);
    } catch (error) {
      console.error('Failed to add group:', error);
      throw error;
    }
  };

  const updateGroup = async (id: string, group: Partial<Group>) => {
    try {
      await updateGroupMutation.mutateAsync({ id, data: group });
    } catch (error) {
      console.error('Failed to update group:', error);
      throw error;
    }
  };

  const deleteGroup = async (id: string) => {
    try {
      await deleteGroupMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete group:', error);
      throw error;
    }
  };

  const addCollection = async (collection: Omit<Collection, 'id'>) => {
    try {
      await createCollectionMutation.mutateAsync(collection);
    } catch (error) {
      console.error('Failed to add collection:', error);
      throw error;
    }
  };

  const updateCollection = async (id: string, collection: Partial<Collection>) => {
    try {
      await updateCollectionMutation.mutateAsync({ id, data: collection });
    } catch (error) {
      console.error('Failed to update collection:', error);
      throw error;
    }
  };

  const deleteCollection = async (id: string) => {
    try {
      await deleteCollectionMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete collection:', error);
      throw error;
    }
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      await createProductMutation.mutateAsync(product);
    } catch (error) {
      console.error('Failed to add product:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, product: Partial<Product>) => {
    try {
      await updateProductMutation.mutateAsync({ id, data: product });
    } catch (error) {
      console.error('Failed to update product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteProductMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete product:', error);
      throw error;
    }
  };

  const addKit = async (kit: any) => {
    try {
      await createKitMutation.mutateAsync(kit);
    } catch (error) {
      console.error('Failed to add kit:', error);
      throw error;
    }
  };

  const updateKit = async (id: string, kit: any) => {
    try {
      await updateKitMutation.mutateAsync({ id, data: kit });
    } catch (error) {
      console.error('Failed to update kit:', error);
      throw error;
    }
  };

  const deleteKit = async (id: string) => {
    try {
      await deleteKitMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete kit:', error);
      throw error;
    }
  };

  return (
    <StoreContext.Provider value={{
      groups,
      collections,
      products,
      kits,
      activePromotions,
      isLoadingGroups,
      isLoadingCollections,
      isLoadingProducts,
      isLoadingKits,
      addGroup,
      updateGroup,
      deleteGroup,
      addCollection,
      updateCollection,
      deleteCollection,
      addProduct,
      updateProduct,
      deleteProduct,
      addKit,
      updateKit,
      deleteKit,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
