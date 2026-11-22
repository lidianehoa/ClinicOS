import { useState, useEffect } from 'react';
import { Search, Loader2, X, FileText, CheckCircle2 } from 'lucide-react';
import { 
  AppUser, 
  Customer, 
  searchCustomers, 
  subscribeConsultasPaciente,
  subscribeExames,
  addCasoClinico,
  Exame,
  ConsultaAtendimento,
  getActiveTenantId
} from '../../services/dataService';

interface Props {
  userProfile: AppUser | null;
  onCancel: () => void;
  onSuccess: (id: string) => void;
}

const LoadFromRecordModal = ({ onCancel, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<any | null>(null);

  // Data from selected patient
  const [consultas, setConsultas] = useState<ConsultaAtendimento[]>([]);
  const [exames, setExames] = useState<Exame[]>([]);
  
  const [selectedConsultaId, setSelectedConsultaId] = useState<string>('');
  const [selectedExamesIds, setSelectedExamesIds] = useState<string[]>([]);

  // Search logic
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setCustomers([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchCustomers(searchTerm);
        setCustomers(results.slice(0, 10));
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch Consultas and Exames when Animal is selected
  useEffect(() => {
    if (!selectedAnimal?.id) {
      setConsultas([]);
      setExames([]);
      setSelectedConsultaId('');
      setSelectedExamesIds([]);
      return;
    }

    let unsubConsultas: () => void;
    let unsubExames: () => void;

    unsubConsultas = subscribeConsultasPaciente(selectedAnimal.id, (list) => {
      // Sort by date desc
      list.sort((a, b) => new Date(b.criadoEm || '').getTime() - new Date(a.criadoEm || '').getTime());
      setConsultas(list);
      if (list.length > 0) {
        setSelectedConsultaId(list[0].id);
      }
    });

    unsubExames = subscribeExames(selectedAnimal.id, (list) => {
      // Sort by dateUpload desc
      list.sort((a, b) => new Date(b.dataUpload || '').getTime() - new Date(a.dataUpload || '').getTime());
      setExames(list);
    });

    return () => {
      if (unsubConsultas) unsubConsultas();
      if (unsubExames) unsubExames();
    };
  }, [selectedAnimal]);

  const toggleExame = (id: string) => {
    setSelectedExamesIds(prev => 
      prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    // Guard duplo: verifica customer E animal com id real
    if (!selectedCustomer || !selectedAnimal || !selectedAnimal.id || selectedAnimal.id.trim() === '') {
      alert('Selecione um paciente válido da lista de busca antes de continuar.');
      return;
    }
    
    setLoading(true);
    try {
      let sintomasPrincipais = '';
      let historicoClinico = '';

      if (selectedConsultaId) {
        const consulta = consultas.find(c => c.id === selectedConsultaId);
        if (consulta) {
          sintomasPrincipais = consulta.sintomasPrincipais || '';
          if (consulta.historicoClinico) {
            sintomasPrincipais += (sintomasPrincipais ? '\n\n' : '') + 'Histórico: ' + consulta.historicoClinico;
          }

          // Build historico from physical exam (only altered ones)
          const alterados = Object.entries(consulta.exameFisico || {})
            .filter(([_, v]: [string, any]) => v?.status === 'Alterado')
            .map(([k, v]: [string, any]) => `${k.toUpperCase()}: ${v.notes || 'Alterado'}`);
          
          if (alterados.length > 0) {
            historicoClinico = 'Achados do Exame Físico (Alterados):\n' + alterados.join('\n');
          } else {
            historicoClinico = 'Exame Físico sem alterações dignas de nota relatadas na consulta.';
          }
        }
      }

      const paciente = selectedAnimal;
      const sintomasSelecionados = sintomasPrincipais;

      const casoId = await addCasoClinico({
        pacienteId: paciente.id,
        sintomasPrincipais: sintomasSelecionados,
        historicoClinico: historicoClinico || 'Importado do prontuário via ClinicOS IA.',
        examesIds: selectedExamesIds,
        status: 'pendente',
        tenantId: getActiveTenantId(),
        isDomiciliar: consultas[0]?.isDomiciliar || false
      });

      onSuccess(casoId);
    } catch (err) {
      console.error(err);
      alert('Erro ao criar caso clínico a partir do prontuário.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-up">
        
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Carregar do Prontuário</h2>
            <p className="text-sm text-slate-500 mt-1">
              Selecione o paciente para importar a última consulta para a IA.
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1 space-y-8">
          
          {/* Patient Search */}
          {!selectedCustomer ? (
            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700">
                Buscar Paciente / Tutor
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Nome do tutor, paciente ou CPF..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-teal-500 text-slate-700 font-medium placeholder:font-normal"
                />
                {searching && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500 animate-spin" />
                )}
              </div>

              {customers.length > 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100 mt-2 max-h-60 overflow-y-auto">
                  {customers.map(c => (
                    <div key={c.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="font-bold text-slate-800">{c.nome}</div>
                      <div className="text-xs text-slate-500 mb-3">{c.telefone || 'Sem telefone'}</div>
                      <div className="flex gap-2 flex-wrap">
                        {c.animais && c.animais.length > 0 ? (
                          c.animais.map((a: any) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(c);
                                setSelectedAnimal(a);
                              }}
                              className="px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                            >
                              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                              {a.nome} ({a.especie}{a.raca ? ` • ${a.raca}` : ''})
                            </button>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">Nenhum paciente cadastrado para este tutor</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : !searching && searchTerm.trim().length >= 2 ? (
                <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 rounded-2xl border border-slate-100 mt-2">
                  Nenhum paciente ou tutor encontrado com "{searchTerm}".
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-6">
              
              <div className="bg-teal-50 border border-teal-100 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <div className="text-sm text-teal-600 font-bold mb-1">Paciente Selecionado</div>
                  <div className="text-lg font-bold text-teal-900">{selectedAnimal?.nome}</div>
                  <div className="text-sm text-teal-700">Tutor: {selectedCustomer.nome}</div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setSelectedAnimal(null);
                    setSearchTerm('');
                    setConsultas([]);
                    setExames([]);
                  }}
                  className="px-4 py-2 bg-white text-teal-600 rounded-xl text-sm font-bold hover:bg-teal-50 border border-teal-200"
                >
                  Alterar
                </button>
              </div>

              {consultas.length === 0 ? (
                <div className="p-6 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200 flex items-center gap-3">
                  <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-sm font-medium">Nenhuma consulta encontrada para este paciente. Um caso clínico vazio será criado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">
                    Origem dos Dados (Prontuário)
                  </label>
                  <select
                    value={selectedConsultaId}
                    onChange={(e) => setSelectedConsultaId(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700"
                  >
                    {consultas.map(c => (
                      <option key={c.id} value={c.id}>
                        Consulta de {new Date(c.criadoEm || '').toLocaleDateString('pt-BR')} {c.veterinarioNome ? `- Dr(a). ${c.veterinarioNome}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {exames.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">
                    Incluir Exames na Análise (Opcional)
                  </label>
                  <div className="grid gap-3">
                    {exames.map(ex => (
                      <div 
                        key={ex.id}
                        onClick={() => toggleExame(ex.id)}
                        className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${
                          selectedExamesIds.includes(ex.id) 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
                            : 'bg-white border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md flex flex-shrink-0 items-center justify-center border ${
                          selectedExamesIds.includes(ex.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                        }`}>
                          {selectedExamesIds.includes(ex.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{ex.tipo}</p>
                          <p className="text-xs opacity-70 mt-0.5">{new Date(ex.dataUpload).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading || !selectedCustomer || !selectedAnimal || !selectedAnimal.id || selectedAnimal.id.trim() === ''}
            title={(!selectedCustomer || !selectedAnimal || !selectedAnimal.id) ? 'Selecione um paciente da lista de busca primeiro' : undefined}
            className="px-8 py-2.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Criar Caso Clínico (IA)
          </button>
        </div>

      </div>
    </div>
  );
};

export default LoadFromRecordModal;
