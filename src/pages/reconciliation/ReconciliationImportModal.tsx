import { useState, useRef, useEffect } from 'react';
import { X, AlertCircle, Sparkles, FileText, FileSpreadsheet, Building2, ChevronLeft } from 'lucide-react';
import { parseCSV, parseOFX, BankTransaction } from '../../utils/statementParsers';
import { parsePDFWithClaude } from '../../services/bankStatementAI';
import { autoMatch, validateBases, checkIntegrity } from '../../utils/autoMatch';
import { getIntegrationsConfig } from '../../services/dataService';
import {
  getReconciliationConfig,
  fetchCashMovements,
  saveReconciliationData,
  Reconciliation
} from '../../services/reconciliationService';
import { useTranslation } from 'react-i18next';

interface Props {
  onClose: () => void;
  onSuccess: (id: string) => void;
}

type FormatOption = 'pdf' | 'csv' | 'ofx' | null;

const ReconciliationImportModal = ({ onClose, onSuccess }: Props) => {
  const { t } = useTranslation(['admin', 'common']);
  const [step, setStep] = useState<'select_format' | 'upload'>('select_format');
  const [format, setFormat] = useState<FormatOption>(null);
  
  const [bankName, setBankName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getIntegrationsConfig().then(config => {
      setHasApiKey(!!config?.anthropicApiKey);
    });
  }, []);

  const handleFormatSelect = (selectedFormat: FormatOption) => {
    if (selectedFormat === 'pdf' && !hasApiKey) {
      alert('Configure your Claude API key to import PDF statements.');
      window.location.search = '?tab=configuracoes';
      return;
    }
    setFormat(selectedFormat);
    setStep('upload');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      const name = e.target.files[0].name.toLowerCase();
      if (name.includes('itau')) setBankName('Itaú');
      else if (name.includes('bradesco')) setBankName('Bradesco');
      else if (name.includes('nubank')) setBankName('Nubank');
      else if (name.includes('bb')) setBankName('Banco do Brasil');
    }
  };

  const processImport = async () => {
    if (!bankName || !startDate || !endDate || !file || !format) {
      setError('Preencha todos os campos e selecione um arquivo.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      let bankTransactions: BankTransaction[] = [];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (format === 'csv' && extension === 'csv') {
        bankTransactions = await parseCSV(file);
      } else if (format === 'ofx' && (extension === 'ofx' || extension === 'qfx')) {
        const text = await file.text();
        bankTransactions = parseOFX(text);
      } else if (format === 'pdf' && extension === 'pdf') {
        bankTransactions = await parsePDFWithClaude(file);
      } else {
        throw new Error(`Formato de arquivo inválido para a opção selecionada (${format.toUpperCase()}).`);
      }

      if (bankTransactions.length === 0) {
        throw new Error('Nenhuma transação encontrada no arquivo.');
      }
      
      const config = await getReconciliationConfig();
      const clinicMovements = await fetchCashMovements(startDate, endDate);

      const validation = validateBases(bankTransactions, clinicMovements, config);
      if (!validation.valid) {
        setError(`Não é possível conciliar: ${validation.stopReason}`);
        setLoading(false);
        return;
      }

      const reconciliationId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const items = autoMatch(bankTransactions, clinicMovements, config, validation, reconciliationId);
      
      const integrity = checkIntegrity(items, validation, config);

      const bankTotal = bankTransactions.reduce((acc, t) => acc + t.amount, 0);
      const clinicTotal = clinicMovements.reduce((acc, m) => acc + (parseFloat(m.valor) || 0), 0);
      
      let matchedCount = 0;
      let divergentCount = 0;
      let unreconciledBank = 0;
      let unreconciledClinic = 0;

      items.forEach(item => {
        if (item.status === 'matched' || item.status === 'matched_manual') matchedCount++;
        else if (item.status === 'divergent') divergentCount++;
        else if (item.status === 'bank_only') unreconciledBank++;
        else if (item.status === 'clinic_only') unreconciledClinic++;
      });

      const reconciliation: Reconciliation = {
        id: reconciliationId,
        period: { start: startDate, end: endDate },
        bankName,
        importedAt: new Date().toISOString(),
        status: (divergentCount > 0 || unreconciledBank > 0 || unreconciledClinic > 0) ? 'in_progress' : 'completed',
        importFormat: format,
        validation,
        integrity,
        summary: {
          bankTotal,
          clinicTotal,
          difference: bankTotal - clinicTotal,
          matchedCount,
          divergentCount,
          unreconciledBank,
          unreconciledClinic
        }
      };

      await saveReconciliationData(reconciliation, items);
      
      onSuccess(reconciliationId);
    } catch (e: any) {
      setError(e.message || 'Erro ao processar importação.');
      setLoading(false);
    }
  };

  const getFormatProps = () => {
    switch (format) {
      case 'pdf':
        return {
          icon: <FileText className="w-10 h-10 mx-auto mb-3 text-purple-400" />,
          accept: '.pdf',
          title: 'Importar extrato PDF',
          helperText: 'Aceita: .pdf',
          guide: (
            <div className="text-xs text-white/70 space-y-2">
              <div>📱 Santander: Extrato → Baixar extrato → PDF</div>
              <div>📱 Itaú: Extrato → Exportar → PDF</div>
              <div>📱 Bradesco: Extrato → Gerar PDF</div>
              <div>📱 BB: Extrato → Exportar → PDF</div>
            </div>
          )
        };
      case 'csv':
        return {
          icon: <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-emerald-400" />,
          accept: '.csv',
          title: 'Importar extrato CSV',
          helperText: 'Aceita: .csv',
          guide: (
            <div className="text-xs text-white/70 space-y-2">
              <div>📱 Nubank: Extratos → Exportar → CSV</div>
              <div>📱 Inter: Extrato → Exportar → CSV</div>
              <div>📱 PagBank: Exportar extrato → CSV (Planilha)</div>
              <div>📱 C6 Bank: Extrato → Exportar → CSV</div>
            </div>
          )
        };
      case 'ofx':
        return {
          icon: <Building2 className="w-10 h-10 mx-auto mb-3 text-blue-400" />,
          accept: '.ofx,.qfx',
          title: 'Importar extrato OFX',
          helperText: 'Aceita: .ofx, .qfx',
          guide: (
            <div className="text-xs text-white/70 space-y-2">
              <div>💻 Itaú: internet banking → Extrato → Exportar → OFX</div>
              <div>💻 Bradesco: internet banking → Extrato → OFX</div>
              <div>💻 BB: internet banking → Extrato → Exportar → OFX</div>
              <div>💻 Santander: internet banking → Extrato → OFX</div>
              <div>💻 Sicoob: internet banking → Extrato → OFX</div>
              <div className="text-amber-400 mt-2">⚠️ OFX disponível apenas no internet banking (navegador), não no app mobile</div>
            </div>
          )
        };
      default: return null;
    }
  };

  const currentFormatProps = getFormatProps();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1E1B4B] w-full max-w-2xl rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col">
        
        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            {step === 'upload' && (
              <button onClick={() => { setStep('select_format'); setFile(null); }} className="p-2 -ml-2 text-white/50 hover:bg-white/10 hover:text-white rounded-xl transition-colors flex items-center gap-1 text-sm font-medium">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">
                {step === 'select_format' ? t('admin:reconciliation.new_reconciliation', 'Nova Conciliação') : currentFormatProps?.title}
              </h2>
              {step === 'select_format' && (
                <p className="text-sm text-purple-200/60">{t('admin:reconciliation.choose_format', 'Escolha o formato do extrato bancário')}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/50 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'select_format' ? (
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* PDF Card */}
            <div 
              onClick={() => handleFormatSelect('pdf')}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 cursor-pointer hover:border-purple-500/50 hover:bg-white/10 transition-all flex flex-col items-center text-center group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <FileText className="w-12 h-12 text-purple-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">📄 PDF</h3>
              <p className="text-sm text-white/60 mb-6 flex-1">Exportado pelo app do banco</p>
              
              {!hasApiKey ? (
                <div className="mt-auto bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-2 rounded-lg border border-amber-500/30">
                  ⚡ API key not configured
                </div>
              ) : (
                <div className="mt-auto bg-purple-500/20 text-purple-300 text-xs font-bold px-3 py-2 rounded-lg border border-purple-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Requer API key (Claude)
                </div>
              )}
            </div>

            {/* CSV Card */}
            <div 
              onClick={() => handleFormatSelect('csv')}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 cursor-pointer hover:border-emerald-500/50 hover:bg-white/10 transition-all flex flex-col items-center text-center group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <FileSpreadsheet className="w-12 h-12 text-emerald-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">📊 CSV</h3>
              <p className="text-sm text-white/60 mb-6 flex-1">Nubank, Inter, PagBank, C6</p>
              
              <div className="mt-auto space-y-1 w-full">
                <div className="bg-white/5 text-white/70 text-xs font-bold px-3 py-1.5 rounded-lg">✅ Sem IA</div>
                <div className="bg-white/5 text-white/70 text-xs font-bold px-3 py-1.5 rounded-lg">✅ Sem custo</div>
                <div className="bg-white/5 text-white/70 text-xs font-bold px-3 py-1.5 rounded-lg">✅ Offline</div>
              </div>
            </div>

            {/* OFX Card */}
            <div 
              onClick={() => handleFormatSelect('ofx')}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 cursor-pointer hover:border-teal-500/50 hover:bg-white/10 transition-all flex flex-col items-center text-center group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Building2 className="w-12 h-12 text-blue-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">🏦 OFX</h3>
              <p className="text-sm text-white/60 mb-6 flex-1">Itaú, Bradesco, BB, Santander, Sicoob</p>
              
              <div className="mt-auto space-y-1 w-full">
                <div className="bg-white/5 text-white/70 text-xs font-bold px-3 py-1.5 rounded-lg">✅ Sem IA</div>
                <div className="bg-white/5 text-white/70 text-xs font-bold px-3 py-1.5 rounded-lg">✅ Sem custo</div>
                <div className="bg-white/5 text-white/70 text-xs font-bold px-3 py-1.5 rounded-lg">✅ Offline</div>
              </div>
            </div>

          </div>
        ) : (
          <div className="p-6 space-y-5 animate-in slide-in-from-right-4 duration-300">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-xs text-white/60 mb-1.5 block">Banco</label>
              <input 
                type="text" 
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                placeholder="Ex: Itaú, Bradesco, Nubank"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Data Inicial</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Data Final</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-white/60 mb-1.5 block">Arquivo</label>
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? 'border-primary/50 bg-primary/5' : 'border-white/20 hover:border-white/40 cursor-pointer'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  accept={currentFormatProps?.accept} 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                {currentFormatProps?.icon}
                {file ? (
                  <div>
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-xs text-white/50 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-white font-medium">Clique para selecionar</p>
                    <p className="text-xs text-white/50 mt-1">{currentFormatProps?.helperText}</p>
                  </div>
                )}
              </div>
            </div>

            {format === 'pdf' ? (
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-300 text-sm flex items-start gap-3">
                <Sparkles className="w-5 h-5 flex-shrink-0 text-purple-400 mt-0.5" />
                <div>
                  <strong className="block text-purple-200 mb-1">Processamento IA (Claude)</strong>
                  O texto do PDF será enviado para a API do Claude para extração das transações.
                  <span className="block mt-1 text-purple-400/80">Custo estimado: ~$0,01 por extrato.</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-sm flex items-start gap-3">
                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center bg-emerald-500/20 rounded-full text-emerald-400 mt-0.5">✓</div>
                <div>
                  Processamento local — sem IA, sem custo, offline.
                </div>
              </div>
            )}

            <details className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer">
              <summary className="px-4 py-3 text-sm font-medium text-purple-200 flex items-center justify-between hover:bg-white/5 transition-colors">
                <span className="flex items-center gap-2">ℹ️ Como exportar {format?.toUpperCase()} do seu banco</span>
                <span className="text-white/40 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-4 py-3 bg-black/20 border-t border-white/5 max-h-48 overflow-y-auto">
                {currentFormatProps?.guide}
              </div>
            </details>

          </div>
        )}

        {step === 'upload' && (
          <div className="px-6 py-4 border-t border-white/10 bg-black/40 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-white/70 hover:bg-white/10 transition-colors">
              Cancelar
            </button>
            <button 
              onClick={processImport} 
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              Importar e Auto-Match
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReconciliationImportModal;
