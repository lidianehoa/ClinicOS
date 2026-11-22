import { useState } from 'react';
import { X, Save, Briefcase, Clock, DollarSign, Tag, AlignLeft } from 'lucide-react';
import { ClinicService } from '../../services/dataService';

interface ServiceModalProps {
  service?: ClinicService;
  categories: string[];
  onClose: () => void;
  onSave: (service: Partial<ClinicService>) => Promise<void>;
}

export default function ServiceModal({ service, categories, onClose, onSave }: ServiceModalProps) {
  const [name, setName] = useState(service?.name || '');
  const [category, setCategory] = useState(service?.category || (categories[0] || 'Consulta'));
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [duration, setDuration] = useState(service?.duration || 30);
  const [durationUnit, setDurationUnit] = useState<'min' | 'h'>(service?.durationUnit || 'min');
  const [price, setPrice] = useState<number | ''>(service?.price !== undefined ? service.price : 0);
  const [description, setDescription] = useState(service?.description || '');
  const [status, setStatus] = useState<'Active' | 'Inactive'>(service?.status || 'Active');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor, informe o nome do serviço.');
      return;
    }

    const finalCategory = isCustomCategory && customCategory.trim() ? customCategory.trim() : category;

    setSaving(true);
    try {
      await onSave({
        id: service?.id,
        name: name.trim(),
        category: finalCategory,
        duration: Number(duration) || 0,
        durationUnit,
        price: typeof price === 'number' ? price : 0,
        description: description.trim(),
        status,
        createdAt: service?.createdAt || new Date().toISOString()
      });
      onClose();
    } catch (err) {
      console.error('Error saving service:', err);
      alert('Erro ao salvar o serviço.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1E1B4B] border border-white/10 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500/20 text-teal-300 rounded-xl flex items-center justify-center border border-teal-500/30">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {service ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <p className="text-xs text-teal-200/70">
                {service ? 'Atualize as informações do serviço' : 'Cadastre um novo serviço no catálogo'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-white/50 hover:bg-white/10 hover:text-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nome do Serviço */}
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-teal-400" />
              Nome do Serviço *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Consulta Clínica Geral, Vacina V8, Ultrassonografia..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Categoria & Preço (Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Categoria */}
            <div>
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-teal-400" />
                Categoria
              </label>
              {!isCustomCategory ? (
                <div className="flex gap-2">
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsCustomCategory(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#1E1B4B] text-white">
                        {cat}
                      </option>
                    ))}
                    <option value="__NEW__" className="bg-[#1E1B4B] text-teal-300 font-bold">
                      + Outra Categoria...
                    </option>
                  </select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Digite a nova categoria..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(false)}
                    className="px-3 py-2 text-xs text-white/60 hover:text-white bg-white/10 rounded-xl"
                  >
                    Voltar
                  </button>
                </div>
              )}
            </div>

            {/* Preço de Venda */}
            <div>
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Preço de Venda (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold placeholder-white/30 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Duração & Status (Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Duração */}
            <div>
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Duração Estimada
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-teal-500"
                />
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value as 'min' | 'h')}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="min" className="bg-[#1E1B4B]">minutos</option>
                  <option value="h" className="bg-[#1E1B4B]">horas</option>
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                Status no Catálogo
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="Active" className="bg-[#1E1B4B]">Ativo (Disponível)</option>
                <option value="Inactive" className="bg-[#1E1B4B]">Inativo (Oculto)</option>
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-teal-400" />
              Descrição / Observações Internas
            </label>
            <textarea
              rows={3}
              placeholder="Descreva detalhes, orientações ou exigências deste serviço..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Serviço'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
