import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Save, X, Loader2 } from 'lucide-react';
import { 
  subscribeCatalogoExames, 
  saveCatalogoExame, 
  deleteCatalogoExame, 
  type CatalogoExame, 
  type AppUser 
} from '../services/dataService';

interface CatalogoExamesAdminProps {
  userProfile?: AppUser | null;
}

export function CatalogoExamesAdmin({}: CatalogoExamesAdminProps) {
  const [exames, setExames] = useState<CatalogoExame[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExame, setEditingExame] = useState<Partial<CatalogoExame> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeCatalogoExames((data) => {
      setExames(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleOpenModal = (exame?: CatalogoExame) => {
    if (exame) {
      setEditingExame(exame);
    } else {
      setEditingExame({
        nome: '',
        categoria: 'Bioquímica', // default
        tipoAmostra: '',
        preparo: '',
        laboratorioReferencia: '',
        ativo: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingExame(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExame?.nome) return;
    
    setIsSaving(true);
    try {
      await saveCatalogoExame(editingExame);
      handleCloseModal();
    } catch (err) {
      console.error('Erro ao salvar exame:', err);
      alert('Erro ao salvar exame.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este exame?')) {
      try {
        await deleteCatalogoExame(id);
      } catch (err) {
        console.error('Erro ao excluir exame:', err);
        alert('Erro ao excluir exame.');
      }
    }
  };

  const filteredExames = exames.filter(e => 
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Catálogo de Exames</h2>
          <p className="text-sm text-slate-500">Gerencie os exames laboratoriais disponíveis para requisição</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Novo Exame
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredExames.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nenhum exame encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Exame</th>
                  <th className="px-6 py-3">Categoria</th>
                  <th className="px-6 py-3">Amostra</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExames.map((exame) => (
                  <tr key={exame.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{exame.nome}</p>
                      {exame.laboratorioReferencia && (
                        <p className="text-xs text-slate-400">{exame.laboratorioReferencia}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {exame.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4">{exame.tipoAmostra || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(exame)}
                          className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exame.id!)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">
                {editingExame?.id ? 'Editar Exame' : 'Novo Exame'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Exame *</label>
                <input
                  type="text"
                  required
                  value={editingExame?.nome || ''}
                  onChange={(e) => setEditingExame({ ...editingExame, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="Ex: Hemograma Completo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoria *</label>
                  <input
                    type="text"
                    required
                    value={editingExame?.categoria || ''}
                    onChange={(e) => setEditingExame({ ...editingExame, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    placeholder="Ex: Hematologia"
                    list="categorias-list"
                  />
                  <datalist id="categorias-list">
                    <option value="Bioquímica" />
                    <option value="Hematologia" />
                    <option value="Urinálise e Fezes" />
                    <option value="Imunologia e Sorologia" />
                    <option value="Microbiologia" />
                    <option value="Hormônios" />
                    <option value="Citologia e Histopatologia" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Amostra</label>
                  <input
                    type="text"
                    value={editingExame?.tipoAmostra || ''}
                    onChange={(e) => setEditingExame({ ...editingExame, tipoAmostra: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    placeholder="Ex: Sangue total (EDTA)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preparo/Instruções</label>
                <textarea
                  value={editingExame?.preparo || ''}
                  onChange={(e) => setEditingExame({ ...editingExame, preparo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none h-20"
                  placeholder="Ex: Jejum de 8 horas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Laboratório de Referência</label>
                <input
                  type="text"
                  value={editingExame?.laboratorioReferencia || ''}
                  onChange={(e) => setEditingExame({ ...editingExame, laboratorioReferencia: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="Ex: IDEXX"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Exame
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
