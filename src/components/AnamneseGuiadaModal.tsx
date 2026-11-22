import { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Sparkles, 
  AlertCircle, 
  ChevronRight, 
  ClipboardList, 
  Info, 
  CheckSquare, 
  Square, 
  RotateCcw,
  Plus,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { 
  RoteiroAnamnese, 
  SEED_ROTEIROS_ANAMNESE, 
  gerarResumoAnamnese 
} from '../data/seedRoteirosAnamnese';

interface AnamneseGuiadaModalProps {
  isOpen: boolean;
  onClose: () => void;
  roteiros?: RoteiroAnamnese[];
  currentSintomas: string;
  onApplyResumo: (novoTexto: string, modo: 'substituir' | 'concatenar') => void;
  initialQueixaId?: string;
}

export default function AnamneseGuiadaModal({
  isOpen,
  onClose,
  roteiros = SEED_ROTEIROS_ANAMNESE,
  currentSintomas,
  onApplyResumo,
  initialQueixaId
}: AnamneseGuiadaModalProps) {
  const [searchQueixa, setSearchQueixa] = useState('');
  const [selectedRoteiroId, setSelectedRoteiroId] = useState<string | null>(initialQueixaId || null);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  
  // Confirmação para quando já existe texto no campo Sintomas Principais
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [resumoGeradoTemp, setResumoGeradoTemp] = useState('');

  const activeRoteiro = useMemo(() => {
    return (roteiros || SEED_ROTEIROS_ANAMNESE).find(r => r.id === selectedRoteiroId) || null;
  }, [roteiros, selectedRoteiroId]);

  const filteredRoteiros = useMemo(() => {
    const list = (roteiros && roteiros.length > 0) ? roteiros : SEED_ROTEIROS_ANAMNESE;
    if (!searchQueixa.trim()) return list;
    const q = searchQueixa.toLowerCase();
    return list.filter(r => 
      r.nome.toLowerCase().includes(q) ||
      (r.semiologia && r.semiologia.toLowerCase().includes(q)) ||
      (r.objetivo && r.objetivo.toLowerCase().includes(q))
    );
  }, [roteiros, searchQueixa]);

  // Resumo gerado em tempo real
  const resumoTexto = useMemo(() => {
    if (!activeRoteiro) return '';
    return gerarResumoAnamnese(activeRoteiro, respostas);
  }, [activeRoteiro, respostas]);

  const handleSelectQueixa = (r: RoteiroAnamnese) => {
    setSelectedRoteiroId(r.id);
    setRespostas({});
  };

  const handleSetResposta = (campoId: string, valor: any) => {
    setRespostas(prev => ({
      ...prev,
      [campoId]: valor
    }));
  };

  const toggleChecklistOption = (campoId: string, opcao: string) => {
    setRespostas(prev => {
      const current = prev[campoId] || [];
      const updated = current.includes(opcao)
        ? current.filter((item: string) => item !== opcao)
        : [...current, opcao];
      return {
        ...prev,
        [campoId]: updated
      };
    });
  };

  const handleTriggerInsert = () => {
    if (!resumoTexto.trim()) {
      alert('Preencha ao menos alguns campos do roteiro para gerar o resumo.');
      return;
    }

    if (currentSintomas && currentSintomas.trim().length > 0) {
      setResumoGeradoTemp(resumoTexto.trim());
      setIsConfirmOpen(true);
    } else {
      onApplyResumo(resumoTexto.trim(), 'substituir');
      onClose();
    }
  };

  const handleConfirmAction = (modo: 'substituir' | 'concatenar') => {
    onApplyResumo(resumoGeradoTemp, modo);
    setIsConfirmOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="bg-slate-900 border border-white/10 w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Anamnese Guiada por Queixa Principal</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2.5 py-0.5 rounded-full">
                  30 Roteiros Clínicos
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Checklist estruturado com geração automática de resumo profissional para o prontuário e IA.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split View (Queixas | Roteiro Preenchimento) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          
          {/* Coluna 1: Lista das 30 Queixas Principais (35% da tela) */}
          <div className="lg:col-span-4 border-r border-white/10 bg-slate-950/40 p-4 flex flex-col min-h-0 overflow-hidden">
            <div className="relative mb-3 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQueixa}
                onChange={e => setSearchQueixa(e.target.value)}
                placeholder="Buscar queixa (ex: vômito, prurido, tosse...)"
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {filteredRoteiros.map((r) => {
                const isSelected = selectedRoteiroId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectQueixa(r)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-teal-500/20 border-teal-500/50 text-white shadow-sm ring-1 ring-teal-500/30'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold text-teal-400/80 bg-slate-900 px-1.5 py-0.5 rounded-md border border-white/10">
                          #{String(r.ordem).padStart(2, '0')}
                        </span>
                        <span className="text-xs font-bold">{r.nome}</span>
                      </div>
                      {r.semiologia && (
                        <span className="text-[10px] text-slate-400 block line-clamp-1">
                          Semiologia: {r.semiologia}
                        </span>
                      )}
                    </div>

                    <ChevronRight className={`w-4 h-4 shrink-0 mt-1 transition-transform ${isSelected ? 'text-teal-400 translate-x-0.5' : 'text-slate-500'}`} />
                  </button>
                );
              })}

              {filteredRoteiros.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Nenhuma queixa encontrada com o termo pesquisado.
                </div>
              )}
            </div>
          </div>

          {/* Coluna 2: Formulário do Roteiro Ativo + Preview Resumo (65% da tela) */}
          <div className="lg:col-span-8 flex flex-col min-h-0 bg-slate-900/50 overflow-hidden">
            {activeRoteiro ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                
                {/* Roteiro Header Info */}
                <div className="p-4 sm:px-6 border-b border-white/10 bg-slate-950/30 shrink-0 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-teal-400">Roteiro #{String(activeRoteiro.ordem).padStart(2, '0')}</span>
                      <h4 className="text-base font-black text-white">{activeRoteiro.nome}</h4>
                    </div>
                    {activeRoteiro.objetivo && (
                      <p className="text-xs text-teal-200/70 mt-0.5 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        {activeRoteiro.objetivo}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setRespostas({})}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 hover:bg-white/5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    title="Limpar respostas preenchidas"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Limpar
                  </button>
                </div>

                {/* Questionário Rolável */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
                  {activeRoteiro.secoes.map((secao, sIdx) => (
                    <div key={sIdx} className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
                        <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center justify-center border border-teal-500/30">
                          {sIdx + 1}
                        </span>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          {secao.titulo}
                        </h5>
                      </div>

                      <div className="space-y-4">
                        {secao.campos.map((campo) => {
                          const currentVal = respostas[campo.id];

                          return (
                            <div key={campo.id} className="space-y-1.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="text-xs font-semibold text-slate-300">
                                  {campo.pergunta}
                                </label>
                                {campo.notaExplicativa && (
                                  <span className="text-[10px] text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                    {campo.notaExplicativa}
                                  </span>
                                )}
                              </div>

                              {/* Tipo 1: Sim / Não / Não sei */}
                              {campo.tipo === 'sim_nao_naosei' && (
                                <div className="flex items-center gap-2 pt-0.5">
                                  {[
                                    { label: 'Sim', val: 'sim', bgActive: 'bg-emerald-600 border-emerald-500 text-white' },
                                    { label: 'Não', val: 'nao', bgActive: 'bg-rose-600 border-rose-500 text-white' },
                                    { label: 'Não soube', val: 'nao_soube', bgActive: 'bg-slate-600 border-slate-500 text-white' }
                                  ].map(opt => {
                                    const isSel = currentVal === opt.val;
                                    return (
                                      <button
                                        key={opt.val}
                                        type="button"
                                        onClick={() => handleSetResposta(campo.id, isSel ? undefined : opt.val)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                          isSel 
                                            ? opt.bgActive + ' shadow-sm' 
                                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                                        }`}
                                      >
                                        {opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Tipo 2: Opções exclusivas (Botões ou Select) */}
                              {campo.tipo === 'opcoes' && campo.opcoes && (
                                <div className="flex flex-wrap gap-2 pt-0.5">
                                  {campo.opcoes.map((opcao) => {
                                    const isSel = currentVal === opcao;
                                    return (
                                      <button
                                        key={opcao}
                                        type="button"
                                        onClick={() => handleSetResposta(campo.id, isSel ? undefined : opcao)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                          isSel
                                            ? 'bg-teal-600 border-teal-500 text-white shadow-sm'
                                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                                        }`}
                                      >
                                        {opcao}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Tipo 3: Checklist múltiplo (Sinais Associados) */}
                              {campo.tipo === 'checklist' && campo.opcoes && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                                  {campo.opcoes.map((opt) => {
                                    const isChecked = Array.isArray(currentVal) && currentVal.includes(opt);
                                    return (
                                      <div
                                        key={opt}
                                        onClick={() => toggleChecklistOption(campo.id, opt)}
                                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                          isChecked
                                            ? 'bg-teal-500/20 border-teal-500/40 text-teal-200 font-bold'
                                            : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                                        }`}
                                      >
                                        {isChecked ? (
                                          <CheckSquare className="w-4 h-4 text-teal-400 shrink-0" />
                                        ) : (
                                          <Square className="w-4 h-4 text-slate-500 shrink-0" />
                                        )}
                                        <span className="truncate">{opt}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Tipo 4: Texto livre */}
                              {campo.tipo === 'texto' && (
                                <input
                                  type="text"
                                  value={currentVal || ''}
                                  onChange={e => handleSetResposta(campo.id, e.target.value)}
                                  placeholder={campo.placeholder || `Informe sobre ${campo.pergunta.toLowerCase()}...`}
                                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Não Esqueça de Perguntar (Lembretes do Especialista) */}
                  {activeRoteiro.naoEsqueca && activeRoteiro.naoEsqueca.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        Não Esqueça de Perguntar / Investigar
                      </h5>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-amber-200/90">
                        {activeRoteiro.naoEsqueca.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Aviso de Segurança */}
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-white/5 text-[11px] text-slate-400 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>Em dúvida durante a anamnese, priorize a avaliação clínica e a segurança do paciente.</span>
                  </div>
                </div>

                {/* Live Resumo Preview & Ação */}
                <div className="p-4 sm:px-6 border-t border-white/10 bg-slate-950/70 shrink-0 space-y-3">
                  {resumoTexto && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Pré-visualização do Resumo Clínico em Texto Corrido
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 bg-white/5 border border-white/10 p-3 rounded-xl max-h-24 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                        {resumoTexto}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleTriggerInsert}
                      disabled={!resumoTexto.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      Inserir Resumo nos Sintomas Principais
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 text-slate-400">
                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-teal-400">
                  <ClipboardList className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-white">Selecione uma Queixa Principal à esquerda</h4>
                <p className="text-xs max-w-sm">
                  Escolha entre os 30 roteiros mapeados para carregar as perguntas certas e preencher a anamnese em minutos.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal de Confirmação: Substituir vs Concatenar */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-teal-500/40 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-bold text-white">O campo Sintomas Principais já possui texto</h4>
              <p className="text-xs text-slate-300">
                Como deseja aplicar o resumo gerado pelo roteiro no campo de sintomas da consulta?
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmAction('concatenar')}
                className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Concatenar (Adicionar ao final do texto atual)
              </button>

              <button
                type="button"
                onClick={() => handleConfirmAction('substituir')}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-rose-300 hover:text-rose-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Substituir todo o conteúdo anterior
              </button>

              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Voltar ao roteiro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
