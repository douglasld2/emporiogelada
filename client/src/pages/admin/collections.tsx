import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { useStore } from '@/lib/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUploader } from '@/components/ImageUploader';
import type { Collection } from '@shared/schema';

export default function AdminCollections() {
  const { collections, groups, addCollection, deleteCollection, updateCollection } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string>('all');
  
  const [formData, setFormData] = useState<Partial<Collection>>({
    title: '',
    description: '',
    image: '',
    theme: 'light',
    featured: false,
    isNewArrival: false,
    isSelection: false,
    displayOrder: 0,
    groupId: null,
  });

  const handleOpen = (collection?: Collection) => {
    if (collection) {
      setEditingId(collection.id);
      setFormData(collection);
    } else {
      setEditingId(null);
      setFormData({ 
        title: '', 
        description: '', 
        image: '', 
        theme: 'light',
        featured: false,
        isNewArrival: false,
        isSelection: false,
        displayOrder: 0,
        groupId: groups[0]?.id || null,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const data: any = { ...formData };

      if (editingId) {
        await updateCollection(editingId, data);
      } else {
        await addCollection(data as Omit<Collection, 'id'>);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save collection:', error);
    }
  };

  const filteredCollections = filterGroup === 'all'
    ? collections
    : filterGroup === 'none'
    ? collections.filter(c => !c.groupId)
    : collections.filter(c => c.groupId === filterGroup);

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return null;
    return groups.find(g => g.id === groupId)?.name;
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif">Subgrupos</h2>
          <p className="text-sm text-gray-500 mt-1">Categorias dentro dos grupos (ex: Vinhos Tintos, Charutos)</p>
        </div>
        <Button onClick={() => handleOpen()} className="bg-black text-white hover:bg-gray-900 px-6 py-2 rounded-lg gap-2 transition-colors" data-testid="button-add-collection">
          <Plus className="w-4 h-4" /> Novo Subgrupo
        </Button>
      </div>

      {/* Filter by group */}
      {groups.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilterGroup('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterGroup === 'all' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={filterGroup === 'all' ? { backgroundColor: "#1a1a2e" } : {}}
          >
            Todos ({collections.length})
          </button>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setFilterGroup(g.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterGroup === g.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={filterGroup === g.id ? { backgroundColor: "#1a1a2e" } : {}}
            >
              {g.name} ({collections.filter(c => c.groupId === g.id).length})
            </button>
          ))}
          <button
            onClick={() => setFilterGroup('none')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterGroup === 'none' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={filterGroup === 'none' ? { backgroundColor: "#1a1a2e" } : {}}
          >
            Sem grupo ({collections.filter(c => !c.groupId).length})
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredCollections.length === 0 && (
          <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum subgrupo encontrado.</p>
          </div>
        )}
        {filteredCollections.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map(collection => (
          <div key={collection.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                <img src={collection.image} alt={collection.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-medium">{collection.title}</h3>
                      {getGroupName(collection.groupId) && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(201,169,110,0.15)", color: "#8b6914" }}>
                          {getGroupName(collection.groupId)}
                        </span>
                      )}
                      {collection.featured && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Destaque</span>
                      )}
                      {collection.isNewArrival && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">Novidade</span>
                      )}
                      {(collection as any).isSelection && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Nossa Seleção</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{collection.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpen(collection)} data-testid={`button-edit-collection-${collection.id}`}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCollection(collection.id)}
                      className="text-red-500 hover:text-red-700 hover:border-red-300"
                      data-testid={`button-delete-collection-${collection.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span>Tema: {collection.theme}</span>
                  <span>Ordem: {collection.displayOrder}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingId ? 'Editar Subgrupo' : 'Novo Subgrupo'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Grupo (Categoria Pai)</label>
              <select
                value={formData.groupId || ''}
                onChange={e => setFormData({ ...formData, groupId: e.target.value || null })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400"
                data-testid="select-collection-group"
              >
                <option value="">Sem grupo</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Título do Subgrupo *</label>
              <Input
                value={formData.title || ''}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Vinhos Tintos, Charutos, Whisky..."
                data-testid="input-collection-title"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Descrição</label>
              <Textarea
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do subgrupo..."
                rows={2}
                data-testid="input-collection-description"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Imagem</label>
              <ImageUploader
                value={formData.image || ''}
                onChange={url => setFormData({ ...formData, image: url })}
                aspectRatio={16/9}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Tema</label>
                <select
                  value={formData.theme || 'light'}
                  onChange={e => setFormData({ ...formData, theme: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400"
                  data-testid="select-collection-theme"
                >
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Ordem</label>
                <Input
                  type="number"
                  value={formData.displayOrder ?? 0}
                  onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  data-testid="input-collection-order"
                />
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured || false}
                  onChange={e => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4"
                  data-testid="checkbox-collection-featured"
                />
                <span className="text-sm">Destaque</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isNewArrival || false}
                  onChange={e => setFormData({ ...formData, isNewArrival: e.target.checked })}
                  className="w-4 h-4"
                  data-testid="checkbox-collection-new-arrival"
                />
                <span className="text-sm">Novidade</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(formData as any).isSelection || false}
                  onChange={e => setFormData({ ...formData, isSelection: e.target.checked } as any)}
                  className="w-4 h-4"
                  data-testid="checkbox-collection-is-selection"
                />
                <span className="text-sm">Nossa Seleção</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSubmit}
                className="flex-1 text-white"
                style={{ backgroundColor: "#1a1a2e" }}
                data-testid="button-save-collection"
              >
                {editingId ? 'Salvar Alterações' : 'Criar Subgrupo'}
              </Button>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel-collection">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
