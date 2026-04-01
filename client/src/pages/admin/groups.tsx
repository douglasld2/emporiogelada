import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { useStore } from '@/lib/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUploader } from '@/components/ImageUploader';
import type { Group } from '@shared/schema';

export default function AdminGroups() {
  const { groups, addGroup, deleteGroup, updateGroup } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Group>>({
    name: '',
    description: '',
    image: '',
    displayOrder: 0,
    isActive: true,
  });

  const handleOpen = (group?: Group) => {
    if (group) {
      setEditingId(group.id);
      setFormData(group);
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        image: '',
        displayOrder: groups.length,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const data: any = { ...formData };

      if (editingId) {
        await updateGroup(editingId, data);
      } else {
        await addGroup(data as Omit<Group, 'id'>);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save group:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif">Grupos</h2>
          <p className="text-sm text-gray-500 mt-1">Categorias principais (ex: Vinhos, Tabacaria, Destilados)</p>
        </div>
        <Button
          onClick={() => handleOpen()}
          className="bg-black text-white hover:bg-gray-900 px-6 py-2 rounded-lg gap-2 transition-colors"
          data-testid="button-add-group"
        >
          <Plus className="w-4 h-4" /> Novo Grupo
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {groups.length === 0 && (
          <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
            <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum grupo cadastrado ainda.</p>
            <p className="text-xs mt-1">Crie grupos para organizar seus produtos (ex: Vinhos, Tabacaria).</p>
          </div>
        )}
        {groups.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map(group => (
          <div key={group.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex gap-4 items-center">
              {group.image && (
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={group.image} alt={group.name} className="w-full h-full object-cover" />
                </div>
              )}
              {!group.image && (
                <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: "rgba(201,169,110,0.15)" }}>
                  <Tag className="w-6 h-6" style={{ color: "#c9a96e" }} />
                </div>
              )}
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{group.name}</h3>
                      {!group.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inativo</span>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{group.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Ordem: {group.displayOrder}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpen(group)}
                      data-testid={`button-edit-group-${group.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteGroup(group.id)}
                      className="text-red-500 hover:text-red-700 hover:border-red-300"
                      data-testid={`button-delete-group-${group.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingId ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Nome do Grupo *</label>
              <Input
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Vinhos, Destilados, Tabacaria..."
                data-testid="input-group-name"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Descrição</label>
              <Textarea
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do grupo..."
                rows={2}
                data-testid="input-group-description"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Imagem do Grupo</label>
              <ImageUploader
                value={formData.image || ''}
                onChange={url => setFormData({ ...formData, image: url })}
                aspectRatio={16/9}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Ordem de Exibição</label>
              <Input
                type="number"
                value={formData.displayOrder ?? 0}
                onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                data-testid="input-group-order"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="group-active"
                checked={formData.isActive ?? true}
                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
                data-testid="checkbox-group-active"
              />
              <label htmlFor="group-active" className="text-sm text-gray-700">Grupo ativo</label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSubmit}
                className="flex-1 text-white"
                style={{ backgroundColor: "#1a1a2e" }}
                data-testid="button-save-group"
              >
                {editingId ? 'Salvar Alterações' : 'Criar Grupo'}
              </Button>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel-group">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
