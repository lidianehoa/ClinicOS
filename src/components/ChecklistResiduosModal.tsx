import React, { useState, useEffect } from 'react';
import {
  X,
  Recycle,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Save
} from 'lucide-react';
import {
  subscribeChecklistResiduos,
  saveChecklistResiduos,
  type ChecklistResiduos,
  type GrupoResiduos,
  type AppUser
} from '../services/dataService';

interface Props {
  atendimentoId: string;
  pacienteNome?: string;
  userProfile?: AppUser | null;
  onClose: () => void;
}

const GRUPOS: Array<{ key: 'grupoA' | 'grupoB' | 'grupoE'; label: string; descricao: string; cor: string }> = [
  {
    key: 'grupoA',
    label: 'Grupo A — Biológicos',
    descricao: 'Sangue, tecidos, materiais contaminados com fluidos biológicos (curativos, gazes, algodão).',
    cor: 'red'
  },
  {
    key: 'grupoB',
    label: 'Grupo B — Químicos',
    descricao: 'Resíduos de medicamentos, produtos químicos, reagentes, solventes e frascos contaminados.',
    cor: 'orange'
  },
  {
    key: 'grupoE',
    label: 'Grupo E — Perfurocortantes',
    descricao: 'Agulhas, seringas com agulha acoplada, scalp, lâminas de bisturi, ampolas de vidro quebradas.',
    cor: 'yellow'
  }
];

const corMap = {
  red: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' }
};

const defaultGrupo = (): GrupoResiduos => ({ gerado: false, itens: '', segregacaoConfirmada: false });

