import { useState, useEffect } from 'react';
import { AccountLayout } from '@/components/AccountLayout';
import { MapPin, Plus, Trash2, Edit2, Star } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Address } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AddressFormData {
  label: string;
  firstName: string;
  lastName: string;
  address: string;
  apartment: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
}

const emptyForm: AddressFormData = {
  label: 'Casa',
  firstName: '',
  lastName: '',
  address: '',
  apartment: '',
  city: '',
  postalCode: '',
  country: 'Brasil',
  phone: '',
};

export default function AccountAddresses() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<AddressFormData>(emptyForm);

  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const res = await fetch('/api/addresses', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch addresses');
      return res.json();
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create address');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setIsAddDialogOpen(false);
      setFormData(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AddressFormData }) => {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update address');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setEditingAddress(null);
      setFormData(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete address');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/addresses/${id}/default`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to set default address');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return (
      <AccountLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-gray-500">Carregando...</div>
        </div>
      </AccountLayout>
    );
  }

  if (!user) {
    return null;
  }

  const handleSubmit = () => {
    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (address: Address) => {
    setFormData({
      label: address.label,
      firstName: address.firstName,
      lastName: address.lastName,
      address: address.address,
      apartment: address.apartment || '',
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone || '',
    });
    setEditingAddress(address);
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingAddress(null);
    setFormData(emptyForm);
  };

  const openAddDialog = () => {
    setFormData(emptyForm);
    setIsAddDialogOpen(true);
  };

  const isFormValid = formData.firstName && formData.lastName && formData.address && formData.city && formData.postalCode;

  return (
    <AccountLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-serif" data-testid="text-addresses-title">Endereços de Entrega</h1>
        <Button 
          onClick={openAddDialog}
          className="bg-black text-white hover:bg-gray-800 rounded-lg h-10 px-4"
          data-testid="button-add-address"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Endereço
        </Button>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setIsAddDialogOpen(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Adicionar Novo Endereço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="add-label" className="text-sm font-medium">Rótulo</Label>
              <Input
                id="add-label"
                placeholder="Ex: Casa, Trabalho, Escritório"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                className="mt-1.5 rounded-lg border-gray-300 h-11"
                data-testid="input-address-label"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-firstName" className="text-sm font-medium">Nome</Label>
                <Input
                  id="add-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="mt-1.5 rounded-lg border-gray-300 h-11"
                  data-testid="input-address-firstname"
                />
              </div>
              <div>
                <Label htmlFor="add-lastName" className="text-sm font-medium">Sobrenome</Label>
                <Input
                  id="add-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="mt-1.5 rounded-lg border-gray-300 h-11"
                  data-testid="input-address-lastname"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="add-address" className="text-sm font-medium">Endereço</Label>
              <Input
                id="add-address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="mt-1.5 rounded-lg border-gray-300 h-11"
                data-testid="input-address-street"
              />
            </div>
            <div>
              <Label htmlFor="add-apartment" className="text-sm font-medium">Complemento (opcional)</Label>
              <Input
                id="add-apartment"
                value={formData.apartment}
                onChange={(e) => setFormData(prev => ({ ...prev, apartment: e.target.value }))}
                className="mt-1.5 rounded-lg border-gray-300 h-11"
                data-testid="input-address-apartment"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-city" className="text-sm font-medium">Cidade</Label>
                <Input
                  id="add-city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="mt-1.5 rounded-lg border-gray-300 h-11"
                  data-testid="input-address-city"
                />
              </div>
              <div>
                <Label htmlFor="add-postalCode" className="text-sm font-medium">CEP</Label>
                <Input
                  id="add-postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                  className="mt-1.5 rounded-lg border-gray-300 h-11"
                  data-testid="input-address-postal"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="add-country" className="text-sm font-medium">País</Label>
              <Input
                id="add-country"
                value={formData.country}
                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                className="mt-1.5 rounded-lg border-gray-300 h-11"
                data-testid="input-address-country"
              />
            </div>
            <div>
              <Label htmlFor="add-phone" className="text-sm font-medium">Telefone (opcional)</Label>
              <Input
                id="add-phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1.5 rounded-lg border-gray-300 h-11"
                data-testid="input-address-phone"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={closeDialog}
                className="flex-1 rounded-lg h-11"
                data-testid="button-cancel-address"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || !isFormValid}
                className="flex-1 bg-black text-white hover:bg-gray-800 rounded-lg h-11"
                data-testid="button-save-address"
              >
                {createMutation.isPending ? 'Salvando...' : 'Salvar Endereço'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingAddress} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Editar Endereço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="edit-label" className="text-sm font-medium">Rótulo</Label>
              <Input
                id="edit-label"
                placeholder="Ex: Casa, Trabalho, Escritório"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                className="mt-1.5 rounded-lg border-gray-300 h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-firstName" className="text-sm font-medium">Nome</Label>
                <Input
                  id="edit-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="mt-1.5 rounded-lg border-gray-300 h-11"
                />
              </div>
              <div>
                <Label htmlFor="edit-lastName" className="text-sm font-medium">Sobrenome</Label>
                <Input
                  id="edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="mt-1.5 rounded-lg border-gray-300 h-11"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-address" className="text-sm font-medium">Endereço</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="mt-1.5 rounded-lg border-gray-300 h-11"
              />
            </div>
            <div>
              <Label htmlFor="edit-apartment" className="text-sm font-medium">Complemento (opcional)</Label>
              <Input
                id="edit-apartment"
                value={formData.apartment}
                onChange={(e) => setFormData(prev => ({ ...prev, apartment: e.target.value }))}
                className="mt-1.5 rounded-lg border-gray-300 h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-city" className="text-sm font-medium">Cidade</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="mt-1.5 rounded-lg border-gray-300 h-11"
                />
              </div>
              <div>
                <Label htmlFor="edit-postalCode" className="text-sm font-medium">CEP</Label>
                <Input
                  id="edit-postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                  className="mt-1.5 rounded-lg border-gray-300 h-11"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-country" className="text-sm font-medium">País</Label>
              <Input
                id="edit-country"
                value={formData.country}
                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                className="mt-1.5 rounded-lg border-gray-300 h-11"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone" className="text-sm font-medium">Telefone (opcional)</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1.5 rounded-lg border-gray-300 h-11"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={closeDialog}
                className="flex-1 rounded-lg h-11"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={updateMutation.isPending || !isFormValid}
                className="flex-1 bg-black text-white hover:bg-gray-800 rounded-lg h-11"
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar Endereço'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Carregando endereços...</div>
      ) : addresses.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-12 text-center">
          <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-serif mb-2">Nenhum endereço cadastrado</h2>
          <p className="text-gray-500 mb-6">Adicione um endereço de entrega para agilizar suas compras</p>
          <Button 
            onClick={openAddDialog}
            className="bg-black text-white hover:bg-gray-800 rounded-lg h-10 px-6"
            data-testid="button-add-first-address"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Primeiro Endereço
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {addresses.map((address) => (
            <div 
              key={address.id} 
              className={`bg-white border rounded-lg shadow-sm p-6 ${address.isDefault ? 'border-black' : 'border-gray-100'}`}
              data-testid={`address-card-${address.id}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{address.firstName} {address.lastName}</h3>
                    {address.isDefault && (
                      <span className="text-xs bg-black text-white px-2 py-0.5 rounded flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Padrão
                      </span>
                    )}
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{address.label}</span>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {address.address}
                    {address.apartment && `, ${address.apartment}`}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {address.city}, {address.postalCode}
                  </p>
                  <p className="text-gray-600 text-sm">{address.country}</p>
                  {address.phone && (
                    <p className="text-gray-500 text-sm mt-1">{address.phone}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!address.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefaultMutation.mutate(address.id)}
                      disabled={setDefaultMutation.isPending}
                      className="text-xs text-gray-500 hover:text-black"
                      data-testid={`button-set-default-${address.id}`}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      Definir Padrão
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(address)}
                    className="text-gray-500 hover:text-black"
                    data-testid={`button-edit-${address.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(address.id)}
                    disabled={deleteMutation.isPending}
                    className="text-gray-500 hover:text-red-600"
                    data-testid={`button-delete-${address.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountLayout>
  );
}
