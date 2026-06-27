import { useState, useEffect } from 'react';
import { GitMerge, Plus, Calendar, FileText, Settings as SettingsIcon } from 'lucide-react';
import { fetchReconciliations, Reconciliation } from '../services/reconciliationService';
import ReconciliationImportModal from './reconciliation/ReconciliationImportModal';
import ReconciliationSettings from './reconciliation/ReconciliationSettings';
import ReconciliationDetails from './reconciliation/ReconciliationDetails';
import { useTranslation } from 'react-i18next';

const ReconciliationPage = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchReconciliations();
    setReconciliations(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (selectedRecId) {
    return (
      <ReconciliationDetails 
        id={selectedRecId} 
        onBack={() => setSelectedRecId(null)} 
      />
    );
  }

  return (
    <div className="h-full bg-base overflow-y-auto">
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <GitMerge className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-white">{t('admin:reconciliation.title', 'Conciliação Bancária')}</h1>
            </div>
            <p className="text-purple-200">
              {t('admin:reconciliation.subtitle', 'Importe seus extratos e faça o cruzamento automático com os lançamentos do ClinicOS.')}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSettings(true)}
              className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
              title="Configurações de Conciliação"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all"
            >
              <Plus className="w-5 h-5" />
              Nova Importação
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/10 bg-black/20">
            <h2 className="text-lg font-bold text-white">Histórico de Conciliações</h2>
          </div>
          
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reconciliations.length === 0 ? (
            <div className="p-12 text-center text-white/50">
              Nenhuma conciliação encontrada. Faça sua primeira importação!
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {reconciliations.map((rec) => (
                <div key={rec.id} className="p-6 hover:bg-white/5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      {rec.bankName}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {rec.period.start} até {rec.period.end}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded text-xs font-bold">
                        {rec.importFormat === 'pdf' ? '📄 PDF' : rec.importFormat === 'csv' ? '📊 CSV' : '🏦 OFX'}
                      </span>
                      <span>•</span>
                      <span>{new Date(rec.importedAt as string).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        rec.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        rec.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-teal-500/20 text-blue-400'
                      }`}>
                        {rec.status === 'completed' ? 'Concluído' : rec.status === 'in_progress' ? 'Em Progresso' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:items-end gap-2">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-green-400">✅ {rec.summary.matchedCount}</span>
                      {rec.summary.divergentCount > 0 && <span className="text-amber-400">⚠️ {rec.summary.divergentCount}</span>}
                      {(rec.summary.unreconciledBank + rec.summary.unreconciledClinic) > 0 && <span className="text-red-400">❌ {rec.summary.unreconciledBank + rec.summary.unreconciledClinic}</span>}
                    </div>
                    <button
                      onClick={() => setSelectedRecId(rec.id)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors border border-white/5"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showImport && (
        <ReconciliationImportModal 
          onClose={() => setShowImport(false)} 
          onSuccess={(id) => {
            setShowImport(false);
            loadData();
            setSelectedRecId(id);
          }} 
        />
      )}

      {showSettings && (
        <ReconciliationSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default ReconciliationPage;