const ChecklistResiduosModal: React.FC<Props> = ({ atendimentoId, pacienteNome, userProfile, onClose }) => {
  const [historico, setHistorico] = useState<ChecklistResiduos[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [salvoSucesso, setSalvoSucesso] = useState(false);

  const [grupoA, setGrupoA] = useState<GrupoResiduos>(defaultGrupo());
  const [grupoB, setGrupoB] = useState<GrupoResiduos>(defaultGrupo());
  const [grupoE, setGrupoE] = useState<GrupoResiduos>(defaultGrupo());
  const [residuosNoVeiculoConfirmado, setResiduosNoVeiculoConfirmado] = useState(false);
  const [destinoFinal, setDestinoFinal] = useState('');
  const [preenchidoPor, setPreenchidoPor] = useState(userProfile?.crmv ? `${userProfile.nome} — CRMV ${userProfile.crmv}` : userProfile?.nome || '');

  useEffect(() => {
    const unsub = subscribeChecklistResiduos(atendimentoId, setHistorico);
    return () => unsub();
  }, [atendimentoId]);

  const updateGrupo = (
    setter: React.Dispatch<React.SetStateAction<GrupoResiduos>>,
    field: keyof GrupoResiduos,
    value: boolean | string
  ) => setter(prev => ({ ...prev, [field]: value }));

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await saveChecklistResiduos({
        atendimentoId,
        grupoA, grupoB, grupoE,
        residuosNoVeiculoConfirmado,
        destinoFinal: destinoFinal.trim(),
        preenchidoPor: preenchidoPor.trim(),
        dataHora: new Date().toISOString()
      });
      setSalvoSucesso(true);
      setTimeout(() => setSalvoSucesso(false), 3000);
      setGrupoA(defaultGrupo()); setGrupoB(defaultGrupo()); setGrupoE(defaultGrupo());
      setResiduosNoVeiculoConfirmado(false);
      setDestinoFinal('');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar checklist.');
    } finally {
      setSalvando(false);
    }
  };

  const fmtData = (iso: string) => {
    try { return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
    catch { return iso; }
  };

  const grupoSetters: Record<string, React.Dispatch<React.SetStateAction<GrupoResiduos>>> = {
    grupoA: setGrupoA, grupoB: setGrupoB, grupoE: setGrupoE
  };
  const grupoValues: Record<string, GrupoResiduos> = { grupoA, grupoB, grupoE };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Recycle className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Checklist de Resíduos — PGRSS</h2>
              <p className="text-[10px] text-slate-400">Res. CFMV 1.374/2020 · RDC ANVISA 222/2018{pacienteNome ? ` · ${pacienteNome}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          
          {/* Histórico */}
          {historico.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700 uppercase">Checklist já registrado neste atendimento</span>
              </div>
              {historico.map(h => (
                <div key={h.id} className="text-xs text-emerald-700 bg-white rounded-xl px-3 py-2 border border-emerald-200 flex items-center justify-between">
                  <span>Preenchido por: {h.preenchidoPor}</span>
                  <span className="text-slate-400">{fmtData(h.dataHora)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Grupos */}
          {GRUPOS.map(g => {
            const val = grupoValues[g.key];
            const setter = grupoSetters[g.key];
            const c = corMap[g.cor as keyof typeof corMap];
            return (
              <div key={g.key} className={`rounded-2xl border p-4 space-y-3 ${val.gerado ? `${c.bg} ${c.border}` : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${val.gerado ? c.dot : 'bg-slate-300'}`} />
                    <span className="text-sm font-bold text-slate-800">{g.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{val.gerado ? 'Gerado' : 'Não gerado'}</span>
                    <button
                      type="button"
                      onClick={() => updateGrupo(setter, 'gerado', !val.gerado)}
                      className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${val.gerado ? `bg-${g.cor}-500` : 'bg-slate-200'}`}
                      style={{ backgroundColor: val.gerado ? (g.cor === 'red' ? '#ef4444' : g.cor === 'orange' ? '#f97316' : '#eab308') : '' }}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${val.gerado ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{g.descricao}</p>

                {val.gerado && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Itens Gerados</label>
                      <textarea
                        rows={2}
                        value={val.itens}
                        onChange={e => updateGrupo(setter, 'itens', e.target.value)}
                        placeholder="Descreva os resíduos gerados neste grupo..."
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs resize-none focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div
                        onClick={() => updateGrupo(setter, 'segregacaoConfirmada', !val.segregacaoConfirmada)}
                        className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${val.segregacaoConfirmada ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'}`}
                      >
                        {val.segregacaoConfirmada && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-xs font-medium text-slate-700">Segregação correta confirmada</span>
                    </label>
                  </div>
                )}
              </div>
            );
          })}

          {/* Destino Final */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Destino Final dos Resíduos</label>
            <input
              type="text"
              value={destinoFinal}
              onChange={e => setDestinoFinal(e.target.value)}
              placeholder="Ex: Empresa coletora XYZ, clínica parceira, unidade de tratamento..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          {/* Confirmação de resíduos no veículo */}
          <div className={`rounded-2xl border p-4 flex items-start gap-3 ${residuosNoVeiculoConfirmado ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${residuosNoVeiculoConfirmado ? 'text-emerald-600' : 'text-amber-500'}`} />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">Confirmação de Acondicionamento no Veículo</p>
              <p className="text-xs text-slate-600 mt-0.5">Confirmo que todos os resíduos foram corretamente acondicionados e não permaneceram no veículo ao final da jornada de atendimentos.</p>
            </div>
            <button
              type="button"
              onClick={() => setResiduosNoVeiculoConfirmado(v => !v)}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${residuosNoVeiculoConfirmado ? 'bg-emerald-500' : 'bg-slate-200'}`}
            >
              <span className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ${residuosNoVeiculoConfirmado ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Preenchido por */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Preenchido por (nome e CRMV)</label>
            <input
              type="text"
              value={preenchidoPor}
              onChange={e => setPreenchidoPor(e.target.value)}
              placeholder="Dr(a). Nome — CRMV/UF 00000"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          {/* Sucesso */}
          {salvoSucesso && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Checklist de resíduos registrado com sucesso!
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-sm">
              Fechar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm shadow-emerald-600/20 flex items-center gap-2 transition-all disabled:opacity-50 text-sm"
            >
              <Save className="w-4 h-4" />
              {salvando ? 'Salvando...' : 'Salvar Checklist'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistResiduosModal;
