import { useState } from 'react';
import {
  Upload, FileType, CheckCircle, AlertCircle, Users,
  ShoppingCart, User, Package, BarChart2
} from 'lucide-react';
import Papa from 'papaparse';
import { storage } from '../services/firebase';
import { ref, uploadBytes } from 'firebase/storage';
import { saveDailyFlow, batchSaveCustomers, batchSaveProdutos, toCustomerId, toLocalDateString, canDelete } from '../services/dataService';
import type { Animal, Customer, AppUser } from '../services/dataService';

interface ImportadorDadosProps {
  onNavigateToCRM?: () => void;
  userProfile: AppUser | null;
}

type TabType = 'clientes' | 'vendas' | 'produtos';

// ── Helpers ───────────────────────────────────────────────────────────────────

const g = (row: Record<string, string>, ...keys: string[]) => {
  const rowKeys = Object.keys(row);
  // 1. Busca exata (prioridade máxima)
  for (const k of keys) {
    const found = rowKeys.find(rk => rk === k);
    if (found && row[found]) return row[found].trim();
  }
  // 2. Busca case-insensitive
  for (const k of keys) {
    const found = rowKeys.find(rk => rk.toLowerCase() === k.toLowerCase());
    if (found && row[found]) return row[found].trim();
  }
  // 3. Busca por palavra-chave (aproximação)
  for (const k of keys) {
    const found = rowKeys.find(rk => rk.toLowerCase().includes(k.toLowerCase()));
    if (found && row[found]) return row[found].trim();
  }
  return '';
};


// ── Sub-componente: Drop Zone ─────────────────────────────────────────────────

