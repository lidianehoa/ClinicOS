import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CreditCard, DollarSign, UserPlus, Save, UserCheck,
  PlusCircle, Search, Trash2, TrendingDown,
  ChevronDown, ChevronUp, MessageCircle, FileText
} from 'lucide-react';
import {
  saveDailyFlow, subscribeAllDailyFlows,
  saveDespesas, subscribeDespesas,
  batchSaveCustomers, searchCustomers,
  toCustomerId, getCustomer, saveCustomer, toLocalDateString,
  CATEGORIAS_DESPESA,
  canDelete,
  type Registro,
  type Despesa,
  type CategoriaDespesa,
  type Customer,
  type AppUser,
  type MedicalRecord
} from '../services/dataService';
import ProntuarioModal from '../components/ProntuarioModal';
import { useTranslation } from 'react-i18next';

interface MonitoramentoProps {
  onNavigateToCRM: (customerId: string) => void;
  userProfile: AppUser | null;
}

interface CustomerHint {
  id: string;
  nome: string;
  animal: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const makeId = () => `row_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const emptyRow = (): Registro => ({
  _id: makeId(),
  cliente: '',
  animal: '',
  procedimento: 'Consulta',
  maquininha: 'N/A',
  pagamento: 'Pix',
  valor: '',
  pago: true,
  observacoes: '',
  isManual: true,
});

const emptyDespesa = (): Despesa => ({
  _id: makeId(),
  descricao: '',
  categoria: 'Outros',
  valor: '',
  observacoes: '',
});

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

const Monitoramento = ({ onNavigateToCRM, userProfile }: MonitoramentoProps) => {
  const { t } = useTranslation(['monitoring', 'common']);
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));

  // ── Entradas ──────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<Registro[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const isLocalEdit = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Despesas ──────────────────────────────────────────────────────────────
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [savingDespesas, setSavingDespesas] = useState(false);
  const [savedDespesasOk, setSavedDespesasOk] = useState(false);
  const isLocalEditDespesas = useRef(false);
  const autoSaveDespesasTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [despesasExpanded, setDespesasExpanded] = useState(true);

  // ── Clientes / autocomplete ───────────────────────────────────────────────
  // Clientes / autocomplete
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CustomerHint[]>([]);

  // ── KPI card expandido (Cartão) ───────────────────────────────────────────
  const [cardExpanded, setCardExpanded] = useState(false);
  // ── Modal WhatsApp para novos clientes ────────────────────────────────────
  const [waQueue, setWaQueue] = useState<Customer[]>([]);
  const [showWaModal, setShowWaModal] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  // ── Subscriptions ─────────────────────────────────────────────────────────

  useEffect(() => {
    // Busca inicial pode ser feita aqui se necessário
  }, []);

  useEffect(() => {
    isLocalEdit.current = false;
    isLocalEditDespesas.current = false;

    console.log("[Monitoramento] Iniciando subscrição AGRESSIVA...");
    
    // Agora usamos a subscrição global e filtramos localmente para debug
    const unsubFlow = subscribeAllDailyFlows((allRecords) => {
      if (!isLocalEdit.current) {
        const filtered = allRecords.filter(r => r._date === selectedDate);
        console.log(`[Monitoramento] Total global: ${allRecords.length}, Filtrados para ${selectedDate}: ${filtered.length}`);
        setRows(filtered);
      }
    });

    const unsubExp = subscribeDespesas(selectedDate, (data) => {
      if (!isLocalEditDespesas.current) setDespesas(data);
    });

    return () => { unsubFlow(); unsubExp(); };
  }, [selectedDate]);

  // ── Auto-save com debounce de 2s ────────────────────────────────────────
  useEffect(() => {
    if (!isLocalEdit.current) return; // Só auto-salva se houve edição local
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaving(true);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        const validRows = rows.filter(r => r.cliente.trim() || r.animal.trim() || r.valor.trim());
        await saveDailyFlow(selectedDate, validRows);
        const seen = new Set<string>();
        const customersToSave: any[] = [];
        for (const row of validRows) {
          const nome = row.cliente.trim();
          if (!nome || seen.has(nome)) continue;
          seen.add(nome);
          customersToSave.push({ id: toCustomerId(nome), nome, animal: row.animal.trim() });
        }
        if (customersToSave.length > 0) await batchSaveCustomers(customersToSave);
      } catch (err) {
        console.error('Auto-save (entradas):', err);
      } finally {
        setAutoSaving(false);
      }
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [rows, selectedDate]);

  useEffect(() => {
    if (!isLocalEditDespesas.current) return;
    if (autoSaveDespesasTimer.current) clearTimeout(autoSaveDespesasTimer.current);
    autoSaveDespesasTimer.current = setTimeout(async () => {
      try {
        await saveDespesas(selectedDate, despesas);
      } catch (err) {
        console.error('Auto-save (despesas):', err);
      }
    }, 2000);
    return () => { if (autoSaveDespesasTimer.current) clearTimeout(autoSaveDespesasTimer.current); };
  }, [despesas, selectedDate]);

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const byPag = (pag: string) =>
    rows.filter(r => r.pagamento === pag)
      .reduce((s, r) => s + parseFloat(r.valor || '0'), 0);

  const totalPix = byPag('Pix');
  const totalDebito = byPag('Débito') + byPag('Cartão');
  const totalCredito = byPag('Crédito');
  const totalDinheiro = byPag('Dinheiro');
  const totalEntradas = totalPix + totalDebito + totalCredito + totalDinheiro;

  const totalDespesas = despesas.reduce(
    (s, d) => s + parseFloat(d.valor || '0'), 0
  );
  const saldoReal = totalEntradas - totalDespesas;

  // ── Handlers — entradas ───────────────────────────────────────────────────

  const addRow = () => {
    isLocalEdit.current = true;
    setRows(prev => [emptyRow(), ...prev]);
  };

  const removeRow = (id: string) => {
    isLocalEdit.current = true;
    setRows(prev => prev.filter(r => r._id !== id));
  };

  const updateRow = async (id: string, field: keyof Registro, value: any) => {
    isLocalEdit.current = true;
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value, isManual: field === 'cliente' ? true : r.isManual } : r));

    if (field === 'cliente') {
      setActiveRowId(id);
      if (value.length >= 2) {
        const results = await searchCustomers(value);
        setSuggestions(results.slice(0, 6));
      } else {
        setSuggestions([]);
        if (value.length === 0) setActiveRowId(null);
      }
    }
  };

  const applySuggestion = (rowId: string, c: CustomerHint) => {
    isLocalEdit.current = true;
    setRows(prev =>
      prev.map(r =>
        r._id === rowId ? { ...r, cliente: c.nome, animal: c.animal || r.animal, isManual: false } : r
      )
    );
    setActiveRowId(null);
    setSuggestions([]);
  };

  const handleClearAll = () => {
    if (window.confirm('⚠️ Tem certeza que deseja limpar TODOS os lançamentos deste dia?')) {
      isLocalEdit.current = true;
      setRows([]);
    }
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSavedOk(false);
    try {
      const validRows = rows.filter(
        r => r.cliente.trim() || r.animal.trim() || r.valor.trim()
      );

      await saveDailyFlow(selectedDate, validRows);

      const seen = new Set<string>();
      const customersToSave: any[] = [];
      const newPotentialCustomers: string[] = [];

      for (const row of validRows) {
        const nome = row.cliente.trim();
        if (!nome || seen.has(nome)) continue;
        seen.add(nome);

        const customerId = toCustomerId(nome);
        const customerData = { id: customerId, nome, animal: row.animal.trim() };
        customersToSave.push(customerData);
        
        // Só adiciona na fila de perguntas se for um lançamento manual desta sessão
        if (row.isManual) {
          newPotentialCustomers.push(customerId);
        }
      }

      if (customersToSave.length > 0) {
        // Antes de salvar, vamos ver quem realmente não existe ainda para perguntar o WhatsApp
        const toAsk: Customer[] = [];
        for (const cid of newPotentialCustomers) {
          const existing = await getCustomer(cid);
          if (!existing || !existing.telefone) {
            const data = customersToSave.find(c => c.id === cid);
            toAsk.push(data);
          }
        }

        await batchSaveCustomers(customersToSave);

        if (toAsk.length > 0) {
          setWaQueue(toAsk);
          setShowWaModal(true);
        }
      }

      isLocalEdit.current = false;
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 4000);
    } catch (err: any) {
      console.error('Erro ao gravar entradas:', err.code, err.message);
      alert('❌ Erro ao gravar entradas. Verifique o Firebase.');
    } finally {
      setSaving(false);
    }
  }, [selectedDate, rows]);

  const handleSaveWhatsApp = async (phone: string) => {
    if (waQueue.length === 0) return;
    const current = waQueue[0];
    try {
      await saveCustomer({ ...current, telefone: phone });
      const next = waQueue.slice(1);
      setWaQueue(next);
      if (next.length === 0) setShowWaModal(false);
    } catch (err) {
      console.error('Erro ao salvar WhatsApp:', err);
    }
  };

  const skipWhatsApp = () => {
    const next = waQueue.slice(1);
    setWaQueue(next);
    if (next.length === 0) setShowWaModal(false);
  };

  // ── Handlers — despesas ───────────────────────────────────────────────────

  const addDespesa = () => {
    isLocalEditDespesas.current = true;
    setDespesas(prev => [...prev, emptyDespesa()]);
  };

  const removeDespesa = (id: string) => {
    isLocalEditDespesas.current = true;
    setDespesas(prev => prev.filter(d => d._id !== id));
  };

  const updateDespesa = (id: string, field: keyof Despesa, value: string) => {
    isLocalEditDespesas.current = true;
    setDespesas(prev =>
      prev.map(d => d._id === id ? { ...d, [field]: value } : d)
    );
  };

  const handleSaveDespesas = useCallback(async () => {
    setSavingDespesas(true);
    setSavedDespesasOk(false);
    try {
      const validDespesas = despesas.filter(
        d => d.descricao.trim() || d.valor.trim()
      );
      await saveDespesas(selectedDate, validDespesas);
      isLocalEditDespesas.current = false;
      setSavedDespesasOk(true);
      setTimeout(() => setSavedDespesasOk(false), 4000);
    } catch (err: any) {
      console.error('Erro ao gravar despesas:', err.code, err.message);
      alert('❌ Erro ao gravar despesas. Verifique o Firebase.');
    } finally {
      setSavingDespesas(false);
    }
  }, [selectedDate, despesas]);

  const handleCRMLink = (row: Registro) => {
    onNavigateToCRM(toCustomerId(row.cliente));
  };

  const handleOpenProntuario = (row: Registro) => {
    const r: MedicalRecord = {
      id: `rec_${Date.now()}`,
      patientId: row.animal,
      patientName: row.animal,
      clientId: toCustomerId(row.cliente),
      clientName: row.cliente,
      professionalName: userProfile?.nome,
      date: new Date().toISOString().substring(0, 10),
      time: new Date().toTimeString().substring(0, 5),
      chiefComplaint: '',
      anamnesis: '',
      diagnosis: '',
      treatment: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSelectedRecord(r);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="space-y-6 animate-fade-in pb-16"
      onClick={() => { setActiveRowId(null); setSuggestions([]); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{t('monitoring:title', 'Monitoramento Diário')}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500">{t('monitoring:subtitle', 'Planilha de atendimentos e faturamento.')}</p>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
              autoSaving 
                ? 'bg-amber-50 text-amber-600 animate-pulse border border-amber-100' 
                : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${autoSaving ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              {autoSaving ? t('monitoring:status_saving', 'Salvando...') : t('monitoring:status_synced', 'Sincronizado')}
            </div>
          </div>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border border-purple-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-700 bg-white shadow-sm"
        />
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">

        {/* Saldo Real */}
        <div className={`bg-white p-5 rounded-3xl shadow-sm border flex items-center justify-between col-span-2 lg:col-span-1 ${saldoReal < 0 ? 'border-red-200' : 'border-purple-100'}`}>
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{t('monitoring:kpi_balance', 'Saldo Real')}</p>
            <h3 className={`text-xl font-bold mt-0.5 ${saldoReal < 0 ? 'text-red-500' : 'text-slate-800'}`}>
              {fmt(saldoReal)}
            </h3>
            <p className="text-[10px] font-medium text-slate-400">{t('monitoring:kpi_balance_sub', 'entradas − despesas')}</p>
          </div>
          <div className={`p-3 rounded-2xl ${saldoReal < 0 ? 'bg-red-50' : 'bg-primary/10'}`}>
            <DollarSign className={`w-6 h-6 ${saldoReal < 0 ? 'text-red-400' : 'text-primary'}`} />
          </div>
        </div>

        {/* Pix */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-purple-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Pix</p>
            <h3 className="text-xl font-bold text-slate-800 mt-0.5">{fmt(totalPix)}</h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl">
            <DollarSign className="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        {/* Cartão */}
        <div
          className="bg-white p-5 rounded-3xl shadow-sm border border-purple-100 cursor-pointer hover:border-secondary/40 transition-colors"
          onClick={e => { e.stopPropagation(); setCardExpanded(!cardExpanded); }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Cartão</p>
              <h3 className="text-xl font-bold text-slate-800 mt-0.5">{fmt(totalDebito + totalCredito)}</h3>
              <p className="text-[10px] text-slate-400">D: {fmt(totalDebito)} | C: {fmt(totalCredito)}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-2xl">
              <CreditCard className="w-6 h-6 text-secondary" />
            </div>
          </div>
          {cardExpanded && (
            <div className="mt-3 pt-3 border-t border-purple-50 text-xs space-y-1 text-slate-600">
              {rows.filter(r => r.pagamento === 'Débito' || r.pagamento === 'Crédito').map(r => (
                <div key={r._id} className="flex justify-between">
                  <span>{r.pagamento} · {r.cliente}</span>
                  <span className="font-semibold">{fmt(parseFloat(r.valor || '0'))}</span>
                </div>
              ))}
              {!rows.some(r => r.pagamento === 'Débito' || r.pagamento === 'Crédito') && (
                <p className="text-slate-400">Nenhuma transação em cartão.</p>
              )}
            </div>
          )}
        </div>

        {/* Dinheiro */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-purple-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Dinheiro</p>
            <h3 className="text-xl font-bold text-slate-800 mt-0.5">{fmt(totalDinheiro)}</h3>
          </div>
          <div className="p-3 bg-yellow-50 rounded-2xl">
            <DollarSign className="w-6 h-6 text-yellow-500" />
          </div>
        </div>

        {/* Total Despesas */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-red-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{t('monitoring:kpi_expenses', 'Despesas')}</p>
            <h3 className="text-xl font-bold text-slate-800 mt-0.5">{fmt(totalDespesas)}</h3>
            <p className="text-red-400 text-[10px] font-medium">{t('monitoring:kpi_expenses_sub', 'saídas do dia')}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-2xl">
            <TrendingDown className="w-6 h-6 text-red-400" />
          </div>
        </div>
      </div>

      {/* Busca de clientes */}
      <CustomerSearchBar
        onSelect={c => {
          isLocalEdit.current = true;
          setRows(prev => [
            { ...emptyRow(), cliente: c.nome, animal: c.animal, isManual: false },
            ...prev,
          ]);
        }}
      />

      {/* ── Tabela de entradas ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl shadow-sm border border-purple-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-50">
          <h2 className="font-semibold text-slate-700 text-lg">
            {t('monitoring:table_title', 'Lançamentos do Dia')}
            <span className="ml-2 text-sm text-slate-400 font-normal">({rows.length})</span>
          </h2>
          <button
            onClick={e => { e.stopPropagation(); addRow(); }}
            className="flex items-center space-x-2 px-4 py-2 bg-secondary/10 text-secondary font-medium rounded-xl hover:bg-secondary/20 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('monitoring:btn_new_entry', 'Novo Lançamento')}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[960px]">
            <thead>
              <tr className="bg-purple-50/60 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">{t('monitoring:col_client', 'Cliente')}</th>
                <th className="px-4 py-3 font-medium">{t('monitoring:col_patient', 'Paciente')}</th>
                <th className="px-4 py-3 font-medium">{t('monitoring:col_procedure', 'Procedimento')}</th>
                <th className="px-4 py-3 font-medium">{t('monitoring:col_payment_method', 'Maquininha')}</th>
                <th className="px-4 py-3 font-medium">{t('monitoring:col_payment_type', 'Pagamento')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('monitoring:col_value', 'Valor R$')}</th>
                <th className="px-4 py-3 font-medium text-center">{t('monitoring:col_status', 'Status')}</th>
                <th className="px-4 py-3 font-medium">{t('monitoring:col_notes', 'Observações')}</th>
                <th className="px-4 py-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 text-sm">
                    {t('monitoring:empty_entries', 'Nenhum lançamento.')}
                  </td>
                </tr>
              )}
              {rows.map(row => (
                <tr key={row._id} className="hover:bg-purple-50/30 transition-colors group">

                  {/* Cliente + autocomplete */}
                  <td className="px-4 py-3">
                    <div className="relative flex items-center space-x-1">
                      <div className="relative">
                        <input
                          type="text"
                          value={row.cliente}
                          onChange={e => { e.stopPropagation(); updateRow(row._id, 'cliente', e.target.value); }}
                          onClick={e => e.stopPropagation()}
                          placeholder="Nome do cliente"
                          autoComplete="off"
                          className="bg-transparent text-sm text-slate-700 border-none focus:outline-none focus:ring-0 w-36 placeholder-slate-300"
                        />
                        {activeRowId === row._id && suggestions.length > 0 && (
                          <div
                            className="absolute top-full left-0 z-50 mt-1 bg-white border border-purple-100 rounded-xl shadow-lg w-56 overflow-hidden"
                            onClick={e => e.stopPropagation()}
                          >
                            {suggestions.map(s => (
                              <button
                                key={s.id}
                                onMouseDown={() => applySuggestion(row._id, s)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 flex flex-col"
                              >
                                <span className="font-medium text-slate-800">{s.nome}</span>
                                {s.animal && <span className="text-xs text-slate-400">{s.animal}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => row.cliente && handleCRMLink(row)}
                          title="Abrir no CRM"
                          className="text-primary hover:text-pink-600 p-1 rounded-full hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => row.cliente && handleOpenProntuario(row)}
                          title="Abrir Prontuário"
                          className="text-indigo-600 hover:text-indigo-800 p-1 rounded-full hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.animal}
                      onChange={e => updateRow(row._id, 'animal', e.target.value)}
                      onClick={e => e.stopPropagation()}
                      placeholder="Paciente"
                      className="bg-transparent text-sm text-slate-700 border-none focus:outline-none focus:ring-0 w-24 placeholder-slate-300"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={row.procedimento}
                      onChange={e => updateRow(row._id, 'procedimento', e.target.value)}
                      className="bg-transparent text-sm text-slate-700 border-none focus:outline-none focus:ring-0 cursor-pointer"
                    >
                      {['Consulta', 'Exames', 'Vacinas', 'Banho', 'Cirurgia', 'Internação', 'Outros'].map(o => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={row.maquininha}
                      onChange={e => updateRow(row._id, 'maquininha', e.target.value)}
                      className="bg-transparent text-sm text-slate-700 border-none focus:outline-none focus:ring-0 cursor-pointer"
                    >
                      {['Getnet', 'Stone', 'Cielo', 'Rede', 'PagSeguro', 'N/A'].map(o => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={row.pagamento}
                      onChange={e => updateRow(row._id, 'pagamento', e.target.value)}
                      className="bg-transparent text-sm text-slate-700 border-none focus:outline-none focus:ring-0 cursor-pointer"
                    >
                      {['Pix', 'Débito', 'Crédito', 'Dinheiro'].map(o => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.valor}
                      onChange={e => updateRow(row._id, 'valor', e.target.value)}
                      onClick={e => e.stopPropagation()}
                      placeholder="0,00"
                      className="bg-transparent text-sm font-semibold text-slate-800 border-none focus:outline-none focus:ring-0 w-24 text-right placeholder-slate-300"
                    />
                  </td>

                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => updateRow(row._id, 'pago', !row.pago)}
                      className={`w-4 h-4 rounded-full transition-all shadow-sm ${row.pago ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-red-500 ring-4 ring-red-500/20'}`}
                      title={row.pago ? 'Pago' : 'Pendente'}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.observacoes}
                      onChange={e => updateRow(row._id, 'observacoes', e.target.value)}
                      onClick={e => e.stopPropagation()}
                      placeholder="Notas..."
                      className="bg-transparent text-sm text-slate-600 border-none focus:outline-none focus:ring-0 w-40 placeholder-slate-300"
                    />
                  </td>

