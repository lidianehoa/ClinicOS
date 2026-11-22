import { useState } from 'react';
import { doc, getDocs, writeBatch } from 'firebase/firestore';
import { FileJson, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { db } from '../services/firebase';
import { responsaveisCol, pacientesCol, consultasClinicasCol, getActiveTenantId } from '../services/dataService';

/**
 * Importa prontuários (tutores, pacientes e consultas) de um arquivo JSON no formato
 * "clinicos-prontuarios-v1".
 *
 * - Não duplica: se já existir tutor com o mesmo nome, ou pet com o mesmo nome no mesmo tutor,
 *   o registro existente é reaproveitado e só as consultas novas entram.
 * - Pode rodar de novo com o mesmo arquivo: os IDs das consultas são fixos.
 */

interface Arquivo {
  formato: string;
  responsaveis: any[];
  pacientes: any[];
  consultas: any[];
}

const normal = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export default function ImportarProntuarios() {
  const [arquivo, setArquivo] = useState<Arquivo | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState('');
  const [importando, setImportando] = useState(false);

  const ler = async (file: File | null) => {
    setErro('');
    setResultado('');
    setArquivo(null);
    if (!file) return;
    try {
      const dados = JSON.parse(await file.text());
      if (dados?.formato !== 'clinicos-prontuarios-v1') throw new Error('formato');
      if (!Array.isArray(dados.responsaveis) || !Array.isArray(dados.pacientes) || !Array.isArray(dados.consultas)) {
        throw new Error('formato');
      }
      setArquivo(dados);
      setNomeArquivo(file.name);
    } catch {
      setErro('Arquivo inválido. Use o arquivo de prontuários gerado para o ClinicOS (.json).');
    }
  };

  const importar = async () => {
    if (!arquivo || !db) return;
    setImportando(true);
    setErro('');
    try {
      const tenantId = getActiveTenantId();
      const agora = new Date().toISOString();

      // Registros que já existem na clínica
      const respExistentes = (await getDocs(responsaveisCol())).docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const petsExistentes = (await getDocs(pacientesCol())).docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      const mapaResp = new Map<string, string>(); // id do arquivo -> id final
      const mapaPet = new Map<string, string>();
      let novosResp = 0, novosPets = 0, reaproveitados = 0;

      const lotes: ReturnType<typeof writeBatch>[] = [writeBatch(db)];
      let ops = 0;
      const gravar = (ref: any, dados: any) => {
        if (ops >= 450) { lotes.push(writeBatch(db!)); ops = 0; }
        lotes[lotes.length - 1].set(ref, dados, { merge: true });
        ops++;
      };

      for (const r of arquivo.responsaveis) {
        const existente = respExistentes.find(e => e.id === r.id || normal(e.nomeCompleto) === normal(r.nomeCompleto));
        if (existente && existente.id !== r.id) {
          mapaResp.set(r.id, existente.id);
          reaproveitados++;
          continue;
        }
        mapaResp.set(r.id, r.id);
        if (!existente) novosResp++;
        gravar(doc(responsaveisCol(), r.id), {
          ...r,
          criadoEm: existente?.criadoEm || agora,
          tenantId,
          origem: 'Importação de prontuários',
        });
      }

      for (const p of arquivo.pacientes) {
        const tutorId = mapaResp.get(p.tutorId) || p.tutorId;
        const existente = petsExistentes.find(
          e => e.id === p.id || (e.tutorId === tutorId && normal(e.nome) === normal(p.nome))
        );
        if (existente && existente.id !== p.id) {
          mapaPet.set(p.id, existente.id);
          reaproveitados++;
          continue;
        }
        mapaPet.set(p.id, p.id);
        if (!existente) novosPets++;
        gravar(doc(pacientesCol(), p.id), {
          ...p,
          tutorId,
          peso: Number(p.peso) || 0,
          criadoEm: existente?.criadoEm || agora,
          tenantId,
        });
      }

      for (const c of arquivo.consultas) {
        gravar(doc(consultasClinicasCol(), c.id), {
          ...c,
          pacienteId: mapaPet.get(c.pacienteId) || c.pacienteId,
          tutorId: mapaResp.get(c.tutorId) || c.tutorId,
          peso: Number(c.peso) || 0,
          criadoEm: c.criadoEm || (c.data ? new Date(c.data + 'T12:00:00').toISOString() : agora),
          importadoEm: agora,
          origemImportacao: 'conversas-claude',
        });
      }

      for (const lote of lotes) await lote.commit();

      setResultado(
        `Importação concluída: ${novosResp} tutores novos, ${novosPets} pacientes novos e ` +
          `${arquivo.consultas.length} consultas. ${reaproveitados} cadastros já existiam e foram aproveitados.`
      );
    } catch (e: any) {
      console.error('Importar prontuários:', e);
      setErro('Não foi possível importar: ' + (e?.message || 'erro desconhecido'));
    } finally {
      setImportando(false);
    }
  };

  const completar = arquivo
    ? JSON.stringify([...arquivo.responsaveis, ...arquivo.pacientes, ...arquivo.consultas]).split('[COMPLETAR').length - 1
    : 0;

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-teal-50 rounded-xl text-teal-700">
          <FileJson className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Importar prontuários (JSON)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Cria tutores, pacientes e o histórico de consultas. Cadastros com o mesmo nome são aproveitados, sem duplicar.
          </p>
        </div>
      </div>

      <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl p-6 cursor-pointer hover:border-teal-400 text-sm text-slate-600">
        <Upload className="w-4 h-4" />
        {nomeArquivo || 'Escolher arquivo de prontuários (.json)'}
        <input type="file" accept="application/json,.json" className="hidden" onChange={e => ler(e.target.files?.[0] || null)} />
      </label>

      {arquivo && (
        <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 space-y-2">
          <p>
            <strong>{arquivo.responsaveis.length}</strong> tutores · <strong>{arquivo.pacientes.length}</strong> pacientes ·{' '}
            <strong>{arquivo.consultas.length}</strong> consultas
          </p>
          <p className="text-xs text-slate-500">
            {arquivo.pacientes.map(p => p.nome).join(', ')}
          </p>
          {completar > 0 && (
            <p className="text-xs text-pink-800 bg-pink-50 rounded-lg p-2">
              {completar} campos marcados com [COMPLETAR] (nomes ou dados que não foram informados). Eles entram assim e podem ser
              editados depois em Responsáveis e Animais.
            </p>
          )}
        </div>
      )}

      {erro && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}
        </div>
      )}
      {resultado && (
        <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> {resultado}
        </div>
      )}

      <button
        type="button"
        disabled={!arquivo || importando}
        onClick={importar}
        className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl py-3 text-sm disabled:opacity-50"
      >
        {importando ? 'Importando...' : 'Importar prontuários'}
      </button>
    </div>
  );
}
