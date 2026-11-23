import { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, Plus, Search, Filter, Edit, Trash2, Calculator, 
  Clock, DollarSign, Tag, CheckCircle2, XCircle
} from 'lucide-react';
import { 
  ClinicService, subscribeServices, saveService, deleteService 
} from '../../services/dataService';
import ServiceModal from './ServiceModal';

const DEFAULT_CATEGORIES = [
  'Consulta',
  'Vacina',
  'Exame / Diagnóstico',
  'Cirurgia',
  'Estética / Banho e Tosa',
  'Odontologia',
  'Internação / Procedimento',
  'Outros'
];

export default function Servicos() {
  const [services, setServices] = useState<ClinicService[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Modals state
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [selectedServiceForEdit, setSelectedServiceForEdit] = useState<ClinicService | undefined>(undefined);



  useEffect(() => {
    const unsubServices = subscribeServices((data) => {
      setServices(data);
      setLoading(false);
    });

    return () => {
      unsubServices();
    };
  }, []);

  // Compute categories dynamically
  const categoriesList = useMemo(() => {
    const fromServices = services.map(s => s.category).filter(Boolean);
    const combined = Array.from(new Set([...DEFAULT_CATEGORIES, ...fromServices]));
    return combined.sort();
  }, [services]);

  // Filtered Services List
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === 'All' || s.category === selectedCategory;
      const matchStatus = statusFilter === 'All' || s.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [services, searchTerm, selectedCategory, statusFilter]);

  // KPIs
  const totalActive = useMemo(() => services.filter(s => s.status === 'Active').length, [services]);
  const avgPrice = useMemo(() => {
    const active = services.filter(s => s.status === 'Active' && s.price > 0);
    if (!active.length) return 0;
    const sum = active.reduce((acc, s) => acc + s.price, 0);
    return sum / active.length;
  }, [services]);

  const avgDuration = useMemo(() => {
    const active = services.filter(s => s.status === 'Active');
    if (!active.length) return 0;
    const sumMinutes = active.reduce((acc, s) => {
      const mins = s.durationUnit === 'h' ? s.duration * 60 : s.duration;
      return acc + (mins || 0);
    }, 0);
    return Math.round(sumMinutes / active.length);
  }, [services]);

  // Handlers
  const handleSaveService = async (serviceData: Partial<ClinicService>) => {
    await saveService(serviceData as ClinicService);
    setIsServiceModalOpen(false);
    setSelectedServiceForEdit(undefined);
  };

  const handleDeleteService = async (id: string, name: string) => {
    if (confirm(`Deseja realmente inativar o serviço "${name}"?`)) {
      await deleteService(id);
    }
  };


  return (
    <div className="h-full bg-base overflow-y-auto">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500/30 to-emerald-500/30 rounded-2xl flex items-center justify-center text-teal-300 border border-teal-500/40 shadow-lg shadow-teal-900/40">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-2">
                  Cadastro de Serviços & Precificação
                </h1>
                <p className="text-sm text-teal-200/70">
                  Gerencie seu portfólio de atendimento, tempos, categorias e preços de venda.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="?tab=precificacao"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-teal-200 hover:text-white border border-white/10 rounded-xl text-sm font-semibold transition-all"
              title="Ficha técnica e preço sugerido de cada serviço"
            >
              <Calculator className="w-4 h-4 text-teal-400" />
              Precificar em Financeiro → Precificação
            </a>
            <button
              onClick={() => {
                setSelectedServiceForEdit(undefined);
                setIsServiceModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-teal-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Novo Serviço
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center text-teal-400 shrink-0">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-teal-200/60 tracking-wider">Total de Serviços</p>
              <p className="text-2xl font-bold text-white">{services.length}</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-teal-200/60 tracking-wider">Serviços Ativos</p>
              <p className="text-2xl font-bold text-white">{totalActive}</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-teal-200/60 tracking-wider">Preço Médio</p>
              <p className="text-2xl font-bold text-white">R$ {avgPrice.toFixed(2)}</p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-teal-200/60 tracking-wider">Duração Média</p>
              <p className="text-2xl font-bold text-white">{avgDuration} min</p>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Buscar por nome do serviço ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-white placeholder-white/40 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {/* Category Filter */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <Filter className="w-4 h-4 text-teal-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-white text-sm outline-none cursor-pointer"
              >
                <option value="All" className="bg-[#1E1B4B]">Todas as Categorias</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#1E1B4B]">{cat}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-white text-sm outline-none cursor-pointer"
              >
                <option value="All" className="bg-[#1E1B4B]">Todos os Status</option>
                <option value="Active" className="bg-[#1E1B4B]">Apenas Ativos</option>
                <option value="Inactive" className="bg-[#1E1B4B]">Apenas Inativos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table / List Container */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-teal-200/50 flex flex-col items-center gap-3">
              <Briefcase className="w-8 h-8 animate-pulse text-teal-400" />
              <span>Carregando serviços...</span>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="p-12 text-center text-white/50 space-y-3">
              <Briefcase className="w-12 h-12 mx-auto text-white/20" />
              <p className="text-base font-semibold text-white/70">Nenhum serviço encontrado</p>
              <p className="text-xs text-white/40 max-w-sm mx-auto">
                {searchTerm || selectedCategory !== 'All' 
                  ? 'Tente ajustar seus filtros de busca para encontrar o serviço.' 
                  : 'Comece adicionando os serviços oferecidos pela clínica ao catálogo.'}
              </p>
              {!searchTerm && selectedCategory === 'All' && (
                <button
                  onClick={() => setIsServiceModalOpen(true)}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Primeiro Serviço
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white/5 text-white/50 font-bold uppercase text-[10px] tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4">Serviço</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4 text-center">Duração</th>
                    <th className="px-6 py-4 text-right">Preço de Venda</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredServices.map((service) => {

                    return (
                      <tr key={service.id} className="hover:bg-white/5 transition-colors group">
                        {/* Nome & Descrição */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-300 border border-teal-500/20 flex items-center justify-center shrink-0 font-bold text-xs">
                              {service.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-white group-hover:text-teal-300 transition-colors">
                                {service.name}
                              </p>
                              {service.description && (
                                <p className="text-xs text-white/40 truncate max-w-xs">{service.description}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Categoria */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-teal-200">
                            <Tag className="w-3 h-3 text-teal-400" />
                            {service.category || 'Geral'}
                          </span>
                        </td>

                        {/* Duração */}
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 text-xs text-amber-300 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {service.duration} {service.durationUnit || 'min'}
                          </span>
                        </td>

                        {/* Preço de Venda */}
                        <td className="px-6 py-4 text-right font-bold text-white text-base">
                          R$ {service.price ? service.price.toFixed(2) : '0.00'}
                        </td>


                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          {service.status === 'Active' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 text-white/40 border border-white/10 text-xs font-semibold rounded-full">
                              <XCircle className="w-3 h-3" /> Inativo
                            </span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedServiceForEdit(service);
                                setIsServiceModalOpen(true);
                              }}
                              title="Editar Serviço"
                              className="p-2 text-teal-300 hover:bg-teal-500/20 rounded-xl transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteService(service.id, service.name)}
                              title="Inativar Serviço"
                              className="p-2 text-red-400 hover:bg-red-500/20 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Service Modal (New / Edit) */}
      {isServiceModalOpen && (
        <ServiceModal
          service={selectedServiceForEdit}
          categories={categoriesList}
          onClose={() => setIsServiceModalOpen(false)}
          onSave={handleSaveService}
        />
      )}

    </div>
  );
}
