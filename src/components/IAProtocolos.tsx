import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Bot, Search } from 'lucide-react';
import { subscribeProtocolos, saveProtocolo, type ProtocoloClinico } from '../services/dataService';
import { PROTOCOLOS_SEED } from '../data/protocolos_seed';
export const IAProtocolos = ({ userProfile }: { userProfile: any }) => {
  const [protocolos, setProtocolos] = useState<ProtocoloClinico[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ProtocoloClinico | null>(null);
  const [search, setSearch] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const unsub = subscribeProtocolos(setProtocolos);
    return () => unsub();
  }, []);

  const handleImport = async () => {
    if (!window.confirm('Deseja importar os 35 protocolos iniciais? Isso adicionará novos protocolos à sua base.')) return;
    setIsImporting(true);
    try {
      for (const proto of PROTOCOLOS_SEED) {
        await saveProtocolo({
          ...proto,
          criadoPor: userProfile?.nome || 'Importação Automática',
          criadoEm: new Date().toISOString()
        });
      }
      alert('Protocolos importados com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao importar protocolos.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    
    // Process tags (comma separated)
    let tagsArray = editingDoc.tags;
    if (typeof editingDoc.tags === 'string') {
      tagsArray = (editingDoc.tags as string).split(',').map(t => t.trim()).filter(t => t);
    }
    
    const docToSave = {
      ...editingDoc,
      tags: tagsArray,
      versao: editingDoc.versao + 1,
      criadoEm: editingDoc.criadoEm || new Date().toISOString(),
      criadoPor: editingDoc.criadoPor || userProfile?.nome || 'Admin'
    };

    await saveProtocolo(docToSave);
    setShowModal(false);
    setEditingDoc(null);
  };

  const handleAddNew = () => {
    setEditingDoc({
      id: crypto.randomUUID(),
      titulo: '',
      tags: [],
      conteudo: '',
      ativo: true,
      criadoPor: userProfile?.nome || 'Admin',
      criadoEm: new Date().toISOString(),
      versao: 0
    });
    setShowModal(true);
  };

  const filtered = protocolos.filter(p => 
    p.titulo.toLowerCase().includes(search.toLowerCase()) || 
    p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">IA e Protocolos Clínicos</h2>
          <p className="text-slate-500 mt-1">Gerencie a base de conhecimento (protocolos) utilizada pela inteligência artificial.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleImport}
            disabled={isImporting}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 shadow-sm transition-all text-sm disabled:opacity-50"
          >
            {isImporting ? 'Importando...' : 'Importar Protocolos Iniciais'}
          </button>
          <button 
            onClick={handleAddNew}
            className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 shadow-sm transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Protocolo
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por título ou tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <div className="border border-slate-100 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Título do Protocolo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Tags</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-700">{item.titulo}</p>
                    <p className="text-[11px] text-slate-500">Criado por {item.criadoPor}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium uppercase tracking-wider">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${item.ativo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { setEditingDoc(item); setShowModal(true); }} className="p-2 text-slate-400 hover:text-teal-500 hover:bg-teal-50 rounded-lg transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">Nenhum protocolo encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && editingDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-500">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {editingDoc.titulo ? 'Editar Protocolo' : 'Novo Protocolo'}
                  </h3>
                  <p className="text-xs text-slate-500">Essas diretrizes orientarão a Inteligência Artificial nas análises.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Título do Protocolo *</label>
                <input 
                  type="text" 
                  required 
                  value={editingDoc.titulo} 
                  onChange={e => setEditingDoc({...editingDoc, titulo: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-teal-500/20 outline-none" 
                  placeholder="Ex: Tratamento de Leishmaniose Visceral Canina" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tags (separadas por vírgula) *</label>
                <input 
                  type="text" 
                  required 
                  value={typeof editingDoc.tags === 'string' ? editingDoc.tags : editingDoc.tags.join(', ')} 
                  onChange={e => setEditingDoc({...editingDoc, tags: e.target.value as any})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-teal-500/20 outline-none" 
                  placeholder="Ex: cão, leishmaniose, infectologia" 
                />
                <p className="text-[10px] text-slate-400">As tags ajudam a IA a encontrar este protocolo no momento da análise.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Conteúdo do Protocolo *</label>
                <textarea 
                  required 
                  value={editingDoc.conteudo} 
                  onChange={e => setEditingDoc({...editingDoc, conteudo: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm h-64 focus:ring-2 focus:ring-teal-500/20 outline-none resize-none font-mono text-[13px]" 
                  placeholder="Cole aqui o texto do protocolo. Pode usar marcação Markdown..." 
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="ativoCheckbox"
                  checked={editingDoc.ativo} 
                  onChange={e => setEditingDoc({...editingDoc, ativo: e.target.checked})} 
                  className="w-4 h-4 text-teal-500 rounded border-slate-300 focus:ring-teal-500"
                />
                <label htmlFor="ativoCheckbox" className="text-sm font-bold text-slate-700 cursor-pointer">Protocolo Ativo</label>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleSave} className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-sm shadow-teal-500/20 flex items-center gap-2 transition-all">
                <Save className="w-4 h-4" /> Salvar Protocolo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
