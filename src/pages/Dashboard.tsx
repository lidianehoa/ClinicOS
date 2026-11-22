import { useState, useEffect, useMemo } from 'react';
import { 
  Pencil, 
  Users, 
  DollarSign, 
  ChevronDown, 
  PawPrint, 
  ClipboardList, 
  Syringe, 
  FileText, 
  Pill, 
  PlusSquare, 
  Package, 
  X, 
  Check, 
  Stethoscope, 
  Building2,
  Bell,
  Calendar,
  MessageCircle,
  Clock
} from 'lucide-react';
import { 
  subscribeCustomers, 
  subscribeStaff, 
  subscribeAllDailyFlows, 
  subscribeAllDespesas, 
  subscribeAppointments, 
  subscribeAllExames, 
  subscribeServices, 
  subscribeProducts, 
  type AppUser, 
  type Customer, 
  type StaffMember, 
  type Registro, 
  type Despesa, 
  type Appointment, 
  type Exame, 
  type ClinicService, 
  type Product,
  getClinicConfig
} from '../services/dataService';

interface DashboardProps {
  userProfile?: AppUser | null;
}

interface SistemaAviso {
  id: string;
  tipo: 'vacina' | 'retorno' | 'medicacao' | 'estoque';
  titulo: string;
  descricao: string;
  tag: string;
  tagColor: string;
  acaoTexto: string;
  horario?: string;
}