interface DropZoneProps {
  file: File | null;
  isDragging: boolean;
  label: string;
  hint: string;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
  inputId: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function DropZone({
  file, isDragging, label, hint,
  onDragOver, onDragLeave, onDrop, onClick, inputId, onChange
}: DropZoneProps) {
  return (
    <div
      className={`border-2 border-dashed rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer ${isDragging ? 'border-primary bg-primary/5' : 'border-purple-200 bg-white hover:border-primary/50'
        }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
    >
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDragging ? 'bg-primary/10' : 'bg-purple-50'}`}>
        <Upload className={`w-8 h-8 ${isDragging ? 'text-primary' : 'text-secondary'}`} />
      </div>
      {file ? (
        <>
          <p className="font-semibold text-slate-700">{file.name}</p>
          <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB · clique para trocar</p>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">{label}</h3>
          <p className="text-slate-400 text-sm mb-2">ou clique para selecionar</p>
          <p className="text-xs text-slate-400">{hint}</p>
        </>
      )}
      <input id={inputId} type="file" className="hidden" accept=".csv" onChange={onChange} />
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

const ImportadorDados = ({ onNavigateToCRM, userProfile }: ImportadorDadosProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('clientes');

  // ── Estado: clientes ────────────────────────────────────────────────────────
  const [fileC, setFileC] = useState<File | null>(null);
  const [draggingC, setDraggingC] = useState(false);
  const [procC, setProcC] = useState(false);
  const [statusC, setStatusC] = useState<'idle' | 'ok' | 'err'>('idle');
  const [msgC, setMsgC] = useState('');
  const [previewC, setPreviewC] = useState<any[]>([]);

  // ── Estado: vendas ──────────────────────────────────────────────────────────
  const [fileV, setFileV] = useState<File | null>(null);
  const [draggingV, setDraggingV] = useState(false);
  const [procV, setProcV] = useState(false);
  const [statusV, setStatusV] = useState<'idle' | 'ok' | 'err'>('idle');
  const [msgV, setMsgV] = useState('');
  const [previewV, setPreviewV] = useState<any[]>([]);
  const [countClientes, setCountClientes] = useState(0);

  // ── Estado: produtos ────────────────────────────────────────────────────────
  const [fileP, setFileP] = useState<File | null>(null);
  const [draggingP, setDraggingP] = useState(false);
  const [procP, setProcP] = useState(false);
  const [statusP, setStatusP] = useState<'idle' | 'ok' | 'err'>('idle');
  const [msgP, setMsgP] = useState('');
  const [previewP, setPreviewP] = useState<any[]>([]);
  const [statsP, setStatsP] = useState<{ total: number; servicos: number; produtos: number; comPreco: number } | null>(null);

  const parseMoney = (s: string): number | null => {
    if (!s || s.trim() === '') return null;
    const v = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : v;
  };

  const toProdId = (codigo: string, nome: string): string => {
    if (codigo) return `sv_${codigo}`;
    return `sv_${nome.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 60)}`;
  };

  // ── Importar CLIENTES ───────────────────────────────────────────────────────

  const importarClientes = async () => {
    if (!fileC) return;
    setProcC(true);
    setStatusC('idle');

    try {
      if (storage) {
        const storageRef = ref(storage, `uploads/clientes/${Date.now()}_${fileC.name}`);
        await uploadBytes(storageRef, fileC).catch(err => {
          console.error('Storage (clientes):', err.code, err.message);
        });
      }
    } catch (_) { }

    Papa.parse(fileC, {
      delimiter: ';',
      header: true,
      skipEmptyLines: true,
      complete: async (result: any) => {
        const rows: Record<string, string>[] = result.data;

        try {
          // Agrupa por código do cliente (um cliente pode ter vários animais)
          const clienteMap = new Map<string, { customer: Partial<Customer>; animais: Animal[] }>();

          for (const row of rows) {
            const nome = g(row, 'Cliente - Nome');
            if (!nome) continue;

            const codigo = g(row, 'Cliente - Código') || toCustomerId(nome);

            if (!clienteMap.has(codigo)) {
              clienteMap.set(codigo, {
                customer: {
                  id: toCustomerId(nome),
                  nome,
                  codigoSimplesVet: codigo,
                  cpf: g(row, 'Cliente - CPF'),
                  rg: g(row, 'Cliente - RG'),
                  sexo: g(row, 'Cliente - Sexo'),
                  email: g(row, 'Cliente - Email'),
                  telefone: g(row, 'Cliente - Telefones'),
                  endereco: g(row, 'Cliente - Endereço'),
                  bairro: g(row, 'Cliente - Bairro'),
                  cidade: g(row, 'Cliente - Cidade'),
                  uf: g(row, 'Cliente - UF'),
                  cep: g(row, 'Cliente - CEP'),
                  rankingABC: g(row, 'Cliente - Ranking ABC'),
                  ticketMedio: g(row, 'Cliente - Ticket médio'),
                  ultimaVenda: g(row, 'Cliente - Última venda'),
                  primeiraCompra: g(row, 'Cliente - Data da primeira compra'),
                  tags: g(row, 'Cliente - Tags'),
                  origem: g(row, 'Cliente - Origem'),
                },
                animais: [],
              });
            }

            const animalNome = g(row, 'Animal - Nome');
            if (animalNome) {
              clienteMap.get(codigo)!.animais.push({
                nome: animalNome,
                especie: g(row, 'Animal - Espécie'),
                raca: g(row, 'Animal - Raça'),
                pelagem: g(row, 'Animal - Pelagem'),
                sexo: g(row, 'Animal - Sexo'),
                nascimento: g(row, 'Animal - Nascimento'),
                esterilizado: g(row, 'Animal - Esterilização'),
                status: g(row, 'Animal - Status'),
                microchip: g(row, 'Animal - Microchip'),
              });
            }
          }

          // Preview
          const preview = Array.from(clienteMap.values()).slice(0, 10).map(({ customer, animais }) => ({
            nome: customer.nome,
            animais: animais.map(a => a.nome).join(', ') || '—',
            cidade: customer.cidade || '—',
            telefone: customer.telefone || '—',
            ranking: customer.rankingABC || '—',
          }));
          setPreviewC(preview);

          // Salva TODOS no Firestore de uma vez (batch)
          const toSave = Array.from(clienteMap.values()).map(({ customer, animais }) => ({
            ...customer,
            animal: animais[0]?.nome || '',
            animais,
          } as Customer));

          await batchSaveCustomers(toSave);

          setStatusC('ok');
          setMsgC(`✅ ${clienteMap.size} clientes importados com ${rows.length} animais.`);
        } catch (err: any) {
          setStatusC('err');
          setMsgC('❌ Erro ao gravar no Firestore. Verifique o Firebase config.');
          console.error('Import Clientes:', err.code, err.message);
        } finally {
          setProcC(false);
        }
      },
      error: () => {
        setStatusC('err');
        setMsgC('❌ Erro ao processar o CSV. Verifique se o delimitador é ";".');
        setProcC(false);
      },
    });
  };

  // ── Importar VENDAS (Dados Externos) ────────────────────────────────────────

  const importarVendas = async () => {
    if (!fileV) return;
    setProcV(true);
    setStatusV('idle');
    setCountClientes(0);

    const dateStr = toLocalDateString(new Date());

    try {
      if (storage) {
        const storageRef = ref(storage, `uploads/vendas/${dateStr}/${fileV.name}`);
        await uploadBytes(storageRef, fileV).catch(err => {
          console.error('Storage (vendas):', err.code, err.message);
        });
      }
    } catch (_) { }

    Papa.parse(fileV, {
      delimiter: ';',
      header: false, // Vamos ler como array primeiro para achar o cabeçalho
      skipEmptyLines: true,
      complete: async (result: any) => {
        const rawRows: string[][] = result.data;
        
        // 1. Tenta achar a linha do cabeçalho real
        let headerIndex = rawRows.findIndex(r => 
          r.some(cell => ['cliente', 'data', 'emissão', 'venda'].some(kw => String(cell).toLowerCase().includes(kw)))
        );
        if (headerIndex === -1) headerIndex = 0;

        const headerRow = rawRows[headerIndex];
        const dataRows = rawRows.slice(headerIndex + 1);

        // Converte para objetos usando o cabeçalho detectado
        const rows: Record<string, string>[] = dataRows.map(dr => {
          const obj: Record<string, string> = {};
          headerRow.forEach((h, i) => {
            obj[h] = dr[i] || '';
          });
          return obj;
        });

        try {
          // Agrupamento por data (YYYY-MM-DD)
          const dataPorDia = new Map<string, any[]>();
          const customersToUpsert: any[] = [];
          const seenCustomers = new Set<string>();
          let totalImportado = 0;

          // 1. Tenta detectar qual coluna contém datas olhando o conteúdo das primeiras linhas
          let detectedDateKey = '';
          let detectedPaymentKey = '';
          let detectedProcKey = '';
          const firstRows = rows.slice(0, 10);
          const rowKeys = Object.keys(rows[0]);

          for (const rKey of rowKeys) {
            const values = firstRows.map(r => (r[rKey] || '').toLowerCase());
            
            // Procura Data
            if (!detectedDateKey && values.some(v => /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(v))) {
              detectedDateKey = rKey;
            }
            // Procura Pagamento
            if (!detectedPaymentKey && values.some(v => ['cart', 'créd', 'déb', 'pix', 'dinheiro', 'espécie', 'boleto', 'transferência'].some(kw => v.includes(kw)))) {
              detectedPaymentKey = rKey;
            }
            // Procura Procedimento
            if (!detectedProcKey && values.some(v => ['vacina', 'consulta', 'exame', 'cirurgia', 'banho', 'tosa', 'castração'].some(kw => v.includes(kw)))) {
              detectedProcKey = rKey;
            }
            // Procura Procedimento (texto longo como fallback)
            if (!detectedProcKey && values.some(v => v.length > 8 && !v.includes('/') && !/\d/.test(v))) {
              const isClient = ['cliente', 'tutor', 'paciente', 'nome'].some(kw => rKey.toLowerCase().includes(kw));
              if (!isClient) detectedProcKey = rKey;
            }
          }

          // Fallbacks por palavra-chave
          if (!detectedDateKey) detectedDateKey = rowKeys.find(k => ['data', 'emissão', 'venda', 'date'].some(kw => k.toLowerCase().includes(kw))) || '';
          if (!detectedPaymentKey) detectedPaymentKey = rowKeys.find(k => ['pagamento', 'recebimento', 'forma', 'conta', 'meio'].some(kw => k.toLowerCase().includes(kw))) || '';
          if (!detectedProcKey) detectedProcKey = rowKeys.find(k => ['produto', 'serviço', 'item', 'descrição', 'histórico'].some(kw => k.toLowerCase().includes(kw))) || '';

          if (!detectedDateKey) {
            setStatusV('err');
            setMsgV(`❌ Coluna de DATA não encontrada. Colunas lidas: ${rowKeys.join(', ')}`);
            setProcV(false);
            return;
          }

          let totalPulado = 0;
          for (const row of rows) {
            const cliente = g(row, 'cliente', 'tutor', 'paciente');
            if (!cliente) continue;

            const rawValor = g(row, 'líquido', 'valor', 'total', 'preço');
            const cleanValor = rawValor.replace(/[R$\s.]/g, '').replace(',', '.');
            const valorNum = parseFloat(cleanValor) || 0;

            if (valorNum <= 0) continue;

            // Usa a coluna detectada por conteúdo ou palavra-chave
            let rowDate = row[detectedDateKey] || '';
            let key = '';

            if (rowDate) {
              const cleanDate = rowDate.split(' ')[0];
              const parts = cleanDate.split(/[-/]/);
              if (parts.length === 3) {
                let d, m, y;
                if (parts[0].length === 4) { [y, m, d] = parts; }
                else {
                  [d, m, y] = parts;
                  if (y.length === 2) y = '20' + y;
                }
                key = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
              }
            }

            if (!key) continue;

            const rawPagamento = (detectedPaymentKey ? row[detectedPaymentKey] : '').toLowerCase();
            let pagamento = 'Pix';
            if (rawPagamento.includes('déb') || rawPagamento.includes('debito')) pagamento = 'Débito';
            else if (rawPagamento.includes('créd') || rawPagamento.includes('credito')) pagamento = 'Crédito';
            else if (rawPagamento.includes('cart')) pagamento = 'Débito'; 
            else if (rawPagamento.includes('dinheiro') || rawPagamento.includes('espécie')) pagamento = 'Dinheiro';
            else if (rawPagamento.includes('pix')) pagamento = 'Pix';

            const mapped = {
              cliente,
              animal: g(row, 'animal', 'paciente', 'pet'),
              procedimento: (detectedProcKey ? row[detectedProcKey] : '') || 'Consulta',
              valor: String(valorNum),
              pago: true,
              pagamento,
              maquininha: g(row, 'maquininha', 'operadora', 'bandeira') || 'N/A',
              observacoes: 'Importado via arquivo CSV',
              _id: `imp_${Math.random().toString(36).slice(2, 9)}`,
            };

            if (!dataPorDia.has(key)) dataPorDia.set(key, []);
            
            // De-duplicação: evita o mesmo cliente/valor/procedimento no mesmo dia
            const isDup = dataPorDia.get(key)!.some(existing => 
              existing.cliente === mapped.cliente && 
              existing.valor === mapped.valor && 
              existing.procedimento === mapped.procedimento
            );

            if (isDup) {
              totalPulado++;
              continue;
            }

            dataPorDia.get(key)!.push(mapped);
            totalImportado++;

            if (!seenCustomers.has(cliente)) {
              seenCustomers.add(cliente);
              customersToUpsert.push({
                id: toCustomerId(cliente),
                nome: cliente,
                animal: mapped.animal,
              });
            }
          }

          for (const [dia, registros] of dataPorDia.entries()) {
            await saveDailyFlow(dia, registros);
          }

          if (customersToUpsert.length > 0) {
            await batchSaveCustomers(customersToUpsert);
          }

          setPreviewV(Array.from(dataPorDia.values()).flat().slice(0, 15));
          setCountClientes(customersToUpsert.length);
          setStatusV('ok');
          
          // Agrupa por mês para o resumo
          const meses = new Map<string, number>();
          for (const dia of dataPorDia.keys()) {
            const mesKey = dia.substring(0, 7); // YYYY-MM
            meses.set(mesKey, (meses.get(mesKey) || 0) + dataPorDia.get(dia)!.length);
          }
          const resumoMeses = Array.from(meses.entries())
            .map(([m, c]) => `${m}: ${c} vendas`)
            .join(' | ');

          setMsgV(`✅ ${totalImportado} registros importados. [Data: ${detectedDateKey} | Proc: ${detectedProcKey} | Pag: ${detectedPaymentKey}]. Resumo: ${resumoMeses}. (${totalPulado} duplicados ignorados)`);
        } catch (err: any) {
          setStatusV('err');
          setMsgV('❌ Erro ao gravar no Firestore. Verifique o Firebase config.');
          console.error('Import Vendas:', err.code, err.message);
        } finally {
          setProcV(false);
        }
      },
      error: () => {
        setStatusV('err');
        setMsgV('❌ Erro ao processar o CSV. Verifique se o delimitador é ";".');
        setProcV(false);
      },
    });
  };

  // ── Importar PRODUTOS ───────────────────────────────────────────────────────

  const importarProdutos = async () => {
    if (!fileP) return;
    setProcP(true);
    setStatusP('idle');

    Papa.parse(fileP, {
      delimiter: ';',
      header: true,
      skipEmptyLines: true,
      complete: async (result: any) => {
        const rows = result.data as Record<string, string>[];
        const seen = new Set<string>();
        const produtos: any[] = [];

        for (const row of rows) {
          const nome = row['Produto']?.trim();
          if (!nome) continue;
          const id = toProdId(row['Código']?.trim() ?? '', nome);
          if (seen.has(id)) continue;
          seen.add(id);
          
          produtos.push({
            id,
            codigo: row['Código']?.trim() ?? '',
            nome,
            tipo: (row['Tipo']?.trim() ?? 'Produto') as any,
            grupo: row['Grupo']?.trim() ?? '',
            marca: row['Marca']?.trim() || null,
            unidade: row['Unidade']?.trim() || 'UN',
            proposito: row['Propósito']?.trim() || null,
            controlaEstoque: row['Controla Estoque']?.trim() === 'Sim',
            custo: parseMoney(row['Custo'] ?? ''),
            venda: parseMoney(row['Venda'] ?? ''),
            estoque: parseMoney(row['Estoque'] ?? ''),
            codigoBarra: row['Código Barra']?.trim() || null,
            situacao: 'ativo',
          });
        }

        const statsData = {
          total: produtos.length,
          servicos: produtos.filter(p => p.tipo === 'Serviço').length,
          produtos: produtos.filter(p => p.tipo === 'Produto').length,
          comPreco: produtos.filter(p => p.venda != null && (p.venda ?? 0) > 0).length,
        };
        setStatsP(statsData);
        setPreviewP(produtos.slice(0, 12));

        try {
          await batchSaveProdutos(produtos);
          setStatusP('ok');
          setMsgP(`✅ ${produtos.length} itens importados — ${statsData.servicos} serviços e ${statsData.produtos} produtos salvos no Firestore.`);
        } catch (e) {
          console.error(e);
          setStatusP('err');
          setMsgP('❌ Erro ao gravar no Firestore. Verifique o Firebase config.');
        } finally {
          setProcP(false);
        }
      },
      error: () => {
        setStatusP('err');
        setMsgP('❌ Erro ao ler o CSV. Verifique se o delimitador é ";".');
        setProcP(false);
      },
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'clientes', label: 'Importar Clientes', icon: <User className="w-4 h-4" /> },
    { key: 'vendas', label: 'Importar Vendas', icon: <ShoppingCart className="w-4 h-4" /> },
    { key: 'produtos', label: 'Produtos & Serviços', icon: <Package className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-20">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-slate-800">Importação de Dados Externos</h1>
        <p className="text-slate-500 mt-2">
          Importe seus dados exportados do sistema anterior (delimitador: <code className="bg-purple-50 px-1 rounded">;</code>)
        </p>
      </header>
      
      {!canDelete(userProfile?.role) && (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-red-800">Acesso Restrito</h2>
          <p className="text-red-600">Apenas administradores e gerentes podem realizar importações de dados.</p>
        </div>
      )}

      {canDelete(userProfile?.role) && (
        <>
          {/* Tabs */}
      <div className="flex space-x-2 bg-purple-50/60 p-1 rounded-2xl w-fit mx-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === t.key
                ? 'bg-white text-primary shadow-sm shadow-primary/10'
                : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── ABA CLIENTES ── */}
      {activeTab === 'clientes' && (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 text-sm text-blue-700">
            <strong>Relatório esperado:</strong> Cadastro de Clientes/Animais — colunas como{' '}
            <code>Cliente - Nome</code>, <code>Cliente - Telefones</code>, <code>Animal - Nome</code>, etc.
            Exporte com delimitador <code>;</code>.
          </div>

          <DropZone
            file={fileC}
            isDragging={draggingC}
            label="Arraste o CSV de Clientes aqui"
            hint="Colunas: Cliente - Nome · Cliente - Telefones · Animal - Nome · Animal - Espécie · ..."
            onDragOver={e => { e.preventDefault(); setDraggingC(true); }}
            onDragLeave={e => { e.preventDefault(); setDraggingC(false); }}
            onDrop={e => { e.preventDefault(); setDraggingC(false); if (e.dataTransfer.files?.[0]) setFileC(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById('upload-clientes')?.click()}
            inputId="upload-clientes"
            onChange={e => { if (e.target.files?.[0]) setFileC(e.target.files[0]); }}
          />

          {fileC && (
            <div className="flex justify-end">
              <button
                onClick={importarClientes}
                disabled={procC}
                className="flex items-center space-x-2 px-6 py-3 bg-primary text-white font-semibold rounded-2xl hover:bg-pink-600 transition-colors shadow-md shadow-primary/30 disabled:opacity-50"
              >
                <FileType className="w-5 h-5" />
                <span>{procC ? 'Importando clientes...' : 'Importar Clientes'}</span>
              </button>
            </div>
          )}

          {statusC !== 'idle' && (
            <div className={`flex items-start space-x-3 px-5 py-4 rounded-2xl border text-sm font-medium ${statusC === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
              {statusC === 'ok' ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <span>{msgC}</span>
                {statusC === 'ok' && onNavigateToCRM && (
                  <button
                    onClick={onNavigateToCRM}
                    className="mt-3 flex items-center space-x-2 px-4 py-2 bg-white border border-green-200 text-green-700 rounded-xl hover:bg-green-100 transition-colors w-fit text-sm font-semibold"
                  >
                    <Users className="w-4 h-4" />
                    <span>Ver clientes no CRM</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {previewC.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-purple-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-purple-50 flex items-center justify-between">
                <h2 className="font-semibold text-slate-700">Preview — Clientes importados</h2>
                <span className="text-xs text-slate-400">Primeiros 10</span>
              </div>
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-sm">
                  <thead className="bg-purple-50/50 text-slate-500 text-xs uppercase sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Animais</th>
                      <th className="px-4 py-3">Cidade</th>
                      <th className="px-4 py-3">Telefone</th>
                      <th className="px-4 py-3">Ranking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50">
                    {previewC.map((r, i) => (
                      <tr key={i} className="hover:bg-purple-50/30">
                        <td className="px-4 py-3 font-medium text-slate-800">{r.nome}</td>
                        <td className="px-4 py-3 text-slate-600">{r.animais}</td>
                        <td className="px-4 py-3 text-slate-600">{r.cidade}</td>
                        <td className="px-4 py-3 text-slate-600">{r.telefone}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.ranking === 'A' ? 'bg-green-100 text-green-700' :
                              r.ranking === 'B' ? 'bg-yellow-100 text-yellow-700' :
                                r.ranking === 'C' ? 'bg-red-100 text-red-700' :
                                  'bg-slate-100 text-slate-500'
                            }`}>{r.ranking}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ABA VENDAS ── */}
      {activeTab === 'vendas' && (
        <div className="space-y-5">
          <div className="bg-purple-50 border border-purple-100 rounded-2xl px-5 py-3 text-sm text-purple-700">
            <strong>Relatório esperado:</strong> Relatório de Vendas — colunas{' '}
            <code>Cliente · Animal · Produto/serviço · Líquido</code>. Exporte com delimitador <code>;</code>.
          </div>

          <DropZone
            file={fileV}
            isDragging={draggingV}
            label="Arraste o CSV de Vendas aqui"
            hint="Colunas: Cliente · Animal · Produto/serviço · Líquido"
            onDragOver={e => { e.preventDefault(); setDraggingV(true); }}
            onDragLeave={e => { e.preventDefault(); setDraggingV(false); }}
            onDrop={e => { e.preventDefault(); setDraggingV(false); if (e.dataTransfer.files?.[0]) setFileV(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById('upload-vendas')?.click()}
            inputId="upload-vendas"
            onChange={e => { if (e.target.files?.[0]) setFileV(e.target.files[0]); }}
          />

          {fileV && (
            <div className="flex justify-end">
              <button
                onClick={importarVendas}
                disabled={procV}
                className="flex items-center space-x-2 px-6 py-3 bg-primary text-white font-semibold rounded-2xl hover:bg-pink-600 transition-colors shadow-md shadow-primary/30 disabled:opacity-50"
              >
                <FileType className="w-5 h-5" />
                <span>{procV ? 'Importando vendas...' : 'Importar Vendas'}</span>
              </button>
            </div>
          )}

          {statusV !== 'idle' && (
            <div className={`flex items-start space-x-3 px-5 py-4 rounded-2xl border text-sm font-medium ${statusV === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
              {statusV === 'ok' ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <span>{msgV}</span>
                {statusV === 'ok' && onNavigateToCRM && countClientes > 0 && (
                  <button
                    onClick={onNavigateToCRM}
                    className="mt-3 flex items-center space-x-2 px-4 py-2 bg-white border border-green-200 text-green-700 rounded-xl hover:bg-green-100 transition-colors w-fit text-sm font-semibold"
                  >
                    <Users className="w-4 h-4" />
                    <span>Ver clientes no CRM</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {previewV.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-purple-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-purple-50 flex items-center justify-between">
                <h2 className="font-semibold text-slate-700">Preview ({previewV.length} de {previewV.length} exibidos)</h2>
                <span className="text-xs text-slate-400">Primeiros 15</span>
              </div>
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-sm">
                  <thead className="bg-purple-50/50 text-slate-500 text-xs uppercase sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Animal</th>
                      <th className="px-4 py-3">Procedimento</th>
                      <th className="px-4 py-3 text-right">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50">
                    {previewV.map((row, i) => (
                      <tr key={i} className="hover:bg-purple-50/30">
                        <td className="px-4 py-3 font-medium text-slate-800">{row.cliente}</td>
                        <td className="px-4 py-3 text-slate-600">{row.animal}</td>
                        <td className="px-4 py-3 text-slate-600">{row.procedimento}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          {parseFloat(row.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ABA PRODUTOS ── */}
      {activeTab === 'produtos' && (
        <div className="space-y-5">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3 text-sm text-emerald-700">
            <strong>Relatório esperado:</strong> Cadastro de Produtos e Serviços — colunas{' '}
            <code>Código · Produto · Tipo · Grupo · Venda</code>. Exporte com delimitador <code>;</code>.
          </div>

          <DropZone
            file={fileP}
            isDragging={draggingP}
            label="Arraste o CSV de Produtos aqui"
            hint="Colunas: Código · Produto · Tipo · Grupo · Marca · Venda · ..."
            onDragOver={e => { e.preventDefault(); setDraggingP(true); }}
            onDragLeave={e => { e.preventDefault(); setDraggingP(false); }}
            onDrop={e => { e.preventDefault(); setDraggingP(false); if (e.dataTransfer.files?.[0]) setFileP(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById('upload-produtos')?.click()}
            inputId="upload-produtos"
            onChange={e => { if (e.target.files?.[0]) setFileP(e.target.files[0]); }}
          />

          {fileP && (
            <div className="flex justify-end">
              <button
                onClick={importarProdutos}
                disabled={procP}
                className="flex items-center space-x-2 px-6 py-3 bg-primary text-white font-semibold rounded-2xl hover:bg-pink-600 transition-colors shadow-md shadow-primary/30 disabled:opacity-50"
              >
                <FileType className="w-5 h-5" />
                <span>{procP ? 'Importando produtos...' : 'Importar Produtos & Serviços'}</span>
              </button>
            </div>
          )}

          {statusP !== 'idle' && (
            <div className={`flex items-start space-x-3 px-5 py-4 rounded-2xl border text-sm font-medium ${statusP === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
              {statusP === 'ok' ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <span>{msgP}</span>
              </div>
            </div>
          )}

          {statsP && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total', value: statsP.total, icon: <Package className="w-5 h-5 text-secondary" />, color: 'bg-purple-50' },
                { label: 'Serviços', value: statsP.servicos, icon: <BarChart2 className="w-5 h-5 text-blue-500" />, color: 'bg-blue-50' },
                { label: 'Produtos', value: statsP.produtos, icon: <Package className="w-5 h-5 text-emerald-500" />, color: 'bg-emerald-50' },
                { label: 'Com preço', value: statsP.comPreco, icon: <CheckCircle className="w-5 h-5 text-amber-500" />, color: 'bg-amber-50' },
              ].map(c => (
                <div key={c.label} className="bg-white rounded-2xl border border-purple-100 p-4 flex items-center gap-3 shadow-sm">
                  <div className={`p-2 rounded-xl ${c.color}`}>{c.icon}</div>
                  <div>
                    <p className="text-xs text-slate-500">{c.label}</p>
                    <p className="text-xl font-bold text-slate-800">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {previewP.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-purple-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-purple-50 flex items-center justify-between">
                <h2 className="font-semibold text-slate-700">Preview ({previewP.length} itens)</h2>
                <span className="text-xs text-slate-400">Primeiros 12</span>
              </div>
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-sm">
                  <thead className="bg-purple-50/50 text-slate-500 text-xs uppercase sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3 text-right">Preço (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50">
                    {previewP.map((row, i) => (
                      <tr key={i} className="hover:bg-purple-50/30">
                        <td className="px-4 py-3 text-slate-400 text-xs font-mono">{row.codigo || '—'}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{row.nome}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${row.tipo === 'Serviço' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-secondary'}`}>{row.tipo}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          {row.venda != null ? row.venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )}
</div>
  );
};

export default ImportadorDados;
