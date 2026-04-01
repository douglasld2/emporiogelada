import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Collection, Product, User, Order, CartItem, Group, Kit } from '@shared/schema';

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AddToCartData {
  productId: string;
  quantity: number;
}

interface CreateOrderData {
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: string;
  }[];
  shippingInfo: {
    shippingName: string;
    shippingEmail: string;
    shippingAddress: string;
    shippingCity: string;
    shippingZip: string;
    shippingCountry: string;
  };
  totalAmount: string;
}

export async function apiRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await apiRequest('/api/auth/me');
      } catch (error) {
        return null;
      }
    },
    retry: false,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: RegisterData) => 
      apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(['currentUser'], user);
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: LoginData) =>
      apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(['currentUser'], user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () =>
      apiRequest('/api/auth/logout', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.setQueryData(['currentUser'], null);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useGroups() {
  return useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => apiRequest('/api/groups'),
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Group, 'id'>) =>
      apiRequest('/api/groups', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Group> }) =>
      apiRequest(`/api/groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/api/groups/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useCollections() {
  return useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: () => apiRequest('/api/collections'),
  });
}

export function useCollection(id: string) {
  return useQuery<Collection>({
    queryKey: ['collections', id],
    queryFn: () => apiRequest(`/api/collections/${id}`),
    enabled: !!id,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<Collection, 'id'>) =>
      apiRequest('/api/collections', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Collection> }) =>
      apiRequest(`/api/collections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/api/collections/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useProducts(collectionId?: string) {
  return useQuery<Product[]>({
    queryKey: ['products', collectionId],
    queryFn: () => {
      const url = collectionId 
        ? `/api/products?collectionId=${collectionId}` 
        : '/api/products';
      return apiRequest(url);
    },
  });
}

export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ['products', id],
    queryFn: () => apiRequest(`/api/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<Product, 'id'>) =>
      apiRequest('/api/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) =>
      apiRequest(`/api/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/api/products/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useKits() {
  return useQuery<Kit[]>({
    queryKey: ['kits'],
    queryFn: () => apiRequest('/api/kits'),
  });
}

export function useKitsWithItems() {
  return useQuery<{ kit: Kit; items: any[] }[]>({
    queryKey: ['kits', 'with-items'],
    queryFn: () => apiRequest('/api/kits?withItems=true'),
  });
}

export function useActivePromotions() {
  return useQuery<any[]>({
    queryKey: ['promotions', 'active'],
    queryFn: () => apiRequest('/api/promotions/active'),
    staleTime: 60 * 1000,
  });
}

export function useKitWithItems(id: string) {
  return useQuery<{ kit: Kit; items: any[] }>({
    queryKey: ['kits', id],
    queryFn: () => apiRequest(`/api/kits/${id}`),
    enabled: !!id,
  });
}

export function useCreateKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) =>
      apiRequest('/api/kits', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kits'] }),
  });
}

export function useUpdateKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/kits/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kits'] }),
  });
}

export function useDeleteKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/api/kits/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kits'] }),
  });
}

export function useCart() {
  return useQuery<(CartItem & { product: Product })[]>({
    queryKey: ['cart'],
    queryFn: async () => {
      try {
        return await apiRequest('/api/cart');
      } catch (error) {
        return [];
      }
    },
    retry: false,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: AddToCartData) =>
      apiRequest('/api/cart', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) =>
      apiRequest(`/api/cart/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/api/cart/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () =>
      apiRequest('/api/cart', {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useOrders() {
  return useQuery<{ orders: Order[]; pendingPayments: any[] }>({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        return await apiRequest('/api/orders');
      } catch (error) {
        return { orders: [], pendingPayments: [] };
      }
    },
    retry: false,
  });
}

export function useOrderStats() {
  return useQuery<{ total: number; shipped: number; delivered: number }>({
    queryKey: ['orderStats'],
    queryFn: async () => {
      try {
        return await apiRequest('/api/orders/stats');
      } catch (error) {
        return { total: 0, shipped: 0, delivered: 0 };
      }
    },
    retry: false,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateOrderData) =>
      apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