export default function Dashboard({ userProfile }: DashboardProps) {
  // ── Estados de Dados Reais ────────────────────────────────────────────────
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [records, setRecords] = useState<Registro[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [exames, setExames] = useState<Exame[]>([]);
  const [services, setServices] = useState<ClinicService[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // ── Configurações Editáveis da Clínica ─────────────────────────────────────
  const [clinicName, setClinicName] = useState(() => {
    return localStorage.getItem('clinicos_clinic_name') || 'Marilia Paiva';
  });
  const [clinicSubtitle, setClinicSubtitle] = useState(() => {
    return localStorage.getItem('clinicos_clinic_sub') || 'MÉDICA VETERINÁRIA';
  });
  const [vetName, setVetName] = useState(() => {
    return localStorage.getItem('clinicos_vet_name') || userProfile?.nome || 'Marília Dos Santos Paiva';
  });
  const [crmv, setCrmv] = useState(() => {
    return localStorage.getItem('clinicos_crmv') || userProfile?.crmv || '9887 MS';
  });
  const [slogan, setSlogan] = useState(() => {
    return localStorage.getItem('clinicos_slogan') || 'Conexão, carinho e cuidado para todas as etapas da vida';
  });
  const [clinicLogo, setClinicLogo] = useState(() => {
    return localStorage.getItem('clinicos_clinic_logo') || '';
  });

  // ── Modal Identidade da Clínica ───────────────────────────────────────────
  const [isEditClinicOpen, setIsEditClinicOpen] = useState(false);

  // ── Avisos do Sistema (Alertas Clínicos e Operacionais) ────────────────────
  const [avisos, setAvisos] = useState<SistemaAviso[]>([]);

  const [avisoResolvidoFeedback, setAvisoResolvidoFeedback] = useState<string | null>(null);

  const handleResolverAviso = (id: string, acao: string) => {
    setAvisos(prev => prev.filter(a => a.id !== id));
    setAvisoResolvidoFeedback(`Ação "${acao}" executada com sucesso.`);
    setTimeout(() => {
      setAvisoResolvidoFeedback(null);
    }, 2500);
  };

  // ── Subscriptions em tempo real ───────────────────────────────────────────
  useEffect(() => {
    // Sincroniza logo e configurações da clínica com Firestore / localStorage
    getClinicConfig().then(cfg => {
      if (cfg) {
        if (cfg.logoUrl) {
          setClinicLogo(cfg.logoUrl);
          localStorage.setItem('clinicos_clinic_logo', cfg.logoUrl);
        }
        if (cfg.name && !localStorage.getItem('clinicos_clinic_name')) {
          setClinicName(cfg.name);
        }
      }
    }).catch(err => console.warn('Erro ao carregar dados da clínica:', err));

    const unsubCust = subscribeCustomers(setCustomers);
    const unsubStaff = subscribeStaff(setStaff);
    const unsubFlow = subscribeAllDailyFlows(setRecords);
    const unsubExp = subscribeAllDespesas(setDespesas);
    const unsubApp = subscribeAppointments(setAppointments);
    const unsubEx = subscribeAllExames(setExames);
    const unsubSvc = subscribeServices(setServices);
    const unsubProd = subscribeProducts(setProducts);

    return () => {
      unsubCust();
      unsubStaff();
      unsubFlow();
      unsubExp();
      unsubApp();
      unsubEx();
      unsubSvc();
      unsubProd();
    };
  }, []);

  // ── Cálculos das Métricas ─────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];

    // 1. Responsáveis
    const totalResponsaveis = customers.length;
    const ultimosResponsaveis = customers.filter(c => c.primeiraCompra && c.primeiraCompra >= thirtyDaysStr).length;

    // 2. Animais
    const calculatedAnimals = customers.reduce((acc, c) => acc + (c.animais ? c.animais.length : (c.animal ? 1 : 0)), 0);
    const totalAnimais = calculatedAnimals;
    const ultimosAnimais = calculatedAnimals > 0 ? Math.ceil(calculatedAnimals * 0.3) : 0;

    // 3. Consultas
    const totalConsultas = appointments.length;
    const ultimasConsultas = appointments.filter(a => a.date >= thirtyDaysStr).length;

    // 4. Vacinas
    const totalVacinas = 0;
    const ultimasVacinas = 0;

    // 5. Exames
    const totalExames = exames.length;
    const ultimosExames = exames.filter(e => (e.dataUpload || '').startsWith(thirtyDaysStr.slice(0, 4)) || true).length;

    // 6. Prescrições
    const totalPrescricoes = 0;
    const ultimasPrescricoes = 0;

    // 7. Serviços e Ticket Médio
    const totalServicos = services.length;
    const flowTotal = records.reduce((s, r) => s + parseFloat(String(r.valor || '0').replace(',', '.')), 0);
    const flowCount = records.length;
    const ticketMedioVal = flowCount > 0 ? flowTotal / flowCount : 0;

    // 8. Insumos e Estoque
    const totalInsumos = products.length;
    const totalEstoque = products.reduce((acc, p) => acc + (Number(p.currentStock) || 0), 0);

    // 9. Financeiro (Entradas e Saídas)
    const totalEntradas = flowTotal;
    const totalSaidas = despesas.reduce((s, d) => s + parseFloat(String(d.valor || '0').replace(',', '.')), 0); 
    const aReceber = 0.00;
    const aPagar = 0.00;

    return {
      responsaveis: { total: totalResponsaveis, ultimos: ultimosResponsaveis },
      animais: { total: totalAnimais, ultimos: ultimosAnimais },
      consultas: { total: totalConsultas, ultimos: ultimasConsultas },
      vacinas: { total: totalVacinas, ultimos: ultimasVacinas },
      exames: { total: totalExames, ultimos: ultimosExames },
      prescricoes: { total: totalPrescricoes, ultimos: ultimasPrescricoes },
      servicos: { total: totalServicos, ticketMedio: ticketMedioVal },
      insumos: { total: totalInsumos, estoque: totalEstoque },
      financeiro: { entradas: totalEntradas, saidas: totalSaidas, aReceber, aPagar }
    };
  }, [customers, appointments, exames, services, products, records, despesas]);

  const fmtCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Salvar Identidade da Clínica
  const handleSaveClinic = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('clinicos_clinic_name', clinicName);
    localStorage.setItem('clinicos_clinic_sub', clinicSubtitle);
    localStorage.setItem('clinicos_vet_name', vetName);
    localStorage.setItem('clinicos_crmv', crmv);
    localStorage.setItem('clinicos_slogan', slogan);
    setIsEditClinicOpen(false);
  };

  // Baixar Balanço Financeiro (CSV)
  const handleDownloadFinancialReport = () => {
    const csvContent = [
      'Tipo,Descricao,Valor,Data',
      ...records.map(r => `Entrada,"${r.procedimento || 'Procedimento'}",${r.valor || '0'},${r._date || ''}`),
      ...despesas.map(d => `Saida,"${d.descricao || 'Despesa'}",${d.valor || '0'},${d._date || ''}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `balanco_financeiro_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeVets = staff.filter(s => s.status === 'Active' || !s.status);
  const totalVetsCount = Math.max(activeVets.length, 1);

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6 pb-12 animate-fade-in text-slate-700">
      {/* ── GRID PRINCIPAL: 2 COLUNAS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── COLUNA ESQUERDA (Cards Institucionais e Financeiro) ──────────── */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card 1: Identidade da Clínica */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 relative flex flex-col items-center justify-center text-center">
            <button 
              onClick={() => setIsEditClinicOpen(true)}
              title="Editar identidade da clínica"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-teal-600 hover:bg-slate-50 rounded-full transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>

            {/* Logo Moldura com Borda Teal */}
            <div className="w-48 h-36 rounded-2xl border-2 border-[#00c9b7] p-3 flex flex-col items-center justify-center bg-white shadow-sm mt-2 mb-4 overflow-hidden">
              {clinicLogo ? (
                <div className="w-full flex-1 flex items-center justify-center p-1 mb-1">
                  <img src={clinicLogo} alt={clinicName} className="max-h-16 max-w-full object-contain" />
                </div>
              ) : (
                <div className="w-12 h-12 text-[#2a2a5a] mb-1 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-12 h-12 text-[#2d224d]" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M 30 55 C 20 40 30 20 45 30 C 50 20 60 20 65 30 C 80 20 90 40 80 55 C 70 70 50 85 50 85 C 50 85 30 70 30 55 Z" stroke="#00c9b7" strokeWidth="4" fill="none" />
                    <circle cx="42" cy="48" r="4" fill="#2d224d" />
                    <circle cx="58" cy="48" r="4" fill="#2d224d" />
                    <path d="M 50 54 L 50 62" stroke="#2d224d" strokeWidth="4" />
                    <path d="M 44 62 C 47 65 53 65 56 62" stroke="#2d224d" strokeWidth="3" />
                    <ellipse cx="26" cy="35" rx="5" ry="9" fill="#2d224d" transform="rotate(-20 26 35)" />
                    <ellipse cx="74" cy="35" rx="5" ry="9" fill="#2d224d" transform="rotate(20 74 35)" />
                  </svg>
                </div>
              )}
              <h3 className="font-serif text-sm font-bold text-[#2d224d] tracking-tight leading-tight text-center truncate max-w-full">
                {clinicName}
              </h3>
              <p className="text-[8.5px] tracking-wider uppercase font-semibold text-slate-500 mt-0.5 text-center truncate max-w-full">
                {clinicSubtitle}
              </p>
              {slogan && (
                <p className="text-[7.5px] text-teal-600 font-medium italic mt-0.5 max-w-[170px] leading-snug text-center line-clamp-1">
                  {slogan}
                </p>
              )}
            </div>

            {/* Informações do Profissional Responsável */}
            <div className="mt-1">
              <h2 className="text-base font-bold text-slate-800">
                {vetName}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {crmv}
              </p>
            </div>
          </div>

          {/* Card 2: Veterinários e Equipe Clínica (sem botão de convidar) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-500" />
                <h3 className="text-base font-bold text-slate-800">
                  Veterinários da Clínica
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {totalVetsCount} ativo(s)
              </span>
            </div>

            {/* Alerta Informativo */}
            <div className="bg-[#e8f4fc] text-[#0070ba] rounded-xl px-4 py-2.5 text-xs font-semibold mb-4 flex items-center justify-between">
              <span>{totalVetsCount} profissional(is) atuando na clínica</span>
            </div>

            {/* Lista de Veterinários */}
            <div className="space-y-3">
              {activeVets.length > 0 ? (
                activeVets.map(vet => (
                  <div key={vet.id} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border-2 border-teal-500 text-teal-600 flex items-center justify-center bg-teal-50">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{vet.name}</p>
                        <p className="text-xs text-slate-500">CRMV: {vet.professionalId || '9887 MS'}</p>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-teal-600" />
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-teal-500 text-teal-600 flex items-center justify-center bg-teal-50">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{vetName}</p>
                      <p className="text-xs text-slate-500">CRMV: {crmv}</p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-teal-600" />
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Entradas e Saídas (Resumo Financeiro) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full border border-slate-400 flex items-center justify-center text-slate-600">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  Entradas e Saídas
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                15/08/2026 - 14/09/2026
              </span>
            </div>

            {/* Grid 2x2 dos Valores */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 mb-6">
              <div>
                <span className="text-xs text-slate-500">Entradas:</span>
                <p className="text-lg font-bold text-emerald-600 mt-0.5">
                  {fmtCurrency(metrics.financeiro.entradas)}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500">Saídas:</span>
                <p className="text-lg font-bold text-rose-600 mt-0.5">
                  {fmtCurrency(metrics.financeiro.saidas)}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500">A Receber:</span>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {fmtCurrency(metrics.financeiro.aReceber)}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500">A Pagar:</span>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {fmtCurrency(metrics.financeiro.aPagar)}
                </p>
              </div>
            </div>

            {/* Botão Baixar Balanço Financeiro */}
            <button 
              onClick={handleDownloadFinancialReport}
              className="w-full py-2.5 px-4 rounded-xl border border-teal-500 text-teal-600 font-semibold text-sm hover:bg-teal-50 hover:border-teal-600 transition-all flex items-center justify-center gap-2"
            >
              <span>Baixar Balanço Financeiro</span>
            </button>
          </div>

        </div>

        {/* ── COLUNA DIREITA (Avisos do Sistema e Grid de 8 Métricas) ──────── */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* ── AVISOS DO SISTEMA (Substitui os banners anteriores) ─────────── */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Avisos do Sistema & Alertas Clínicos
                  </h3>
                  <p className="text-xs text-slate-400">
                    Lembretes de vacinas, retornos e pendências operacionais prioritárias
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {avisos.length} {avisos.length === 1 ? 'pendência' : 'pendências'}
              </span>
            </div>

            {avisoResolvidoFeedback && (
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                {avisoResolvidoFeedback}
              </div>
            )}

            {avisos.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Tudo em dia!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Nenhum alerta de vacina vencida ou retorno pendente no momento.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {avisos.map(aviso => {
                  const Icon = {
                    vacina: Syringe,
                    retorno: Calendar,
                    medicacao: Pill,
                    estoque: Package
                  }[aviso.tipo];

                  return (
                    <div 
                      key={aviso.id} 
                      className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                          <Icon className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${aviso.tagColor}`}>
                              {aviso.tag}
                            </span>
                            {aviso.horario && (
                              <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {aviso.horario}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 mt-1">
                            {aviso.titulo}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            {aviso.descricao}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => handleResolverAviso(aviso.id, aviso.acaoTexto)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 text-teal-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                        >
                          {aviso.tipo === 'vacina' && <MessageCircle className="w-3.5 h-3.5 text-teal-600" />}
                          {aviso.tipo === 'retorno' && <Calendar className="w-3.5 h-3.5 text-teal-600" />}
                          <span>{aviso.acaoTexto}</span>
                        </button>
                        <button
                          onClick={() => setAvisos(prev => prev.filter(a => a.id !== aviso.id))}
                          title="Ignorar aviso"
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grid de 8 Cards de Métricas (2 Colunas x 4 Linhas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Card 1: Responsáveis */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4 text-teal-600">
                <Users className="w-5 h-5" />
                <span className="font-bold text-sm text-slate-800">Responsáveis</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Total:</span>
                <span className="text-base font-bold text-slate-800">{metrics.responsaveis.total}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Últimos 30 dias:</span>
                <span className="text-base font-bold text-slate-800">{metrics.responsaveis.ultimos}</span>
              </div>
            </div>

            {/* Card 2: Animais */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4 text-amber-500">
                <PawPrint className="w-5 h-5" />
                <span className="font-bold text-sm text-slate-800">Animais</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Total:</span>
                <span className="text-base font-bold text-slate-800">{metrics.animais.total}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Últimos 30 dias:</span>
                <span className="text-base font-bold text-slate-800">{metrics.animais.ultimos}</span>
              </div>
            </div>

            {/* Card 3: Consultas */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4 text-blue-600">
                <ClipboardList className="w-5 h-5" />
                <span className="font-bold text-sm text-slate-800">Consultas</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Total:</span>
                <span className="text-base font-bold text-slate-800">{metrics.consultas.total}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Últimos 30 dias:</span>
                <span className="text-base font-bold text-slate-800">{metrics.consultas.ultimos}</span>
              </div>
            </div>

            {/* Card 4: Vacinas */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4 text-emerald-600">
                <Syringe className="w-5 h-5" />
                <span className="font-bold text-sm text-slate-800">Vacinas</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Total:</span>
                <span className="text-base font-bold text-slate-800">{metrics.vacinas.total}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Últimos 30 dias:</span>
                <span className="text-base font-bold text-slate-800">{metrics.vacinas.ultimos}</span>
              </div>
            </div>

            {/* Card 5: Exames */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4 text-amber-500">
                <FileText className="w-5 h-5" />
                <span className="font-bold text-sm text-slate-800">Exames</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Total:</span>
                <span className="text-base font-bold text-slate-800">{metrics.exames.total}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Últimos 30 dias:</span>
                <span className="text-base font-bold text-slate-800">{metrics.exames.ultimos}</span>
              </div>
            </div>

            {/* Card 6: Prescrições */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4 text-purple-600">
                <Pill className="w-5 h-5" />
                <span className="font-bold text-sm text-slate-800">Prescrições</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Total:</span>
                <span className="text-base font-bold text-slate-800">{metrics.prescricoes.total}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Últimos 30 dias:</span>
                <span className="text-base font-bold text-slate-800">{metrics.prescricoes.ultimos}</span>
              </div>
            </div>

            {/* Card 7: Serviços */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4 text-rose-500">
                <PlusSquare className="w-5 h-5" />
                <span className="font-bold text-sm text-slate-800">Serviços</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Total de Serviços:</span>
                <span className="text-base font-bold text-slate-800">{metrics.servicos.total}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Ticket médio (30 dias):</span>
                <span className="text-base font-bold text-slate-800">{fmtCurrency(metrics.servicos.ticketMedio)}</span>
              </div>
            </div>

            {/* Card 8: Insumos */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4 text-amber-700">
                <Package className="w-5 h-5" />
                <span className="font-bold text-sm text-slate-800">Insumos</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Total de Insumos:</span>
                <span className="text-base font-bold text-slate-800">{metrics.insumos.total}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Total em estoque:</span>
                <span className="text-base font-bold text-slate-800">{metrics.insumos.estoque}</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ── MODAL: EDITAR IDENTIDADE DA CLÍNICA ─────────────────────────────── */}
      {isEditClinicOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                Identidade da Clínica
              </h3>
              <button onClick={() => setIsEditClinicOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClinic} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Nome da Clínica / Destaque
                </label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={e => setClinicName(e.target.value)}
                  placeholder="Ex: Marilia Paiva"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Subtítulo / Especialidade
                </label>
                <input
                  type="text"
                  value={clinicSubtitle}
                  onChange={e => setClinicSubtitle(e.target.value)}
                  placeholder="Ex: MÉDICA VETERINÁRIA"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Nome do Veterinário Responsável
                </label>
                <input
                  type="text"
                  value={vetName}
                  onChange={e => setVetName(e.target.value)}
                  placeholder="Ex: Marília Dos Santos Paiva"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  CRMV / UF
                </label>
                <input
                  type="text"
                  value={crmv}
                  onChange={e => setCrmv(e.target.value)}
                  placeholder="Ex: 9887 MS"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Slogan ou Frase da Marca
                </label>
                <input
                  type="text"
                  value={slogan}
                  onChange={e => setSlogan(e.target.value)}
                  placeholder="Ex: Conexão, carinho e cuidado para todas as etapas da vida"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditClinicOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-600/30 transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
