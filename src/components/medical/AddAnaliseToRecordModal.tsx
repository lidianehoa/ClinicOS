import { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, FileText, AlertTriangle } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { 
  AppUser, 
  AnaliseClinica,
  CasoClinico,
  notasExplicativasCol,
  NotaExplicativa,
  getActiveTenantId
} from '../../services/dataService';

interface Props {
  userProfile: AppUser | null;
  caso: CasoClinico;
  analise: AnaliseClinica;
  onCancel: () => void;
  onSuccess: (notaId: string) => void;
}

const AddAnaliseToRecordModal = ({ caso, analise, onCancel, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [conteudo, setConteudo] = useState('');
  
  const disclaimerText = 'Análise clínica assistida por IA (ClinicOS IA).\nAs informações abaixo são baseadas na inteligência artificial e podem ter sido editadas pelo veterinário responsável antes de integrar o prontuário.';

  useEffect(() => {
    // Monta o texto inicial a partir da análise gerada
    let texto = '';
    
    if (analise.achados) {
      texto += `[ACHADOS CLÍNICOS]\n${analise.achados}\n\n`;
    }
    
    if (analise.diferenciais && analise.diferenciais.length > 0) {
      texto += `[DIAGNÓSTICOS DIFERENCIAIS]\n`;
      analise.diferenciais.forEach((d: any) => {
        if (typeof d === 'string') {
          texto += `- ${d}\n`;
        } else {
          texto += `- ${d.diagnostico} (Probabilidade: ${d.probabilidade || 'N/A'})\n`;
          if (d.justificativa) texto += `  Justificativa: ${d.justificativa}\n`;
        }
      });
      texto += '\n';
    }

    if (analise.condutaSugerida) {
      texto += `[CONDUTA SUGERIDA]\n${analise.condutaSugerida}\n\n`;
    }

    if (analise.interpretacaoClinica) {
      texto += `[INTERPRETAÇÃO]\n${analise.interpretacaoClinica}\n`;
    }

    setConteudo(texto.trim());
  }, [analise]);

  const handleSubmit = async () => {
    if (!conteudo.trim()) {
      alert('O conteúdo não pode ficar vazio.');
      return;
    }
    
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const activeTenant = getActiveTenantId();
      const ref = doc(notasExplicativasCol(activeTenant));
      
      const nota: NotaExplicativa = {
        id: ref.id,
        pacienteId: caso.pacienteId,
        casoId: caso.id,
        analiseId: analise.id,
        // O disclaimer é embutido diretamente no conteúdo salvo no banco
        conteudo: `${disclaimerText}\n\n----------------------------------------\n\n${conteudo}`,
        geradaEm: now,
        status: 'confirmada',
        confirmadaEm: now,
        tenantId: activeTenant
      };

      await setDoc(ref, nota);
      onSuccess(nota.id);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar no prontuário.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-up">
        
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              Adicionar ao Prontuário
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Revise e edite a análise antes de registrá-la no histórico oficial do paciente.
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
        <div className="p-8 overflow-y-auto flex-1 flex flex-col space-y-6">
          
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 text-amber-800 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Nota Legal (Disclaimer Fixo)</p>
              <p className="opacity-90 leading-relaxed whitespace-pre-wrap">{disclaimerText}</p>
              <p className="opacity-70 mt-2 text-xs italic">*Este texto será automaticamente adicionado ao topo do registro no prontuário.</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-[300px]">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Conteúdo da Análise (Editável)
            </label>
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 resize-none font-mono text-sm leading-relaxed"
              placeholder="Descreva a análise clínica..."
            />
          </div>

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
            disabled={loading}
            className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Confirmar e Salvar no Prontuário
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddAnaliseToRecordModal;
