import { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Info, Loader2, ArrowRight } from 'lucide-react';
import { Product } from '../../services/dataService';
import { parseProductCSV, importProductsBatch } from '../../services/productImporter';
import { useTranslation } from 'react-i18next';

interface Props {
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ImportCSVModal = ({ tenantId, onClose, onSuccess }: Props) => {
  const { t } = useTranslation(['products', 'common']);
  // file unused, handled inline
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<{ products: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[], skipped: number, errors: string[] } | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'add_new' | 'update'>('add_new');
  
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = async (f: File) => {
    if (!f.name.endsWith('.csv')) {
      alert(t('products:import.select_csv', 'Por favor, selecione um arquivo CSV.'));
      return;
    }
    setIsParsing(true);
    try {
      const result = await parseProductCSV(f, tenantId);
      setParsedData(result);
    } catch (err) {
      console.error(err);
      alert(t('products:import.error_process', 'Erro ao processar o CSV.'));
    } finally {
      setIsParsing(false);
    }
  };

  const startImport = async () => {
    if (!parsedData || parsedData.products.length === 0) return;
    
    setIsImporting(true);
    setImportProgress({ current: 0, total: parsedData.products.length });
    
    try {
      await importProductsBatch(
        parsedData.products,
        tenantId,
        importMode,
        (current, total) => {
          setImportProgress({ current, total });
        }
      );
      
      onSuccess();
    } catch (err) {
      console.error(err);
      alert(t('products:import.error_import', 'Ocorreu um erro durante a importação.'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-base border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            {t('products:import.title', 'Importar Produtos (CSV)')}
          </h2>
          <button onClick={onClose} disabled={isImporting} className="p-2 text-white/50 hover:bg-white/10 rounded-xl transition-all disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {!parsedData && !isParsing && (
            <div 
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={e => e.target.files && handleFileSelected(e.target.files[0])} />
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-all">
                <Upload className="w-8 h-8 text-white/50 group-hover:text-primary transition-colors" />
              </div>
              <h3 className="text-white font-bold text-lg">Arraste seu arquivo CSV aqui</h3>
              <p className="text-white/50 text-sm mt-2">ou clique para selecionar</p>
              
              <div className="mt-8 bg-white/5 rounded-xl p-4 text-left w-full max-w-md">
                <div className="flex gap-2 items-start text-white/60 text-xs">
                  <Info className="w-4 h-4 text-teal-400 shrink-0" />
                  <div>
                    <strong className="text-white/80 block mb-1">Formato suportado:</strong>
                    Padrão de exportação de ERPs Veterinários (SimplesVet, VetSoft, etc).
                    Separação por <code className="bg-black/30 px-1 rounded text-teal-300">;</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isParsing && (
            <div className="flex flex-col items-center justify-center py-20 text-white/60 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p>Lendo arquivo...</p>
            </div>
          )}

          {parsedData && !isImporting && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <CheckCircle className="w-6 h-6 shrink-0" />
                <div>
                  <h3 className="font-bold text-emerald-300">CSV Lido com Sucesso!</h3>
                  <p className="text-sm">Encontrados {parsedData.products.length} itens válidos.</p>
                </div>
              </div>

              {parsedData.skipped > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p><strong>{parsedData.skipped} linhas ignoradas</strong> por falta de nome do produto.</p>
                </div>
              )}

              <div className="border border-white/10 rounded-xl overflow-hidden">
                <div className="bg-white/5 px-4 py-2 border-b border-white/10 text-xs font-bold text-white/50 uppercase">
                  Preview (Primeiros 5)
                </div>
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/5 text-white/50 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-2 font-medium">Cód.</th>
                      <th className="px-4 py-2 font-medium">Nome</th>
                      <th className="px-4 py-2 font-medium">Tipo</th>
                      <th className="px-4 py-2 font-medium">Preço</th>
                      <th className="px-4 py-2 font-medium">EAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/80">
                    {parsedData.products.slice(0, 5).map((p, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-mono text-white/50">{p.internalCode || '—'}</td>
                        <td className="px-4 py-2 truncate max-w-[200px]">{p.name}</td>
                        <td className="px-4 py-2 capitalize">{p.type === 'service' ? 'Serviço' : 'Produto'}</td>
                        <td className="px-4 py-2 text-primary font-bold">
                          R$ {p.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-white/50 text-xs">
                          {p.barcode ? '✅' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-bold text-white/60">Modo de Importação</label>
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${importMode === 'add_new' ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30 bg-white/5'}`}>
                    <input type="radio" name="mode" value="add_new" checked={importMode === 'add_new'} onChange={() => setImportMode('add_new')} className="text-primary focus:ring-primary bg-transparent border-white/30" />
                    <div>
                      <span className="text-white font-medium block">Adicionar Produtos</span>
                      <span className="text-white/50 text-xs block">Serão importados como novos itens na base.</span>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${importMode === 'replace' ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30 bg-white/5'}`}>
                    <input type="radio" name="mode" value="replace" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} className="text-primary focus:ring-primary bg-transparent border-white/30" />
                    <div>
                      <span className="text-white font-medium block">Substituir Base</span>
                      <span className="text-white/50 text-xs block">Limpa a base atual e cadastra apenas o CSV (Em breve).</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {isImporting && (
            <div className="flex flex-col items-center justify-center py-10 space-y-6">
              <div className="w-full max-w-md space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-primary">Importando...</span>
                  <span className="text-white">{importProgress.current} / {importProgress.total}</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-white/50 text-sm">Por favor, não feche esta janela.</p>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        {parsedData && !isImporting && (
          <div className="flex justify-end gap-3 p-6 border-t border-white/10 bg-black/20">
            <button onClick={() => setParsedData(null)} className="px-6 py-2.5 rounded-xl font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all">
              {t('common:back', 'Voltar')}
            </button>
            <button onClick={startImport} className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-pink-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20">
              {t('products:import.import_items', 'Importar {{count}} itens', { count: parsedData.products.length })}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default ImportCSVModal;
