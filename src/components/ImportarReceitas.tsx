import { useState } from 'react';
import { doc, getDocs, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FileText, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { db, storage } from '../services/firebase';
import { receitasCol, responsaveisCol, pacientesCol, getActiveTenantId } from '../services/dataService';

/**
 * Importa receitas emitidas fora do ClinicOS (AtendVet, PDFs próprios) para o histórico
 * (formato "clinicos-receitas-v1"). Elas entram com status "importada": aparecem no Histórico
 * com o PDF original, mas não passam pelo fluxo de assinatura/dispensação do ClinicOS.
 * IDs fixos: importar de novo não duplica.
 */

interface ItemArq { produto: string; quantidade?: string; posologia: string }
interface ReceitaArq {
  id: string;
  data: string;                 // AAAA-MM-DD
  pacienteNome: string;
  especie?: string;
  raca?: string;
  sexo?: string;
  idade?: string;
  peso?: string;
  tutorNome: string;
  tutorTelefone?: string;
  itens: ItemArq[];
  orientacoes?: string[];
  controlado?: boolean;
  origem?: string;
  token?: string;
  assinadaICP?: boolean;
  arquivoPdf?: string;          // nome do PDF que acompanha
  pacienteId?: string;          // ID do paciente no ClinicOS, quando já se sabe
  tutorId?: string;             // ID do tutor no ClinicOS, quando já se sabe
}

const normal = (s: string) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const primeiro = (s: string) => normal(s).split(' ')[0] || '';
const dataBR = (iso: string) => iso.split('-').reverse().join('/');

export default function ImportarReceitas() {
  const [receitas, setReceitas] = useState<ReceitaArq[] | null>(null);
  const [pdfs, setPdfs] = useState<Map<string, File>>(new Map());
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState('');
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState('');

  const lerJson = async (file: File | null) => {
    setErro(''); setResultado(''); setReceitas(null);
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (d?.formato !== 'clinicos-receitas-v1' || !Array.isArray(d.receitas)) throw new Error();
      setReceitas(d.receitas);
    } catch {
      setErro('Arquivo inválido. Use o arquivo de receitas gerado para o ClinicOS (.json).');
    }
  };

  const lerPdfs = (files: FileList | null) => {
    const m = new Map<string, File>();
    Array.from(files || []).forEach(f => m.set(f.name, f));
    setPdfs(m);
  };

  const importar = async () => {
    if (!receitas || !db) return;
    setImportando(true); setErro(''); setResultado('');
    try {
      const tenantId = getActiveTenantId();
      const tutores = (await getDocs(responsaveisCol())).docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const pacientes = (await getDocs(pacientesCol())).docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      let criados = 0, comPdf = 0, n = 0;

      for (const r of receitas) {
        n++;
        setProgresso(`Importando ${n} de ${receitas.length}: ${r.pacienteNome}`);

        // 1º: IDs informados no arquivo
        let tutor: any = r.tutorId ? tutores.find(t => t.id === r.tutorId) : undefined;
        let paciente: any = r.pacienteId ? pacientes.find(p => p.id === r.pacienteId) : undefined;
        if (paciente) {
          const ajustes: Record<string, any> = {};
          // Nome provisório ("[COMPLETAR nome]") vira o nome da receita
          if (String(paciente.nome || '').includes('[COMPLETAR')) { ajustes.nome = r.pacienteNome; paciente.nome = r.pacienteNome; }
          if (tutor && paciente.tutorId !== tutor.id) { ajustes.tutorId = tutor.id; paciente.tutorId = tutor.id; }
          if (Object.keys(ajustes).length) await setDoc(doc(pacientesCol(), paciente.id), ajustes, { merge: true });
          if (!tutor) {
            tutor = tutores.find(t => t.id === paciente.tutorId);
            if (tutor && String(tutor.nomeCompleto || '').includes('[COMPLETAR')) {
              await setDoc(doc(responsaveisCol(), tutor.id), { nomeCompleto: r.tutorNome, ...(r.tutorTelefone ? { telefone: r.tutorTelefone } : {}) }, { merge: true });
              tutor.nomeCompleto = r.tutorNome;
            }
          }
        }

        // 2º: pelo nome. Tutor: nome igual, ou mesmo primeiro nome com o restante batendo pelo começo
        if (!tutor) tutor = tutores.find(t => normal(t.nomeCompleto || t.nome) === normal(r.tutorNome))
          || tutores.find(t => {
            const a = normal(t.nomeCompleto || t.nome), b = normal(r.tutorNome);
            return primeiro(a) === primeiro(b) && (a.startsWith(b) || b.startsWith(a));
          });
        // Paciente: mesmo nome e do mesmo tutor; sem tutor, só se houver um único paciente com esse nome
        if (!paciente) {
          const mesmos = pacientes.filter(p => normal(p.nome) === normal(r.pacienteNome));
          paciente = tutor ? mesmos.find(p => p.tutorId === tutor.id) : (mesmos.length === 1 ? mesmos[0] : undefined);
        }

        if (!tutor && paciente?.tutorId) tutor = tutores.find(t => t.id === paciente.tutorId);
        if (!tutor) {
          const id = `resp_rec_${r.id}`;
          tutor = { id, nomeCompleto: r.tutorNome, telefone: r.tutorTelefone || '' };
          await setDoc(doc(responsaveisCol(), id), {
            id, nomeCompleto: r.tutorNome, telefone: r.tutorTelefone || '', tenantId,
            criadoEm: new Date().toISOString(), origemImportacao: 'receitas',
          }, { merge: true });
          tutores.push(tutor);
          criados++;
        }
        if (!paciente) {
          const id = `pac_rec_${r.id}`;
          paciente = { id, nome: r.pacienteNome, tutorId: tutor.id };
          await setDoc(doc(pacientesCol(), id), {
            id, nome: r.pacienteNome, tutorId: tutor.id, especie: r.especie || '', raca: r.raca || '', sexo: r.sexo || '',
            tenantId, criadoEm: new Date().toISOString(), origemImportacao: 'receitas',
          }, { merge: true });
          pacientes.push(paciente);
          criados++;
        }

        let pdfUrl: string | undefined;
        const arquivo = r.arquivoPdf ? pdfs.get(r.arquivoPdf) : undefined;
        if (arquivo && storage) {
          const caminho = `clinicas/${tenantId}/receitas_importadas/${r.id}.pdf`;
          const sref = ref(storage, caminho);
          await uploadBytes(sref, arquivo, { contentType: 'application/pdf' });
          pdfUrl = await getDownloadURL(sref);
          comPdf++;
        }

        const conteudo = [
          ...r.itens.map((it, i) => `${i + 1}. ${it.produto}${it.quantidade ? ` — ${it.quantidade}` : ''}\n   ${it.posologia}`),
          ...(r.orientacoes?.length ? ['', 'Orientações:', ...r.orientacoes.map(o => `• ${o}`)] : []),
        ].join('\n');
        const criadoEm = new Date(r.data + 'T12:00:00').toISOString();
        const validade = new Date(r.data + 'T12:00:00'); validade.setDate(validade.getDate() + 30);

        const dados: Record<string, any> = {
          id: r.id,
          codigoVerificacao: `IMP-${r.id.slice(-8).toUpperCase()}`,
          tokenDispensacao: '',
          tenantId,
          pacienteId: paciente.id,
          tipo: 'receita_simples',
          subtipo: r.controlado ? 'controle_especial' : 'simples',
          status: 'importada',
          statusDispensacao: 'nao_dispensada',
          veterinarioId: '',
          veterinarioNome: 'Lidiane Helena Oliveira de Almeida',
          veterinarioCrmv: '9909/MS',
          pacienteNome: r.pacienteNome,
          pacienteEspecie: r.especie || '',
          pacienteRaca: r.raca || '',
          pacienteIdade: r.idade || '',
          pacientePeso: r.peso || '',
          tutorNome: r.tutorNome,
          tutorTelefone: r.tutorTelefone || '',
          itens: r.itens.map((it, i) => ({
            id: `${r.id}_${i + 1}`, produto: it.produto, quantidadePrescrita: 1, unidade: '',
            quantidadeExtenso: it.quantidade || '', posologia: it.posologia,
          })),
          orientacoes: r.orientacoes || [],
          conteudoPrescricao: conteudo,
          baseLegal: 'Receita emitida fora do ClinicOS e importada para o histórico.',
          isControlado: !!r.controlado,
          validadeDias: 30,
          validadeAte: validade.toISOString().slice(0, 10),
          versao: 1,
          criadoEm,
          atualizadoEm: new Date().toISOString(),
          origemExterna: r.origem || 'Importada',
          assinadaExternamente: !!r.assinadaICP,
        };
        if (r.token) dados.tokenExterno = r.token;
        if (pdfUrl) dados.pdfImportadoUrl = pdfUrl;
        await setDoc(doc(receitasCol(), r.id), dados, { merge: true });
      }

      setResultado(`${receitas.length} receitas importadas, ${comPdf} com o PDF original.` +
        (criados ? ` ${criados} cadastro(s) de tutor ou paciente foram criados porque não existiam.` : ''));
    } catch (e: any) {
      console.error('Importar receitas:', e);
      setErro('Não foi possível importar: ' + (e?.message || 'erro desconhecido'));
    } finally {
      setImportando(false); setProgresso('');
    }
  };

  const faltando = receitas?.filter(r => r.arquivoPdf && !pdfs.has(r.arquivoPdf)) || [];

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-teal-50 rounded-xl text-teal-700"><FileText className="w-6 h-6" /></div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Importar receitas (JSON + PDFs)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Receitas emitidas em outro sistema entram no Histórico do paciente, com o PDF original. Importar de novo não duplica.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl p-5 cursor-pointer hover:border-teal-400 text-sm text-slate-600 text-center">
          <Upload className="w-4 h-4 shrink-0" /> {receitas ? `${receitas.length} receitas no arquivo` : '1. Arquivo de receitas (.json)'}
          <input type="file" accept=".json,application/json" className="hidden" onChange={e => lerJson(e.target.files?.[0] || null)} />
        </label>
        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl p-5 cursor-pointer hover:border-teal-400 text-sm text-slate-600 text-center">
          <Upload className="w-4 h-4 shrink-0" /> {pdfs.size ? `${pdfs.size} PDF(s) escolhidos` : '2. Os PDFs das receitas (pode escolher vários)'}
          <input type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={e => lerPdfs(e.target.files)} />
        </label>
      </div>

      {receitas && (
        <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 max-h-64 overflow-y-auto divide-y divide-slate-200">
          {receitas.map(r => (
            <div key={r.id} className="py-1.5 flex justify-between gap-3">
              <span><strong>{r.pacienteNome}</strong> · {r.tutorNome} · {dataBR(r.data)}{r.controlado ? ' · controle especial' : ''}</span>
              <span className={`text-xs whitespace-nowrap ${r.arquivoPdf ? (pdfs.has(r.arquivoPdf) ? 'text-teal-700' : 'text-amber-600') : 'text-slate-400'}`}>
                {r.arquivoPdf ? (pdfs.has(r.arquivoPdf) ? 'PDF ok' : 'falta o PDF') : 'sem PDF'}
              </span>
            </div>
          ))}
        </div>
      )}
      {faltando.length > 0 && (
        <p className="text-xs text-amber-700">Faltam {faltando.length} PDF(s): {faltando.map(f => f.arquivoPdf).join(', ')}. Dá para importar assim mesmo; essas entram sem o PDF.</p>
      )}

      {erro && <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}</div>}
      {resultado && <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> {resultado}</div>}
      {progresso && <p className="text-sm text-slate-500">{progresso}</p>}

      <button type="button" disabled={!receitas || importando} onClick={importar}
        className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl py-3 text-sm disabled:opacity-50">
        {importando ? 'Importando…' : 'Importar receitas'}
      </button>
    </div>
  );
}
