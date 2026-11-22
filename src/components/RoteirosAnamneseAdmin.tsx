import { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, 
  Search, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  ChevronRight, 
  Layers,
  AlertTriangle
} from 'lucide-react';
import { 
  subscribeRoteirosAnamnese, 
  saveRoteiroAnamnese,
  type RoteiroAnamnese, 
  type AppUser 
} from '../services/dataService';
import { SEED_ROTEIROS_ANAMNESE } from '../data/seedRoteirosAnamnese';

interface RoteirosAnamneseAdminProps {
  userProfile?: AppUser | null;
}

export function RoteirosAnamneseAdmin({ userProfile: _userProfile }: RoteirosAnamneseAdminProps) {
  const [roteiros, setRoteiros] = useState<RoteiroAnamnese[]>([]);
  const [search, setSearch] = useState('');
  const [selectedRoteiro, setSelectedRoteiro] = useState<RoteiroAnamnese | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeRoteirosAnamnese((data) => {
      setRoteiros(data);
      if (data.length > 0 && !selectedRoteiro) {
        setSelectedRoteiro(data[0]);
      }
    });
    return () => unsub();
  }, []);

  const displayedList = useMemo(() => {
    const list = roteiros.length > 0 ? roteiros : SEED_ROTEIROS_ANAMNESE;
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(r => 
      r.nome.toLowerCase().includes(q) ||
      r.objetivo.toLowerCase().includes(q) ||
      (r.semiologia && r.semiologia.toLowerCase().includes(q))
    );
  }, [roteiros, search]);

  const handleRestaurarPadroes = async () => {
    if (!confirm('Deseja recarregar todos os 30 roteiros padrão de anamnese para a sua clínica?')) return;
    setIsResetting(true);
    try {
      for (const item of SEED_ROTEIROS_ANAMNESE) {
        await saveRoteiroAnamnese(item);
      }
      setToastMsg('Os 30 Roteiros de Anamnese foram sincronizados com sucesso!');
      setTimeout(() => setToastMsg(null), 4000);
    } catch (e) {
      console.error(e);
      alert('Erro ao sincronizar roteiros padrão.');
    } finally {
      setIsResetting(false);
    }
  };

  const activeR = selectedRoteiro || displayedList[0] || (SEED_ROTEIROS_ANAMNESE[0] as RoteiroAnamnese);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              Roteiros de Anamnese Guiada (30 Queixas Clínicas)
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Catálogo completo de questionários estruturados por queixa principal para preenchimento ágil durante a consulta e geração de resumo em texto fluído para a IA.
          </p>
        </div>

        <button
          type="button"
          disabled={isResetting}
          onClick={handleRestaurarPadroes}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Sincronizando...' : 'Recarregar 30 Roteiros Padrão'}</span>
        </button>
      </div>

      {toastMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Grid: Sidebar list + Detail Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filter & List */}
        <div className="lg:col-span-5 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar queixa ou objetivo clínico..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          {/* List of Complaints */}
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {displayedList.map(r => {
              const isSelected = activeR?.id === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRoteiro(r)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-teal-50/80 border-teal-300 ring-1 ring-teal-400'
                      : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <div className="space-y-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-teal-600 bg-teal-100/70 px-1.5 py-0.5 rounded">
                        #{r.ordem.toString().padStart(2, '0')}
                      </span>
                      <span className="text-xs font-bold text-slate-800 line-clamp-1">
                        {r.nome}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {r.objetivo}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <span>{r.secoes.length} seções</span>
                      {r.semiologia && (
                        <>
                          <span>•</span>
                          <span className="line-clamp-1 italic">{r.semiologia}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-teal-600' : 'text-slate-300'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detail & Section Breakdown */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          {activeR ? (
            <>
              {/* Header Roteiro */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono font-black text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg">
                    Roteiro #{activeR.ordem.toString().padStart(2, '0')}
                  </span>
                  {activeR.semiologia && (
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg italic">
                      {activeR.semiologia}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  {activeR.nome}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  <span className="font-bold text-slate-700">Objetivo Clínico:</span> {activeR.objetivo}
                </p>

                {activeR.naoEsqueca && activeR.naoEsqueca.length > 0 && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="text-[11px] font-bold text-amber-800 flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Não Esquecer (Pontos Críticos):
                    </div>
                    <ul className="text-[11px] text-amber-900 list-disc list-inside space-y-0.5">
                      {activeR.naoEsqueca.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Seções e Perguntas Estruturadas */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-teal-600" />
                  Estrutura de Perguntas e Campos ({activeR.secoes.length} Seções)
                </h4>

                <div className="space-y-3">
                  {activeR.secoes.map((sec, sIdx) => (
                    <div key={sIdx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 text-[10px] font-mono flex items-center justify-center font-black">
                            {sIdx + 1}
                          </span>
                          {sec.titulo}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {sec.campos.length} campos
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {sec.campos.map(c => (
                          <div key={c.id} className="bg-white p-2.5 rounded-xl border border-slate-200/70 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-700">{c.pergunta}</span>
                              <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                                {c.tipo}
                              </span>
                            </div>
                            {c.opcoes && c.opcoes.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {c.opcoes.map((op: string) => (
                                  <span key={op} className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                    {op}
                                  </span>
                                ))}
                              </div>
                            )}
                            {c.notaExplicativa && (
                              <p className="text-[10px] text-slate-400 italic">
                                Obs: {c.notaExplicativa}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Informação sobre o Resumo Determinístico */}
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-teal-900 leading-relaxed">
                  <span className="font-bold">Resumo Fluído Determinístico (Zero Gasto de Tokens):</span> Ao preencher este formulário durante a consulta, o motor inteligente transforma as respostas de checkboxes, seleções e notas em parágrafos médicos contínuos em português brasileiro natural, alimentando automaticamente os Sintomas Principais e o Prontuário para o Protocolo de IA.
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Selecione um roteiro na lista à esquerda para visualizar sua estrutura.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
