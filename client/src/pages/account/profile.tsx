import { useState } from 'react';
import { AccountLayout } from '@/components/AccountLayout';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim().replace(/-$/, '');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim().replace(/-$/, '');
}

export default function AccountProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: user?.name ?? '',
    phone: user?.phone ? formatPhone(user.phone) : '',
    personType: (user as any)?.personType ?? 'PF',
    cpf: (user as any)?.cpf ? formatCPF((user as any).cpf) : '',
    cnpj: (user as any)?.cnpj ? formatCNPJ((user as any).cnpj) : '',
    razaoSocial: (user as any)?.razaoSocial ?? '',
    inscricaoEstadual: (user as any)?.inscricaoEstadual ?? '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'cpf') { setForm(f => ({ ...f, cpf: formatCPF(value) })); return; }
    if (name === 'cnpj') { setForm(f => ({ ...f, cnpj: formatCNPJ(value) })); return; }
    if (name === 'phone') { setForm(f => ({ ...f, phone: formatPhone(value) })); return; }
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          personType: form.personType,
          cpf: form.personType === 'PF' ? form.cpf : '',
          cnpj: form.personType === 'PJ' ? form.cnpj : '',
          razaoSocial: form.personType === 'PJ' ? form.razaoSocial : '',
          inscricaoEstadual: form.personType === 'PJ' ? form.inscricaoEstadual : '',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar');
      }
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast({ title: 'Dados salvos', description: 'Suas informações fiscais foram atualizadas.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full border border-gray-200 rounded-sm px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white";
  const labelClass = "block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5";

  return (
    <AccountLayout>
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-serif font-bold text-gray-900">Meus Dados</h1>
          <p className="text-sm text-gray-500 mt-1">Informações pessoais e fiscais para emissão de nota fiscal.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="bg-white border border-gray-100 rounded-lg p-6 space-y-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-3">
              Informações Básicas
            </h2>

            <div>
              <label className={labelClass}>Nome completo</label>
              <input
                data-testid="input-name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Seu nome completo"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>E-mail</label>
                <input
                  type="email"
                  value={user?.email ?? ''}
                  disabled
                  className={`${inputClass} bg-gray-50 text-gray-400 cursor-not-allowed`}
                />
                <p className="text-[11px] text-gray-400 mt-1">E-mail não pode ser alterado</p>
              </div>
              <div>
                <label className={labelClass}>Telefone / WhatsApp</label>
                <input
                  data-testid="input-phone"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="(11) 99999-9999"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Fiscal info */}
          <div className="bg-white border border-gray-100 rounded-lg p-6 space-y-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-3">
              Dados Fiscais — Nota Fiscal
            </h2>

            {/* Person type selector */}
            <div>
              <label className={labelClass}>Tipo de pessoa</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  data-testid="button-person-pf"
                  onClick={() => setForm(f => ({ ...f, personType: 'PF' }))}
                  className={`flex-1 py-2.5 text-sm font-medium border rounded-sm transition-colors ${
                    form.personType === 'PF'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  Pessoa Física (CPF)
                </button>
                <button
                  type="button"
                  data-testid="button-person-pj"
                  onClick={() => setForm(f => ({ ...f, personType: 'PJ' }))}
                  className={`flex-1 py-2.5 text-sm font-medium border rounded-sm transition-colors ${
                    form.personType === 'PJ'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  Pessoa Jurídica (CNPJ)
                </button>
              </div>
            </div>

            {/* PF fields */}
            {form.personType === 'PF' && (
              <div>
                <label className={labelClass}>CPF</label>
                <input
                  data-testid="input-cpf"
                  type="text"
                  name="cpf"
                  value={form.cpf}
                  onChange={handleChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={inputClass}
                />
              </div>
            )}

            {/* PJ fields */}
            {form.personType === 'PJ' && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>CNPJ</label>
                  <input
                    data-testid="input-cnpj"
                    type="text"
                    name="cnpj"
                    value={form.cnpj}
                    onChange={handleChange}
                    placeholder="00.000.000/0001-00"
                    maxLength={18}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Razão Social</label>
                  <input
                    data-testid="input-razao-social"
                    type="text"
                    name="razaoSocial"
                    value={form.razaoSocial}
                    onChange={handleChange}
                    placeholder="Nome da empresa conforme CNPJ"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Inscrição Estadual <span className="text-gray-400 normal-case font-normal">(opcional)</span></label>
                  <input
                    data-testid="input-inscricao-estadual"
                    type="text"
                    name="inscricaoEstadual"
                    value={form.inscricaoEstadual}
                    onChange={handleChange}
                    placeholder="Ex: ISENTO ou número da IE"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Esses dados serão utilizados exclusivamente para emissão de nota fiscal das suas compras.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              data-testid="button-save-profile"
              type="submit"
              disabled={saving}
              className="bg-black text-white px-8 py-3 text-sm font-medium uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50 rounded-sm"
            >
              {saving ? 'Salvando...' : 'Salvar Dados'}
            </button>
          </div>
        </form>
      </div>
    </AccountLayout>
  );
}
