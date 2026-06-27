import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, AlertTriangle, HelpCircle, Download, FileText, Check } from 'lucide-react';
import { fetchReconciliationDetails, updateReconciliationItem, saveReconciliationData, Reconciliation, ReconciliationItem } from '../../services/reconciliationService';
import { useTranslation } from 'react-i18next';

interface Props {
  id: string;
  onBack: () => void;
}

type Filter = 'all' | 'matched' | 'divergent' | 'unreconciled';

const ReconciliationDetails = ({ id, onBack }: Props) => {
  const { t } = useTranslation(['admin', 'common']);
  const [data, setData] = useState<{ rec: Reconciliation, items: ReconciliationItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    const res = await fetchReconciliationDetails(id);
    if (res) {
      setData({ rec: res.reconciliation, items: res.items });
    }
    setLoading(false);
  };

  const handleResolve = async (itemId: string, status: ReconciliationItem['status'], reason?: ReconciliationItem['differenceReason'], notes?: string) => {
    if (!data) return;
    
    // Optimistic update
    const newItems = data.items.map(i => {
      if (i.id === itemId) {
        return { ...i, status, differenceReason: reason || i.differenceReason, notes: notes || i.notes };
      }
      return i;
    });

    // Re-calculate summary
    let matchedCount = 0;
    let divergentCount = 0;
    let unreconciledBank = 0;
    let unreconciledClinic = 0;

    newItems.forEach(item => {
      if (item.status === 'matched' || item.status === 'matched_manual') matchedCount++;
      else if (item.status === 'divergent') divergentCount++;
      else if (item.status === 'bank_only') unreconciledBank++;
      else if (item.status === 'clinic_only') unreconciledClinic++;
    });

    const newRec: Reconciliation = {
      ...data.rec,
      status: (divergentCount > 0 || unreconciledBank > 0 || unreconciledClinic > 0) ? 'in_progress' : 'completed',
      summary: {
        ...data.rec.summary,
        matchedCount,
        divergentCount,
        unreconciledBank,
        unreconciledClinic
      }
    };

    setData({ rec: newRec, items: newItems });

    // Save in background
    await updateReconciliationItem(itemId, { status, differenceReason: reason, notes });
    await saveReconciliationData(newRec, []); // just updating the main doc
  };

  const handleExport = () => {
    window.print();
  };

  if (loading || !data) {
    return (
      <div className="h-full bg-base p-8 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { rec, items } = data;
  const integrityPassed = rec.integrity?.passed !== false; // assume true if missing for backwards compatibility

  const filteredItems = items.filter(item => {
    // Filter type
    if (filter === 'matched' && !(item.status === 'matched' || item.status === 'matched_manual')) return false;
    if (filter === 'divergent' && item.status !== 'divergent') return false;
    if (filter === 'unreconciled' && !(item.status === 'bank_only' || item.status === 'clinic_only')) return false;

    // Search
    if (search) {
      const q = search.toLowerCase();
      const descBank = item.bank?.description.toLowerCase() || '';
      const descClinic = item.clinic?.description.toLowerCase() || '';
      if (!descBank.includes(q) && !descClinic.includes(q)) return false;
    }

    return true;
  });

  const getLayerBadge = (layer?: number) => {
    switch (layer) {
      case 1: return <span className="bg-green-600/30 text-green-400 px-2 py-0.5 rounded text-xs ml-2 font-bold">[L1 — exact]</span>;
      case 2: return <span className="bg-green-600/30 text-green-400 px-2 py-0.5 rounded text-xs ml-2 font-bold">[L2 — key in text]</span>;
      case 3: return <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded text-xs ml-2 font-bold">[L3 — batch]</span>;
      case 4: return <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded text-xs ml-2 font-bold">[L4 — rounding]</span>;
      case 5: return <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-xs ml-2 font-bold">[L5 — value+date]</span>;
      case 6: return <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-xs ml-2 font-bold">[L6 — fuzzy]</span>;
      default: return null;
    }
  };

  return (
    <div className="h-full bg-base overflow-y-auto">
      
      {/* Print Only Header */}
      <div className="hidden print:block p-8 text-black bg-white min-h-screen">
        <div className="border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold">BANK RECONCILIATION REPORT</h1>
          <p className="text-lg">ClinicOS Demo Clinic</p>
          <div className="flex gap-8 mt-2 text-sm">
            <p><strong>Bank:</strong> {rec.bankName}</p>
            <p><strong>Period:</strong> {rec.period.start} to {rec.period.end}</p>
            <p><strong>Generated on:</strong> {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="font-bold border-b border-gray-300 mb-2">RECONCILIATION SUMMARY</h2>
            <p>Bank Statement Total: R$ {rec.summary.bankTotal.toFixed(2)}</p>
            <p>Clinic Records Total (Gross): R$ {rec.summary.clinicTotal.toFixed(2)}</p>
            {rec.validation && <p>Clinic Records Total (Net): R$ {rec.validation.clinicNetTotal.toFixed(2)}</p>}
            {rec.validation && <p>Global Difference: R$ {rec.validation.globalDifference.toFixed(2)}</p>}
          </div>
          <div>
            <h2 className="font-bold border-b border-gray-300 mb-2">STATUS</h2>
            <p>Matched Items: {rec.summary.matchedCount}</p>
            <p>Divergent Items: {rec.summary.divergentCount}</p>
            <p>Unreconciled Items: {rec.summary.unreconciledBank + rec.summary.unreconciledClinic}</p>
          </div>
        </div>

        {rec.integrity && (
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="font-bold border-b border-gray-300 mb-2">COMPOSITION OF DIFFERENCE</h2>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td>Pending bank items ({items.filter(i => i.status === 'bank_only').length}):</td>
                    <td className="text-right">R$ {rec.integrity.pendingBankTotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>Pending clinic items ({items.filter(i => i.status === 'clinic_only').length}):</td>
                    <td className="text-right">R$ {rec.integrity.pendingClinicTotal.toFixed(2)} -</td>
                  </tr>
                  <tr>
                    <td>Value divergences ({items.filter(i => i.status === 'divergent').length}):</td>
                    <td className="text-right">R$ {rec.integrity.divergenceTotal.toFixed(2)} +</td>
                  </tr>
                  <tr className="border-t border-gray-300 font-bold">
                    <td>Composition total:</td>
                    <td className="text-right">R$ {rec.integrity.compositionTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <h2 className="font-bold border-b border-gray-300 mb-2">INTEGRITY PROOF</h2>
              {rec.integrity.passed ? (
                <div className="text-green-700">
                  <p>✅ Composition matches global difference.</p>
                  <p>Reconciliation validated.</p>
                </div>
              ) : (
                <div className="text-red-700 font-bold">
                  <p>❌ Composition (R$ {rec.integrity.compositionTotal.toFixed(2)}) does not match global difference (R$ {rec.validation?.globalDifference.toFixed(2)}).</p>
                  <p>Resolve pending items before exporting.</p>
                </div>
              )}
            </div>
          </div>
        )}

        <h2 className="font-bold text-lg border-b-2 border-black mb-4">ITEM DETAILS</h2>
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-400">
              <th className="py-2">Date</th>
              <th className="py-2">Description</th>
              <th className="py-2">Bank R$</th>
              <th className="py-2">Clinic R$</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-2">{item.bank?.date || item.clinic?.date}</td>
                <td className="py-2">
                  {item.status === 'matched' ? '✅ ' : item.status === 'divergent' ? '⚠️ ' : '❌ '}
                  {item.bank?.description || item.clinic?.description}
                  {item.matchLayer ? ` [L${item.matchLayer}]` : ''}
                  {item.differenceAmount ? ` diff R$ ${item.differenceAmount.toFixed(2)}` : ''}
                </td>
                <td className="py-2">{item.bank?.amount?.toFixed(2) || '-'}</td>
                <td className="py-2">{item.clinic?.amount?.toFixed(2) || '-'}</td>
                <td className="py-2 uppercase text-xs">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Screen View */}
      <div className="p-8 max-w-5xl mx-auto space-y-6 print:hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                {rec.bankName}
              </h1>
              <p className="text-purple-200/60 text-sm">
                Período: {rec.period.start} a {rec.period.end}
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleExport}
            disabled={!integrityPassed}
            className="flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl border border-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export Report (PDF)
          </button>
        </div>

        {!integrityPassed && rec.integrity && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="text-red-400 font-bold">STOP: Integrity Check Failed</h3>
              <p className="text-red-300/80 text-sm mt-1">{rec.integrity.stopReason}</p>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col justify-between">
            <span className="text-sm font-medium text-purple-300 mb-2">{t('admin:reconciliation.bank_total', 'Total no Banco')}</span>
            <div className="text-2xl font-bold text-white">R$ {rec.summary.bankTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          
          <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col justify-between">
            <span className="text-sm font-medium text-purple-300 mb-2">{t('admin:reconciliation.clinic_total', 'Total na Caixa (Líquido)')}</span>
            <div className="text-2xl font-bold text-white">R$ {(rec.validation?.clinicNetTotal || rec.summary.clinicTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>

          <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col justify-between md:col-span-2">
            <div className="flex gap-4 h-full">
              <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5 text-green-400 font-bold">
                  <CheckCircle className="w-4 h-4" /> {rec.summary.matchedCount}
                </div>
                <span className="text-xs text-center text-white/50 mt-1">Conciliados</span>
              </div>
              <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <AlertTriangle className="w-4 h-4" /> {rec.summary.divergentCount}
                </div>
                <span className="text-xs text-center text-white/50 mt-1">Divergentes</span>
              </div>
              <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5 text-red-400 font-bold">
                  <HelpCircle className="w-4 h-4" /> {rec.summary.unreconciledBank + rec.summary.unreconciledClinic}
                </div>
                <span className="text-xs text-center text-white/50 mt-1">Pendentes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-2xl">
          <div className="flex gap-1 w-full sm:w-auto overflow-x-auto">
            {(['all', 'matched', 'divergent', 'unreconciled'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                  filter === f ? 'bg-primary text-white shadow' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Buscar lançamentos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Items List */}
        <div className="space-y-4">
          {filteredItems.map(item => {
            const isMatched = item.status === 'matched' || item.status === 'matched_manual';
            const isDivergent = item.status === 'divergent';
            const isBankOnly = item.status === 'bank_only';
            const isClinicOnly = item.status === 'clinic_only';

            return (
              <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row gap-6">
                
                {/* Status Indicator */}
                <div className="flex flex-col items-center justify-start pt-1">
                  {isMatched && <CheckCircle className="w-6 h-6 text-green-400" />}
                  {isDivergent && <AlertTriangle className="w-6 h-6 text-amber-400" />}
                  {(isBankOnly || isClinicOnly) && <HelpCircle className="w-6 h-6 text-red-400" />}
                </div>

                {/* Data Columns */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Bank Side */}
                  <div className={`p-4 rounded-xl border ${item.bank ? 'bg-black/20 border-white/5' : 'bg-transparent border-dashed border-white/10 opacity-50'}`}>
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Banco</h3>
                    {item.bank ? (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-white text-sm font-medium">{item.bank.description}</span>
                          <span className="text-white font-bold">R$ {item.bank.amount.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-white/50">{item.bank.date}</p>
                      </>
                    ) : (
                      <p className="text-sm text-white/40 italic mt-2">Nenhum lançamento bancário correspondente.</p>
                    )}
                  </div>

                  {/* Clinic Side */}
                  <div className={`p-4 rounded-xl border ${item.clinic ? 'bg-black/20 border-white/5' : 'bg-transparent border-dashed border-white/10 opacity-50'}`}>
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">ClinicOS (Caixa)</h3>
                    {item.clinic ? (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-white text-sm font-medium">{item.clinic.description}</span>
                          <span className="text-white font-bold">R$ {item.clinic.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-white/50">
                          <span>{item.clinic.date} • {item.clinic.paymentMethod}</span>
                          <span>Líquido esp.: R$ {item.clinic.netAmount.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-white/40 italic mt-2">Nenhum lançamento no caixa correspondente.</p>
                    )}
                  </div>

                </div>

                {/* Actions / Resolution Panel */}
                <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
                  
                  {isMatched && (
                    <div className="text-sm text-green-400 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Conciliado 
                      {getLayerBadge(item.matchLayer)}
                    </div>
                  )}

                  {isDivergent && (
                    <div className="space-y-3">
                      <div className="text-sm text-amber-400 font-bold flex items-center">
                        Diferença: R$ {item.differenceAmount?.toFixed(2)}
                        {getLayerBadge(item.matchLayer)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleResolve(item.id, 'matched_manual', 'card_fee')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors border border-white/5">
                          Taxa Cartão
                        </button>
                        <button onClick={() => handleResolve(item.id, 'matched_manual', 'anticipation')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors border border-white/5">
                          Adiantamento
                        </button>
                        <button onClick={() => handleResolve(item.id, 'matched_manual', 'manual')} className="px-3 py-1.5 bg-primary/20 hover:bg-primary/40 text-primary text-xs rounded-lg transition-colors border border-primary/20">
                          Ok Manual
                        </button>
                      </div>
                    </div>
                  )}

                  {isBankOnly && (
                    <div className="space-y-3">
                      <div className="text-sm text-red-400 font-bold">Apenas no Banco</div>
                      <button className="w-full px-3 py-2 bg-primary/20 hover:bg-primary/40 text-primary text-xs rounded-lg transition-colors border border-primary/20">
                        Criar no Caixa
                      </button>
                      <button onClick={() => handleResolve(item.id, 'ignored')} className="w-full px-3 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-xs rounded-lg transition-colors">
                        Ignorar Lançamento
                      </button>
                    </div>
                  )}

                  {isClinicOnly && (
                    <div className="space-y-3">
                      <div className="text-sm text-red-400 font-bold">Apenas na Caixa</div>
                      <button onClick={() => handleResolve(item.id, 'matched_manual', 'manual')} className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors border border-white/5">
                        Recebido em Dinheiro Vivo
                      </button>
                      <button onClick={() => handleResolve(item.id, 'ignored')} className="w-full px-3 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-xs rounded-lg transition-colors">
                        Ignorar Lançamento
                      </button>
                    </div>
                  )}
                  
                  {item.status === 'ignored' && (
                    <div className="text-sm text-white/40 italic">Lançamento Ignorado</div>
                  )}
                  {item.status === 'matched_manual' && (
                    <div className="text-sm text-green-400 flex flex-wrap items-center gap-1 mt-1">
                      <Check className="w-4 h-4" /> Resolvido Manual
                      {item.differenceReason && <span className="text-white/40 text-xs ml-1 capitalize">({item.differenceReason.replace('_', ' ')})</span>}
                    </div>
                  )}

                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-3xl text-white/50">
              Nenhum lançamento encontrado para este filtro.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReconciliationDetails;
