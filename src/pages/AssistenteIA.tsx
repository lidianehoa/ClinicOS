import { useState, useEffect, useMemo } from 'react';

import { 
  Sparkles, 
  Clock, 
  Activity, 
  CheckCircle, 
  FileText, 
  Plus,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { 
  subscribeAllCasos, 
  subscribeCustomers, 
  subscribeAllAnalises,
  subscribePacientes,
  subscribeResponsaveis,
  type AppUser,
  type CasoClinico,
  type Customer,
  type AnaliseClinica,
  type Paciente,
  type Responsavel
} from '../services/dataService';
import LoadFromRecordModal from '../components/medical/LoadFromRecordModal';


const AssistenteIA = ({ userProfile }: { userProfile: AppUser | null }) => {
  const isPt = navigator.language.startsWith('pt');
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

  const [casos, setCasos] = useState<CasoClinico[]>([]);
  // Legacy customers (ainda usados por dados antigos)
  const [customers, setCustomers] = useState<Customer[]>([]);
  // Novo modelo: pacientes + responsaveis
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [analises, setAnalises] = useState<AnaliseClinica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubs = [] as (() => void)[];
    
    unsubs.push(subscribeAllCasos(setCasos));
    unsubs.push(subscribeCustomers(setCustomers));       // legacy
    unsubs.push(subscribePacientes(setPacientes));       // novo modelo
    unsubs.push(subscribeResponsaveis(setResponsaveis)); // novo modelo
    unsubs.push(subscribeAllAnalises(setAnalises));

    const tId = setTimeout(() => setLoading(false), 800);

    return () => {
      unsubs.forEach(u => u());
      clearTimeout(tId);
    };
  }, []);

  const { total, pendentes, analisando, analisados } = useMemo(() => {
    return {
      total: casos.length,
      pendentes: casos.filter(c => c.status === 'pendente').length,
      analisando: casos.filter(c => c.status === 'analisando').length,
      analisados: casos.filter(c => c.status === 'analisado').length,
    };
  }, [casos]);

  const recentCasos = useMemo(() => {
    // Mapa rápido: pacienteId → { paciente, tutor }
    // Prioridade: novo modelo (pacientes+responsaveis) > legacy (customers.animais)
    const pacienteMap = new Map<string, { nome: string; especie: string; raca: string; tutorNome: string }>();

    // 1. Novo modelo
    responsaveis.forEach(resp => {
      const animaisDeste = pacientes.filter(p => p.tutorId === resp.id);
      animaisDeste.forEach(p => {
        pacienteMap.set(p.id, {
          nome: p.nome,
          especie: p.especie || '',
          raca: p.raca || '',
          tutorNome: resp.nomeCompleto || 'Tutor',
        });
      });
    });
    // Pacientes sem tutor correspondente (tutorId inválido/ausente)
    pacientes.forEach(p => {
      if (!pacienteMap.has(p.id)) {
        pacienteMap.set(p.id, {
          nome: p.nome,
          especie: p.especie || '',
          raca: p.raca || '',
          tutorNome: 'Tutor',
        });
      }
    });

    // 2. Legacy (customers com animais embutidos) — fallback
    customers.forEach(customer => {
      customer.animais?.forEach((a: any) => {
        if (a.id && !pacienteMap.has(a.id)) {
          pacienteMap.set(a.id, {
            nome: a.nome || '',
            especie: a.especie || '',
            raca: a.raca || '',
            tutorNome: customer.nome || 'Desconhecido',
          });
        }
      });
    });

    return casos.slice(0, 10).map(caso => {
      const resolved = pacienteMap.get(caso.pacienteId);

      // Find most recent analise for this caso
      const analise = analises
        .filter(a => a.casoId === caso.id)
        .sort((a, b) => b.numero - a.numero)[0];

      return {
        ...caso,
        patientName: resolved?.nome || 'Desconhecido',
        customerName: resolved?.tutorNome || 'Desconhecido',
        patientDetails: resolved ? `${resolved.especie} • ${resolved.raca}` : '',
        analiseResumo: analise ? (analise.interpretacaoClinica ? analise.interpretacaoClinica.substring(0, 100) + '...' : 'Análise estruturada.') : null
      };
    });
  }, [casos, customers, pacientes, responsaveis, analises]);

  const getStatusBadge = (status: CasoClinico['status']) => {
    switch (status) {
      case 'pendente':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-semibold border border-amber-200 shadow-sm">
            <Clock className="w-3.5 h-3.5" /> Aguardando IA
          </span>
        );
      case 'analisando':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-semibold border border-slate-200 shadow-sm">
            <Activity className="w-3.5 h-3.5 animate-pulse" /> Analisando
          </span>
        );
      case 'analisado':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-600 rounded-full text-xs font-semibold border border-teal-200 shadow-sm">
            <CheckCircle className="w-3.5 h-3.5" /> Concluído
          </span>
        );
      case 'erro':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-semibold border border-red-200 shadow-sm">
            <AlertCircle className="w-3.5 h-3.5" /> Erro
          </span>
        );
    }
  };

  const handleNewCase = () => {
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10 max-w-6xl mx-auto">
      
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {isPt ? `Olá, ${userProfile?.nome?.split(' ')[0] || 'Doutor(a)'}!` : `Hello, ${userProfile?.nome?.split(' ')[0] || 'Doctor'}!`}
          </h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-500" />
            {isPt ? 'Visão geral dos seus exames e análises clínicas.' : 'Overview of your exams and clinical analysis.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.location.href = '/?tab=configuracoes'}
            className="text-slate-500 hover:text-teal-600 font-semibold py-2.5 px-4 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            Gerenciar Protocolos
          </button>
          <button 
            onClick={() => setIsLoadModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2"
          >
            <FileText className="w-5 h-5" />
            {isPt ? 'Carregar do Prontuário' : 'Load from Record'}
          </button>
          <button 
            onClick={handleNewCase}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-teal-500/30 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {isPt ? 'Novo Caso' : 'New Case'}
          </button>
        </div>
      </header>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 text-slate-500 font-medium mb-4">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><FileText className="w-5 h-5" /></div>
            Total de Casos
          </div>
          <div className="text-3xl font-bold text-slate-800">{total}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 text-amber-600 font-medium mb-4">
            <div className="p-2 bg-amber-50 rounded-lg"><Clock className="w-5 h-5" /></div>
            Pendentes
          </div>
          <div className="text-3xl font-bold text-slate-800">{pendentes}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 text-slate-600 font-medium mb-4">
            <div className="p-2 bg-slate-50 rounded-lg"><Activity className="w-5 h-5" /></div>
            Analisando
          </div>
          <div className="text-3xl font-bold text-slate-800">{analisando}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <CheckCircle className="w-24 h-24 text-teal-500" />
          </div>
          <div className="flex items-center gap-3 text-teal-600 font-medium mb-4 relative z-10">
            <div className="p-2 bg-teal-50 rounded-lg"><FileCheck className="w-5 h-5" /></div>
            Analisados
          </div>
          <div className="text-3xl font-bold text-slate-800 relative z-10">{analisados}</div>
        </div>
      </div>

      {/* Lista de Casos Recentes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {isPt ? 'Casos Recentes' : 'Recent Cases'}
          </h2>
        </div>
        
        {recentCasos.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            Nenhum caso clínico submetido ainda.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentCasos.map((caso) => (
              <div key={caso.id} className="p-5 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/?tab=caso-clinico&id=${caso.id}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-lg uppercase shrink-0">
                      {caso.patientName.substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                        {caso.patientName}
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Tutor: {caso.customerName} • {caso.patientDetails}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:items-end gap-2">
                    {getStatusBadge(caso.status)}
                    <span className="text-xs text-slate-400">
                      {new Date(caso.criadoEm).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {caso.analiseResumo && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-2 text-sm text-slate-600 bg-slate-50/50 p-3 rounded-lg">
                    <Sparkles className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-700">Resumo da última análise: </span>
                      {caso.analiseResumo}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {isLoadModalOpen && (
        <LoadFromRecordModal
          userProfile={userProfile}
          onCancel={() => setIsLoadModalOpen(false)}
          onSuccess={(casoId) => {
            setIsLoadModalOpen(false);
            window.location.href = `/?tab=caso-clinico&id=${casoId}`;
          }}
        />
      )}
    </div>
  );
};

export default AssistenteIA;
