
import { useState } from 'react';
import { CheckCircle, AlertCircle, Package, FileType, BarChart2 } from 'lucide-react';
import Papa from 'papaparse';
import { batchSaveProdutos } from '../services/dataService';
import type { Produto } from '../services/dataService';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const parseMoney = (s: string): number | null => {
    if (!s || s.trim() === '') return null;
    const v = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : v;
};

const toId = (codigo: string, nome: string): string => {
    if (codigo) return `sv_${codigo}`;
    return `sv_${nome.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 60)}`;
};

const mapRow = (row: Record<string, string>): Produto => ({
    id: toId(row['Código']?.trim() ?? '', row['Produto']?.trim() ?? ''),
    codigo: row['Código']?.trim() ?? '',
    nome: row['Produto']?.trim() ?? '',
    tipo: (row['Tipo']?.trim() ?? 'Produto') as Produto['tipo'],
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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────

const ImportarProdutos = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');
    const [statusMsg, setStatusMsg] = useState('');
    const [preview, setPreview] = useState<Produto[]>([]);
    const [stats, setStats] = useState<{ total: number; servicos: number; produtos: number; comPreco: number } | null>(null);

    const handleFile = (f: File) => {
        setFile(f);
        setStatus('idle');
        setPreview([]);
        setStats(null);
    };

    const processFile = () => {
        if (!file) return;
        setProcessing(true);
        setStatus('idle');

        Papa.parse(file, {
            delimiter: ';',
            header: true,
            skipEmptyLines: true,
            complete: async (result) => {
                const rows = result.data as Record<string, string>[];
                const seen = new Set<string>();
                const produtos: Produto[] = [];

                for (const row of rows) {
                    const nome = row['Produto']?.trim();
                    if (!nome) continue;
                    const id = toId(row['Código']?.trim() ?? '', nome);
                    if (seen.has(id)) continue;
                    seen.add(id);
                    produtos.push(mapRow(row));
                }

                const statsData = {
                    total: produtos.length,
                    servicos: produtos.filter(p => p.tipo === 'Serviço').length,
                    produtos: produtos.filter(p => p.tipo === 'Produto').length,
                    comPreco: produtos.filter(p => p.venda != null && (p.venda ?? 0) > 0).length,
                };
                setStats(statsData);
                setPreview(produtos.slice(0, 12));

                try {
                    await batchSaveProdutos(produtos);
                    setStatus('ok');
                    setStatusMsg(`✅ ${produtos.length} itens importados — ${statsData.servicos} serviços e ${statsData.produtos} produtos salvos no Firestore.`);
                } catch (e) {
                    console.error(e);
                    setStatus('err');
                    setStatusMsg('❌ Erro ao gravar no Firestore. Verifique o Firebase config.');
                } finally {
                    setProcessing(false);
                }
            },
            error: () => {
                setStatus('err');
                setStatusMsg('❌ Erro ao ler o CSV. Verifique se o delimitador é ";".');
                setProcessing(false);
            },
        });
    };

    const fmtBRL = (v: number | null) =>
        v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-20">
            <header>
                <h1 className="text-3xl font-bold text-slate-800">Importar Produtos & Serviços</h1>
                <p className="text-slate-500 mt-1">
                    Importe o CSV exportado do sistema anterior (delimitador <code className="bg-purple-50 px-1 rounded">;</code>).
                    Os itens ficam disponíveis no Monitoramento para busca rápida na venda.
                </p>
            </header>

            {/* Info banner */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 text-sm text-blue-700">
                <strong>Campos importados:</strong> Código · Nome · Tipo · Grupo · Marca · Unidade · Custo · Preço de Venda · Estoque atual · Controla Estoque
            </div>

            {/* Drop zone */}
            <div
                className={`border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${isDragging ? 'border-primary bg-primary/5' : 'border-purple-200 bg-white hover:border-primary/50'
                    }`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }}
                onClick={() => document.getElementById('prod-upload')?.click()}
            >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDragging ? 'bg-primary/10' : 'bg-purple-50'}`}>
                    <Package className={`w-8 h-8 ${isDragging ? 'text-primary' : 'text-secondary'}`} />
                </div>
                {file ? (
                    <>
                        <p className="font-semibold text-slate-700">{file.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB · clique para trocar</p>
                    </>
                ) : (
                    <>
                        <h3 className="text-lg font-semibold text-slate-700 mb-1">Arraste o CSV aqui</h3>
                        <p className="text-slate-400 text-sm">ou clique para selecionar</p>
                    </>
                )}
                <input id="prod-upload" type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            </div>

            {/* Botão importar */}
            {file && (
                <div className="flex justify-end">
                    <button
                        onClick={processFile}
                        disabled={processing}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-2xl hover:bg-pink-600 transition-colors shadow-md shadow-primary/30 disabled:opacity-50"
                    >
                        <FileType className="w-5 h-5" />
                        {processing ? 'Importando...' : 'Importar Produtos & Serviços'}
                    </button>
                </div>
            )}

            {/* Stats cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total', value: stats.total, icon: <Package className="w-5 h-5 text-secondary" />, color: 'bg-purple-50' },
                        { label: 'Serviços', value: stats.servicos, icon: <BarChart2 className="w-5 h-5 text-blue-500" />, color: 'bg-blue-50' },
                        { label: 'Produtos', value: stats.produtos, icon: <Package className="w-5 h-5 text-emerald-500" />, color: 'bg-emerald-50' },
                        { label: 'Com preço', value: stats.comPreco, icon: <CheckCircle className="w-5 h-5 text-amber-500" />, color: 'bg-amber-50' },
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

            {/* Status */}
            {status !== 'idle' && (
                <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl border text-sm font-medium ${status === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                    {status === 'ok' ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                    <span>{statusMsg}</span>
                </div>
            )}

            {/* Preview */}
            {preview.length > 0 && (
                <div className="bg-white rounded-3xl shadow-sm border border-purple-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-purple-50 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-700">Preview — primeiros 12 itens</h2>
                        <span className="text-xs text-slate-400">Mostrando {preview.length} de {stats?.total ?? 0}</span>
                    </div>
                    <div className="overflow-x-auto max-h-80">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-purple-50/50 text-slate-500 text-xs uppercase sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Código</th>
                                    <th className="px-4 py-3">Nome</th>
                                    <th className="px-4 py-3">Tipo</th>
                                    <th className="px-4 py-3">Grupo</th>
                                    <th className="px-4 py-3 text-right">Venda</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-purple-50">
                                {preview.map(p => (
                                    <tr key={p.id} className="hover:bg-purple-50/30">
                                        <td className="px-4 py-2 text-slate-400 text-xs">{p.codigo}</td>
                                        <td className="px-4 py-2 font-medium text-slate-800">{p.nome}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.tipo === 'Serviço' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-secondary'
                                                }`}>{p.tipo}</span>
                                        </td>
                                        <td className="px-4 py-2 text-slate-500 text-xs">{p.grupo}</td>
                                        <td className="px-4 py-2 text-right font-semibold text-slate-800">{fmtBRL(p.venda)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportarProdutos;