import { useState } from 'react';
import { doc, getDocs, writeBatch } from 'firebase/firestore';
import { Wallet, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { db } from '../services/firebase';
import {
  contasReceberCol,
  contasPagarCol,
  categoriasFinanceirasCol,
  responsaveisCol,
  getActiveTenantId,
} from '../services/dataService';

/**
 * Importa lançamentos financeiros já realizados (formato "clinicos-financeiro-v1"):
 * - contasReceber: recebimentos de consultas (status "recebido")
 * - contasPagar: custos do atendimento (status "pago")
 * - categorias: categorias financeiras de receita e despesa
 *
 * Os IDs são fixos, então importar o mesmo arquivo de novo não duplica nada.
 * O nome do pagador vem do extrato do banco, muitas vezes cortado ("Aparecida Anquita Bor").
 * Quando ele bate com o começo do nome de um tutor cadastrado, o recebimento fica ligado ao tutor.
 */

interface Arquivo {
  formato: string;
  categorias: { id: string; nome: string; tipo: 'receita' | 'despesa'; cor?: string }[];
  contasReceber: any[];
  contasPagar: any[];
}

const normal = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ImportarFinanceiro() {
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
      if (dados?.formato !== 'clinicos-financeiro-v1') throw new Error('formato');
      if (!Array.isArray(dados.contasReceber) || !Array.isArray(dados.contasPagar) || !Array.isArray(dados.categorias)) {
        throw new Error('formato');
      }
      setArquivo(dados);
      setNomeArquivo(file.name);
    } catch {
      setErro('Arquivo inválido. Use o arquivo financeiro gerado para o ClinicOS (.json).');
    }
  };

  const importar = async () => {
    if (!arquivo || !db) return;
    setImportando(true);
    setErro('');
    try {
      const tenantId = getActiveTenantId();
      const agora = new Date().toISOString();

      // Tutores cadastrados, para ligar cada Pix ao cliente
      const tutores = (await getDocs(responsaveisCol())).docs.map(d => ({
        id: d.id,
        nome: String((d.data() as any).nomeCompleto || (d.data() as any).nome || ''),
      }));
      const acharTutor = (pagador: string) => {
        const p = normal(pagador);
        if (p.length < 8) return null;
        const achados = tutores.filter(t => {
          const n = normal(t.nome);
          return n && (n.startsWith(p) || p.startsWith(n));
        });
        return achados.length === 1 ? achados[0] : null; // só liga se não houver dúvida
      };

      const lotes: ReturnType<typeof writeBatch>[] = [writeBatch(db)];
      let ops = 0;
      const gravar = (ref: any, dados: any) => {
        if (ops >= 450) {
          lotes.push(writeBatch(db!));
          ops = 0;
        }
        lotes[lotes.length - 1].set(ref, dados, { merge: true });
        ops++;
      };

      for (const c of arquivo.categorias) {
        gravar(doc(categoriasFinanceirasCol(), c.id), { ...c, tenantId });
      }

      let ligados = 0;
      for (const r of arquivo.contasReceber) {
        const tutor = r.pagador ? acharTutor(r.pagador) : null;
        if (tutor) ligados++;
        gravar(doc(contasReceberCol(), r.id), {
          ...r,
          valor: Number(r.valor) || 0,
          vencimento: r.data,
          dataVencimento: r.data,
          recebidoEm: r.data,
          status: 'recebido',
          clienteId: tutor?.id || null,
          clienteNome: tutor?.nome || r.pagador || r.clienteNome || r.descricao,
          criadoEm: new Date(r.data + 'T12:00:00').toISOString(),
          importadoEm: agora,
          origemImportacao: 'extrato-bancario',
          tenantId,
        });
      }

      for (const p of arquivo.contasPagar) {
        gravar(doc(contasPagarCol(), p.id), {
          ...p,
          valor: Number(p.valor) || 0,
          vencimento: p.data,
          dataVencimento: p.data,
          pagoEm: p.data,
          status: 'pago',
          criadoEm: new Date(p.data + 'T12:00:00').toISOString(),
          importadoEm: agora,
          origemImportacao: 'extrato-bancario',
          tenantId,
        });
      }

      for (const lote of lotes) await lote.commit();

      setResultado(
        `Importação concluída: ${arquivo.contasReceber.length} recebimentos e ${arquivo.contasPagar.length} custos. ` +
          `${ligados} recebimentos ficaram ligados a um tutor cadastrado.`
      );
    } catch (e: any) {
      console.error('Importar financeiro:', e);
      setErro('Não foi possível importar: ' + (e?.message || 'erro desconhecido'));
    } finally {
      setImportando(false);
    }
  };

  const totalReceber = arquivo ? arquivo.contasReceber.reduce((s, r) => s + (Number(r.valor) || 0), 0) : 0;
  const totalPagar = arquivo ? arquivo.contasPagar.reduce((s, r) => s + (Number(r.valor) || 0), 0) : 0;
  const periodo = arquivo
    ? (() => {
        const datas = [...arquivo.contasReceber, ...arquivo.contasPagar].map(x => x.data).sort();
        const f = (d: string) => d.split('-').reverse().join('/');
        return datas.length ? `${f(datas[0])} a ${f(datas[datas.length - 1])}` : '';
      })()
    : '';

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-teal-50 rounded-xl text-teal-700">
          <Wallet className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Importar financeiro (JSON)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Lança recebimentos já recebidos em Contas a Receber e custos já pagos em Contas a Pagar. Importar o mesmo arquivo
            de novo não duplica.
          </p>
        </div>
      </div>

      <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl p-6 cursor-pointer hover:border-teal-400 text-sm text-slate-600">
        <Upload className="w-4 h-4" />
        {nomeArquivo || 'Escolher arquivo financeiro (.json)'}
        <input type="file" accept="application/json,.json" className="hidden" onChange={e => ler(e.target.files?.[0] || null)} />
      </label>

      {arquivo && (
        <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 space-y-1">
          <p>Período: <strong>{periodo}</strong></p>
          <p>
            <strong>{arquivo.contasReceber.length}</strong> recebimentos · <strong>{brl(totalReceber)}</strong>
          </p>
          <p>
            <strong>{arquivo.contasPagar.length}</strong> custos · <strong>{brl(totalPagar)}</strong>
          </p>
          <p>
            Resultado: <strong>{brl(totalReceber - totalPagar)}</strong>
          </p>
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
        {importando ? 'Importando...' : 'Importar financeiro'}
      </button>
    </div>
  );
}
