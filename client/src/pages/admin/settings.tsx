import { AdminLayout } from '@/components/AdminLayout';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Truck, Settings2 } from 'lucide-react';

interface StoreSetting {
  key: string;
  value: string;
  description: string | null;
}

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: settings, isLoading } = useQuery<StoreSetting[]>({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/settings', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  useEffect(() => {
    if (settings) {
      const threshold = settings.find(s => s.key === 'free_shipping_threshold');
      setFreeShippingThreshold(threshold?.value || '');
    }
  }, [settings]);

  const saveSetting = async (key: string, value: string, description?: string) => {
    const res = await fetch(`/api/admin/settings/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ value, description }),
    });
    if (!res.ok) throw new Error('Failed to save setting');
    return res.json();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await saveSetting(
        'free_shipping_threshold',
        freeShippingThreshold || '0',
        'Valor mínimo para frete grátis automático'
      );
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-serif mb-2">Configurações</h1>
        <p className="text-gray-600">Gerencie as configurações da sua loja</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-50 rounded-lg">
                <Truck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-medium">Configurações de Frete</h2>
                <p className="text-sm text-gray-500">Configure as opções de frete da sua loja</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <Label htmlFor="freeShippingThreshold" className="text-sm font-medium">
                  Valor mínimo para frete grátis
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  Compras acima deste valor terão frete grátis automaticamente. Deixe em branco ou 0 para desabilitar.
                </p>
                <div className="flex gap-4 items-center">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <Input
                      id="freeShippingThreshold"
                      type="number"
                      min="0"
                      step="0.01"
                      value={freeShippingThreshold}
                      onChange={(e) => setFreeShippingThreshold(e.target.value)}
                      className="pl-10 w-40"
                      placeholder="0,00"
                      data-testid="input-free-shipping-threshold"
                    />
                  </div>
                  {freeShippingThreshold && parseFloat(freeShippingThreshold) > 0 && (
                    <span className="text-sm text-gray-600">
                      Frete grátis para compras acima de {formatCurrency(freeShippingThreshold)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-black text-white hover:bg-gray-800"
              data-testid="button-save-settings"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Configurações
            </Button>
            {saveSuccess && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Settings2 className="w-4 h-4" />
                Configurações salvas com sucesso!
              </span>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
