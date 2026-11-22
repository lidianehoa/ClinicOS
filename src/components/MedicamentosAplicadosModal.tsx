import React, { useState, useEffect } from 'react';
import {
  X,
  Syringe,
  CheckCircle2,
  Clock,
  Plus,
  Pill,
  FileSignature,
  ShieldAlert
} from 'lucide-react';
import {
  subscribeMedicamentosAplicados,
  saveMedicamentoAplicado,
  subscribeTermosAtendimento,
  type MedicamentoAplicado,
  type TermoAtendimento,
  type AppUser
} from '../services/dataService';

interface Props {
  atendimentoId: string;
  pacienteId?: string;
  pacienteNome?: string;
  userProfile?: AppUser | null;
  onClose: () => void;
  onOpenTermo?: (tipo: string) => void;
}

const VIAS = ['Intravenosa (IV)', 'Intramuscular (IM)', 'Subcutânea (SC)', 'Oral (VO)', 'Tópica', 'Inalatória', 'Epidural', 'Intra-articular'];

const MedicamentosAplicadosModal: React.FC<Props> = ({ 
  atendimentoId, 
  pacienteId, 
  pacienteNome, 
  userProfile, 
  onClose,
  onOpenTermo 
}) => {
  const [lista, setLista] = useState<MedicamentoAplicado[]>([]);
  const [termos, setTermos] = useState<TermoAtendimento[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [salvoSucesso, setSalvoSucesso] = useState(false);

  const [farmaco, setFarmaco] = useState('');
  const [dose, setDose] = useState('');
  const [via, setVia] = useState(VIAS[0]);
  const [horario, setHorario] = useState(() => new Date().toISOString().slice(0, 16));
  const [sedacao, setSedacao] = useState(false);

  useEffect(() => {
    const unsub = subscribeMedicamentosAplicados(atendimentoId, setLista);
    return () => unsub();
  }, [atendimentoId]);

  useEffect(() => {
    if (pacienteId) {
      const unsubTermos = subscribeTermosAtendimento(pacienteId, setTermos);
      return () => unsubTermos();
    }
  }, [pacienteId]);

  // Verifica se existe TCLE de Sedação gerado para este atendimento ou paciente
  const hasTcleSedacao = termos.some(
    t => t.tipo === 'tcle_sedacao' && (!t.atendimentoId || t.atendimentoId === atendimentoId)
  );

  const isSedacaoBloqueada = sedacao && !hasTcleSedacao;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmaco.trim() || !dose.trim()) return;

    if (isSedacaoBloqueada) {
      alert('Bloqueio Obrigatório: É necessário gerar o TCLE de Sedação antes de salvar a administração de fármacos sedativos.');
      return;
    }

    setSalvando(true);
    try {
      await saveMedicamentoAplicado({
        atendimentoId,
        farmaco: farmaco.trim(),
        dose: dose.trim(),
        viaAdministracao: via,
        horario: new Date(horario).toISOString(),
        envolveSedacao: sedacao,
        veterinarioNome: userProfile?.nome || ''
      });
      setFarmaco(''); setDose(''); setVia(VIAS[0]);
      setHorario(new Date().toISOString().slice(0, 16));
      setSedacao(false);
      setSalvoSucesso(true);
      setTimeout(() => setSalvoSucesso(false), 2500);
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar medicamento.');
    } finally {
      setSalvando(false);
    }
  };

  const fmtHora = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <Syringe className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Medicamentos Aplicados</h2>
              {pacienteNome && <p className="text-xs text-slate-500">Paciente: {pacienteNome}</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {lista.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registros neste Atendimento</span>
              <div className="space-y-2">
                {lista.map(m => (
                  <div key={m.id} className={`rounded-2xl border p-4 flex items-start gap-3 ${m.envolveSedacao ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${m.envolveSedacao ? 'bg-amber-100' : 'bg-teal-100'}`}>
                      <Pill className={`w-4 h-4 ${m.envolveSedacao ? 'text-amber-700' : 'text-teal-700'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800">{m.farmaco}</span>
                        <span className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-600">{m.dose}</span>
                        <span className="text-xs text-slate-500">{m.viaAdministracao}</span>
                        {m.envolveSedacao && (
                          <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">SEDAÇÃO</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{fmtHora(m.horario)}</span>
                        {m.veterinarioNome && <span className="ml-2">· {m.veterinarioNome}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSalvar} className="space-y-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Registrar Novo Medicamento
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Fármaco / Produto *</label>
                <input required type="text" value={farmaco} onChange={e => setFarmaco(e.target.value)}
                  placeholder="Ex: Propofol, Acepromazina, Tramadol, Dipirona..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Dose *</label>
                <input required type="text" value={dose} onChange={e => setDose(e.target.value)}
                  placeholder="Ex: 5 mg/kg, 0.5 mL"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Via de Administração</label>
                <select value={via} onChange={e => setVia(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                  {VIAS.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Horário de Aplicação</label>
                <input type="datetime-local" value={horario} onChange={e => setHorario(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <div>
                    <p className="text-sm font-bold text-slate-700">Envolve Sedação / Anestesia?</p>
                    <p className="text-xs text-slate-500 mt-0.5">Marque quando houver uso de agentes sedativos, anestésicos ou tranquilizantes.</p>
                  </div>
                  <button type="button" onClick={() => setSedacao(v => !v)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${sedacao ? 'bg-amber-500' : 'bg-slate-200'}`}>
                    <span className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ${sedacao ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {sedacao && !hasTcleSedacao && (
                  <div className="mt-3 bg-red-50 border-2 border-red-300 rounded-2xl p-4 animate-in fade-in duration-200 space-y-3">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-900">TCLE de Sedação Não Encontrado (Bloqueio Regulatório)</p>
                        <p className="text-xs text-red-700 mt-1 leading-relaxed">
                          O registro de sedação está <strong>bloqueado</strong> até que o Termo de Consentimento Livre e Esclarecido (TCLE) de Sedação seja gerado para este paciente.
                        </p>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenTermo?.('tcle_sedacao')}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <FileSignature className="w-4 h-4" />
                        Gerar TCLE de Sedação Agora
                      </button>
                    </div>
                  </div>
                )}

                {sedacao && hasTcleSedacao && (
                  <div className="mt-3 flex items-start gap-3 bg-emerald-50 border border-emerald-300 rounded-2xl p-4 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-emerald-900">TCLE de Sedação Localizado</p>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Termo de Sedação e Fluidoterapia gerado para o paciente. Registro de sedação liberado para gravação.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {salvoSucesso && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Medicamento registrado com sucesso!
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-sm">
                Fechar
              </button>
              <button 
                type="submit" 
                disabled={salvando || isSedacaoBloqueada}
                title={isSedacaoBloqueada ? 'Gere o TCLE de Sedação para desbloquear' : ''}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm shadow-teal-600/20 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Syringe className="w-4 h-4" />
                {salvando ? 'Registrando...' : 'Registrar Medicamento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MedicamentosAplicadosModal;
