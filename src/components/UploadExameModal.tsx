import React, { useState } from 'react';
import { X, Upload, File as FileIcon, Loader2, Building2, Trash2 } from 'lucide-react';
import { Exame } from '../services/dataService';
import { salvarExameComArquivos } from '../services/examesService';

/**
 * Anexar exame ao prontuário: um ou mais arquivos (PDF, fotos), sem análise por IA.
 */
interface UploadExameModalProps {
  clientId: string;
  onClose: () => void;
  /** Chamado com o exame salvo (ex.: para vincular na evolução) */
  onSaved?: (exame: Exame) => void;
}

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function SeletorArquivos({ arquivos, setArquivos, escuro }: { arquivos: File[]; setArquivos: (f: File[]) => void; escuro?: boolean }) {
  const [arrastando, setArrastando] = useState(false);
  const adicionar = (lista: FileList | null) => {
    if (!lista) return;
    const novos = Array.from(lista).filter(f => f.size <= 20 * 1024 * 1024);
    if (novos.length < lista.length) alert('Arquivos acima de 20 MB foram ignorados.');
    setArquivos([...arquivos, ...novos]);
  };
  const base = escuro
    ? 'border-white/20 bg-white/5 text-white/70 hover:border-amber-400'
    : 'border-amber-300 bg-amber-50/40 text-slate-600 hover:border-amber-500';
  return (
    <div className="space-y-2">
      <label
        onDragOver={e => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={e => { e.preventDefault(); setArrastando(false); adicionar(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-2xl p-5 cursor-pointer text-center transition-colors ${base} ${arrastando ? 'border-amber-500' : ''}`}
      >
        <Upload className="w-6 h-6 text-amber-500" />
        <span className="text-sm font-semibold">Clique ou arraste os arquivos</span>
        <span className="text-[11px] opacity-70">PDF, JPG ou PNG, até 20 MB cada. Pode escolher vários de uma vez.</span>
        <input type="file" multiple accept="application/pdf,image/*" className="hidden"
          onChange={e => { adicionar(e.target.files); e.target.value = ''; }} />
      </label>
      {arquivos.length > 0 && (
        <div className="space-y-1">
          {arquivos.map((f, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${escuro ? 'bg-white/5 text-white/80' : 'bg-slate-50 text-slate-700'}`}>
              <FileIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="flex-1 truncate">{f.name}</span>
              <span className="opacity-60">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
              <button type="button" onClick={() => setArquivos(arquivos.filter((_, j) => j !== i))} className="p-1 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const UploadExameModal: React.FC<UploadExameModalProps> = ({ clientId, onClose, onSaved }) => {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [tipoExame, setTipoExame] = useState('');
  const [dataExame, setDataExame] = useState(hojeISO());
  const [laboratorio, setLaboratorio] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isEncaminhamento, setIsEncaminhamento] = useState(false);
  const [clinicaOrigem, setClinicaOrigem] = useState('');
  const [crmvOrigem, setCrmvOrigem] = useState('');
  const [motivoEncaminhamento, setMotivoEncaminhamento] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    setErro('');
    if (!tipoExame.trim()) return setErro('Diga qual é o exame (ex.: Hemograma + bioquímico).');
    if (!arquivos.length) return setErro('Escolha pelo menos um arquivo.');
    if (isEncaminhamento && !clinicaOrigem.trim()) return setErro('Informe a clínica ou o veterinário de origem.');
    setEnviando(true);
    try {
      const exame = await salvarExameComArquivos(clientId, arquivos, {
        tipo: tipoExame, dataExame, laboratorio, observacoes,
        encaminhamento: isEncaminhamento ? { clinicaOrigem, crmvOrigem, motivoEncaminhamento } : undefined,
      }, setProgresso);
      onSaved?.(exame);
      onClose();
    } catch (e: any) {
      console.error('Enviar exame:', e);
      setErro('Não foi possível enviar: ' + (e?.message || 'erro desconhecido'));
      setEnviando(false);
    }
  };

  const campo = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Anexar exame</h2>
            <p className="text-sm text-slate-500">Um ou mais arquivos ficam guardados no prontuário do paciente.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <label className="block text-sm font-bold text-slate-700">Exame *
            <input value={tipoExame} onChange={e => setTipoExame(e.target.value)} className={campo + ' mt-1 font-normal'} placeholder="Ex.: Hemograma + bioquímico, Ultrassom abdominal" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-bold text-slate-700">Data do exame
              <input type="date" value={dataExame} onChange={e => setDataExame(e.target.value)} className={campo + ' mt-1 font-normal'} />
            </label>
            <label className="block text-sm font-bold text-slate-700">Laboratório / local
              <input value={laboratorio} onChange={e => setLaboratorio(e.target.value)} className={campo + ' mt-1 font-normal'} placeholder="Opcional" />
            </label>
          </div>
          <label className="block text-sm font-bold text-slate-700">Observações
            <textarea rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} className={campo + ' mt-1 font-normal resize-none'} placeholder="Opcional: achados principais, jejum, etc." />
          </label>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-bold text-slate-700">Veio de outra clínica / veterinário?</span>
              </div>
              <button type="button" onClick={() => setIsEncaminhamento(!isEncaminhamento)}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${isEncaminhamento ? 'bg-amber-500' : 'bg-slate-300'}`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition mt-0.5 ${isEncaminhamento ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {isEncaminhamento && (
              <div className="grid grid-cols-2 gap-2">
                <input value={clinicaOrigem} onChange={e => setClinicaOrigem(e.target.value)} className={campo + ' col-span-2'} placeholder="Clínica / veterinário de origem *" />
                <input value={crmvOrigem} onChange={e => setCrmvOrigem(e.target.value)} className={campo} placeholder="CRMV (opcional)" />
                <input value={motivoEncaminhamento} onChange={e => setMotivoEncaminhamento(e.target.value)} className={campo} placeholder="Motivo (opcional)" />
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-1">Arquivos *</p>
            <SeletorArquivos arquivos={arquivos} setArquivos={setArquivos} />
          </div>

          {erro && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{erro}</p>}
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} disabled={enviando} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
          <button onClick={salvar} disabled={enviando}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl flex items-center gap-2 disabled:opacity-50">
            {enviando ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando… {progresso}%</> : <><Upload className="w-4 h-4" /> Salvar exame</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadExameModal;