                  <td className="px-2 py-3">
                    <button
                      disabled={!canDelete(userProfile?.role)}
                      onClick={() => removeRow(row._id)}
                      className="text-slate-300 hover:text-red-400 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all disabled:hidden"
                      title={!canDelete(userProfile?.role) ? "Apenas gerentes podem remover" : "Remover linha"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer entradas */}
        <div className="px-6 py-4 border-t border-purple-50 flex items-center justify-between bg-purple-50/30 flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">{t('monitoring:hint_crm', 'Clique no ícone rosa para abrir o CRM do cliente')}</span>
          </div>
          <div className="flex items-center gap-3">
            {autoSaving && (
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Salvando...
              </span>
            )}
            {!autoSaving && savedOk && (
              <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                ✅ Gravado com sucesso!
              </span>
            )}
            <button
              onClick={handleClearAll}
              disabled={saving || rows.length === 0 || !canDelete(userProfile?.role)}
              className="px-5 py-3 text-red-500 hover:text-red-700 font-semibold text-sm transition-colors rounded-2xl hover:bg-red-50 disabled:opacity-30"
            >
              {t('monitoring:btn_clear_all', 'Limpar Tudo')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-3 bg-primary text-white font-semibold rounded-2xl hover:bg-pink-600 transition-colors shadow-md shadow-primary/30 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? t('monitoring:status_saving', 'Salvando...') : t('monitoring:btn_save', 'Gravar Lançamentos')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Seção de Despesas (Saídas) ──────────────────────────────────────── */}
      <div className="bg-white rounded-3xl shadow-sm border border-red-100 overflow-hidden">

        {/* Header colapsável */}
        <button
          onClick={e => { e.stopPropagation(); setDespesasExpanded(v => !v); }}
          className="w-full flex items-center justify-between px-6 py-4 border-b border-red-50 hover:bg-red-50/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-xl">
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-left">
              <h2 className="font-semibold text-slate-700 text-lg">
                {t('monitoring:expenses_title', 'Saídas do Dia')}
                <span className="ml-2 text-sm text-slate-400 font-normal">({despesas.length})</span>
              </h2>
              {!despesasExpanded && totalDespesas > 0 && (
                <p className="text-xs text-red-400 font-medium">{fmt(totalDespesas)} em despesas</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {despesasExpanded && (
              <span
                onClick={e => { e.stopPropagation(); addDespesa(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 text-sm font-medium rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                {t('monitoring:btn_new_expense', 'Nova Despesa')}
              </span>
            )}
            {despesasExpanded
              ? <ChevronUp className="w-5 h-5 text-slate-400" />
              : <ChevronDown className="w-5 h-5 text-slate-400" />
            }
          </div>
        </button>

        {/* Tabela de despesas */}
        {despesasExpanded && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[640px]">
                <thead>
                  <tr className="bg-red-50/40 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">{t('monitoring:col_description', 'Descrição')}</th>
                    <th className="px-4 py-3 font-medium">{t('monitoring:col_category', 'Categoria')}</th>
                    <th className="px-4 py-3 font-medium text-right">{t('monitoring:col_value', 'Valor R$')}</th>
                    <th className="px-4 py-3 font-medium">{t('monitoring:col_notes', 'Observações')}</th>
                    <th className="px-4 py-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  {despesas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400 text-sm">
                        {t('monitoring:empty_expenses', 'Nenhuma despesa registrada.')}
                      </td>
                    </tr>
                  )}
                  {despesas.map(desp => (
                    <tr key={desp._id} className="hover:bg-red-50/20 transition-colors group">

                      {/* Descrição */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={desp.descricao}
                          onChange={e => updateDespesa(desp._id, 'descricao', e.target.value)}
                          onClick={e => e.stopPropagation()}
                          placeholder="Ex: Conta de água, ração..."
                          className="bg-transparent text-sm text-slate-700 border-none focus:outline-none focus:ring-0 w-52 placeholder-slate-300"
                        />
                      </td>

                      {/* Categoria */}
                      <td className="px-4 py-3">
                        <select
                          value={desp.categoria}
                          onChange={e => updateDespesa(desp._id, 'categoria', e.target.value as CategoriaDespesa)}
                          className="bg-transparent text-sm text-slate-700 border-none focus:outline-none focus:ring-0 cursor-pointer"
                        >
                          {CATEGORIAS_DESPESA.map(c => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </td>

                      {/* Valor */}
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={desp.valor}
                          onChange={e => updateDespesa(desp._id, 'valor', e.target.value)}
                          onClick={e => e.stopPropagation()}
                          placeholder="0,00"
                          className="bg-transparent text-sm font-semibold text-slate-800 border-none focus:outline-none focus:ring-0 w-24 text-right placeholder-slate-300"
                        />
                      </td>

                      {/* Observações */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={desp.observacoes}
                          onChange={e => updateDespesa(desp._id, 'observacoes', e.target.value)}
                          onClick={e => e.stopPropagation()}
                          placeholder="Notas..."
                          className="bg-transparent text-sm text-slate-600 border-none focus:outline-none focus:ring-0 w-40 placeholder-slate-300"
                        />
                      </td>

                      {/* Excluir */}
                      <td className="px-2 py-3">
                        <button
                          disabled={!canDelete(userProfile?.role)}
                          onClick={() => removeDespesa(desp._id)}
                          className="text-slate-300 hover:text-red-400 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all disabled:hidden"
                          title={!canDelete(userProfile?.role) ? "Apenas gerentes podem remover" : "Remover despesa"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Totalizador inline */}
                {despesas.length > 0 && (
                  <tfoot>
                    <tr className="bg-red-50/30 border-t border-red-100">
                      <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-slate-600">
                        Total de despesas
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-red-500">
                        {fmt(totalDespesas)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Footer despesas */}
            <div className="px-6 py-4 border-t border-red-50 flex items-center justify-between bg-red-50/20 flex-wrap gap-3">
              <p className="text-xs text-slate-400">
                As despesas são salvas separadamente dos lançamentos.
              </p>
              <div className="flex items-center gap-3">
                {savedDespesasOk && (
                  <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                    ✅ Despesas gravadas!
                  </span>
                )}
                <button
                  onClick={handleSaveDespesas}
                  disabled={savingDespesas}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white font-semibold rounded-2xl hover:bg-red-600 transition-colors shadow-md shadow-red-200 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingDespesas ? 'Gravando...' : 'Gravar Despesas'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modal de WhatsApp ──────────────────────────────────────────────── */}
      {showWaModal && waQueue.length > 0 && (
        <WhatsAppModal
          customerName={waQueue[0].nome}
          onSave={handleSaveWhatsApp}
          onSkip={skipWhatsApp}
        />
      )}

      {selectedRecord && (
        <ProntuarioModal 
          initialRecord={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WhatsAppModal
// ─────────────────────────────────────────────────────────────────────────────

interface WhatsAppModalProps {
  customerName: string;
  onSave: (phone: string) => void;
  onSkip: () => void;
}

function WhatsAppModal({ customerName, onSave, onSkip }: WhatsAppModalProps) {
  const [phone, setPhone] = useState('');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Cadastrar WhatsApp?</h2>
          <p className="text-slate-500 mb-8 px-4">
            Deseja salvar o contato de <span className="font-bold text-slate-700">{customerName}</span> para facilitar o envio de mensagens?
          </p>

          <div className="space-y-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">+55</span>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="(00) 00000-0000"
                autoFocus
                className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-lg text-slate-700"
              />
            </div>

            <button
              onClick={() => onSave(phone)}
              disabled={!phone || phone.length < 10}
              className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none"
            >
              Salvar Contato
            </button>

            <button
              onClick={onSkip}
              className="w-full py-3 text-slate-400 font-medium hover:text-slate-600 transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
        <div className="bg-slate-50 px-8 py-4 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            VetFlow 360 · CRM Inteligente
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomerSearchBar
// ─────────────────────────────────────────────────────────────────────────────

interface CustomerSearchBarProps {
  onSelect: (c: CustomerHint) => void;
}

function CustomerSearchBar({ onSelect }: CustomerSearchBarProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const [filtered, setFiltered] = useState<CustomerHint[]>([]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        const results = await searchCustomers(query);
        setFiltered(results as CustomerHint[]);
      } else {
        setFiltered([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div
      className="relative bg-white rounded-2xl shadow-sm border border-purple-100 px-4 py-3 flex items-center space-x-3"
      onClick={e => e.stopPropagation()}
    >
      <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar cliente cadastrado e adicionar lançamento..."
        className="flex-1 bg-transparent text-sm text-slate-700 focus:outline-none placeholder-slate-400"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-purple-100 rounded-2xl shadow-xl z-50 overflow-hidden">
          {filtered.map(c => (
            <button
              key={c.id}
              onMouseDown={() => { onSelect(c); setQuery(''); setOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm hover:bg-purple-50 flex items-center space-x-3 border-b border-purple-50 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-xs">
                  {c.nome.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-slate-800">{c.nome}</p>
                {c.animal && <p className="text-xs text-slate-400">{c.animal}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Monitoramento;