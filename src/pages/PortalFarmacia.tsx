import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Building2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Lock,
  ExternalLink,
  Printer,
  ChevronRight,
  RefreshCw,
  Clock,
  ArrowLeft,
  Pill
} from 'lucide-react';
import { functions, httpsCallable } from '../services/firebase';

interface ItemConsulta {
  index: number;
  produto: string;
  concentracao: string;
  quantidadePrescrita: number;
  quantidadeExtenso?: string;
  unidade: string;
  posologia: string;
  quantidadeDispensada: number;
  saldoRestante: number;
  dispensadoTotalmente: boolean;
}

interface ReceitaConsultaData {
  token: string;
  subtipo: string;
  status: string;
  statusDispensacao: string;
  dispensavel: boolean;
  motivoBloqueio?: string | null;
  dataEmissao: string;
  validadeAte: string;
  validadeDias: number;
  isControlado: boolean;
  numeroNotificacaoSipeagro?: string | null;
  prescritor: {
    nome: string;
    crmv: string;
    registroMapa?: string | null;
    clinicaNome?: string | null;
  };
  paciente: {
    nome: string;
    especie?: string | null;
    raca?: string | null;
    sexo?: string | null;
    idade?: string | null;
    peso?: string | number | null;
  };
  tutor: {
    nome: string;
    cpfMascarado: string;
  };
  itens: ItemConsulta[];
  orientacoes?: string[];
  observacoesResponsavel?: string | null;
  assinatura: {
    isAssinada: boolean;
    titular?: string;
    emissorAC?: string;
    dataAssinatura?: string;
    cpfMascarado?: string;
    pdfUrl?: string | null;
  };
  dispensacoes?: any[];
}

export const PortalFarmacia: React.FC = () => {
  // Extrair token inicial da URL se rota for /farmacia/d/:token
  const getInitialToken = () => {
    if (typeof window === 'undefined') return '';
    const path = window.location.pathname;
    const match = path.match(/\/farmacia\/d\/([A-Za-z0-9_-]+)/i);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
    const params = new URLSearchParams(window.location.search);
    return (params.get('token') || '').toUpperCase();
  };

  const [tokenInput, setTokenInput] = useState<string>(getInitialToken);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receita, setReceita] = useState<ReceitaConsultaData | null>(null);

  // Formulário de Dispensação
  const [farmaceuticoNome, setFarmaceuticoNome] = useState('');
  const [farmaceuticoCrf, setFarmaceuticoCrf] = useState('');
  const [farmaceuticoUf, setFarmaceuticoUf] = useState('SP');
  const [farmaciaNome, setFarmaciaNome] = useState('');
  const [farmaciaCnpj, setFarmaciaCnpj] = useState('');
  const [quantidadesADispensar, setQuantidadesADispensar] = useState<Record<number, number>>({});
  const [lotesPorItem, setLotesPorItem] = useState<Record<number, string>>({});
  const [observacoesDispensa, setObservacoesDispensa] = useState('');
  const [declaracaoAceita, setDeclaracaoAceita] = useState(false);

  // Estado pós-dispensação
  const [dispensando, setDispensando] = useState(false);
  const [dispensacaoSucesso, setDispensacaoSucesso] = useState<{
    protocolo: string;
    statusDispensacao: string;
    dataDispensacao: string;
    itensDispensados: any[];
  } | null>(null);

  // Auto-consulta se token estiver na URL
  useEffect(() => {
    const initialToken = getInitialToken();
    if (initialToken && initialToken.length >= 8) {
      consultarReceitaPorToken(initialToken);
    }
  }, []);

  // Formatar token enquanto digita (DDMMAAAA-XXXXXX)
  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!raw.includes('-') && raw.length > 8) {
      raw = `${raw.slice(0, 8)}-${raw.slice(8, 14)}`;
    }
    setTokenInput(raw.slice(0, 15));
  };

  const consultarReceitaPorToken = async (targetToken?: string) => {
    const tokenToSearch = (targetToken || tokenInput).trim().toUpperCase();
    if (!tokenToSearch) {
      setErrorMsg('Informe o token de dispensação.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setReceita(null);
    setDispensacaoSucesso(null);

    try {
      const consultarFn = httpsCallable<{ token: string }, ReceitaConsultaData>(
        functions,
        'farmaciaConsultar'
      );
      const res = await consultarFn({ token: tokenToSearch });
      const data = res.data;
      setReceita(data);

      // Inicializar quantidades sugeridas (saldo restante total por padrão)
      const initialQtds: Record<number, number> = {};
      const initialLotes: Record<number, string> = {};
      data.itens.forEach((it) => {
        initialQtds[it.index] = it.saldoRestante;
        initialLotes[it.index] = '';
      });
      setQuantidadesADispensar(initialQtds);
      setLotesPorItem(initialLotes);

      // Atualizar URL sem recarregar a página
      if (typeof window !== 'undefined' && window.history.pushState) {
        window.history.pushState({}, '', `/farmacia/d/${tokenToSearch}`);
      }
    } catch (err: any) {
      console.error('Erro ao consultar receita:', err);
      let msg = err.message || 'Receita não encontrada.';
      msg = msg.replace(/^[a-z0-9_-]+:\s*/i, '');
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDispensar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receita) return;

    if (!declaracaoAceita) {
      alert('Você deve marcar a declaração legal de conferência antes de registrar a dispensação.');
      return;
    }

    if (!farmaceuticoNome.trim() || !farmaceuticoCrf.trim() || !farmaciaCnpj.trim() || !farmaciaNome.trim()) {
      alert('Preencha todos os dados obrigatórios do farmacêutico e da farmácia.');
      return;
    }

    // Montar itens a dispensar
    const itensPayload = receita.itens
      .map((it) => ({
        index: it.index,
        quantidade: Number(quantidadesADispensar[it.index]) || 0,
        lote: (lotesPorItem[it.index] || '').trim(),
      }))
      .filter((it) => it.quantidade > 0);

    if (itensPayload.length === 0) {
      alert('Informe a quantidade de pelo menos um medicamento para dispensar.');
      return;
    }

    const confirma = window.confirm(
      'Confirma o registro da dispensação destes medicamentos? Esta operação é definitiva e ficará gravada no prontuário do paciente.'
    );
    if (!confirma) return;

    setDispensando(true);
    setErrorMsg(null);

    try {
      const dispensarFn = httpsCallable<any, any>(functions, 'farmaciaDispensar');
      const res = await dispensarFn({
        token: receita.token,
        farmaceuticoNome: farmaceuticoNome.trim(),
        farmaceuticoCrf: farmaceuticoCrf.trim(),
        farmaceuticoCrfUf: farmaceuticoUf,
        farmaciaNome: farmaciaNome.trim(),
        farmaciaCnpj: farmaciaCnpj.trim(),
        itens: itensPayload,
        declaracaoConferida: true,
        observacoes: observacoesDispensa.trim(),
      });

      setDispensacaoSucesso(res.data);
      // Re-consultar para atualizar os saldos
      await consultarReceitaPorToken(receita.token);
    } catch (err: any) {
      console.error('Erro ao registrar dispensação:', err);
      let msg = err.message || 'Falha ao registrar dispensação.';
      msg = msg.replace(/^[a-z0-9_-]+:\s*/i, '');
      setErrorMsg(msg);
    } finally {
      setDispensando(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleNovaConsulta = () => {
    setReceita(null);
    setDispensacaoSucesso(null);
    setTokenInput('');
    setErrorMsg(null);
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({}, '', '/farmacia');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-teal-500 selection:text-white">
      {/* Top Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/20">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-base sm:text-lg">ClinicOS</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Portal da Farmácia
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Consulta e Dispensação de Receitas Médico-Veterinárias Digitais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Ambiente Seguro Oficial</span>
            <span className="text-slate-500">•</span>
            <a
              href="https://validar.iti.gov.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
            >
              Validar ITI <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Barra de Busca de Token */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 mb-8 transition-all">
          <div className="max-w-xl mx-auto text-center space-y-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Consultar Receita por Token
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Digite o token impresso na receita do paciente (ex: <code className="font-mono text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">22112026-AB7K9P</code>) ou escaneie o QR Code com a câmera do celular.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                consultarReceitaPorToken();
              }}
              className="flex flex-col sm:flex-row items-center gap-2.5 mt-4"
            >
              <div className="relative w-full">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={handleTokenChange}
                  placeholder="DDMMAAAA-XXXXXX"
                  maxLength={15}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-base font-bold text-slate-800 uppercase placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-center tracking-wider"
                />
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 pointer-events-none" />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-2xl shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Consultando...</span>
                  </>
                ) : (
                  <>
                    <span>Consultar</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-left flex items-start gap-2.5 mt-3 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </section>

        {/* Sucesso pós-dispensação */}
        {dispensacaoSucesso && (
          <section className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 mb-8 text-emerald-950 animate-in fade-in">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg">Dispensação Registrada com Sucesso!</h3>
                  <p className="text-xs text-emerald-800">
                    Protocolo oficial gerado: <strong className="font-mono text-emerald-950 text-sm">{dispensacaoSucesso.protocolo}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={handlePrintReceipt}
                className="px-4 py-2 bg-white hover:bg-emerald-100/60 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Comprovante</span>
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-emerald-200/70 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-emerald-700 block text-[10px] uppercase font-bold">Data & Hora</span>
                <span className="font-medium">{new Date(dispensacaoSucesso.dataDispensacao).toLocaleString('pt-BR')}</span>
              </div>
              <div>
                <span className="text-emerald-700 block text-[10px] uppercase font-bold">Novo Status da Receita</span>
                <span className="font-bold uppercase text-emerald-900">
                  {dispensacaoSucesso.statusDispensacao === 'dispensada' ? 'Totalmente Dispensada' : 'Parcialmente Dispensada'}
                </span>
              </div>
              <div>
                <span className="text-emerald-700 block text-[10px] uppercase font-bold">Itens Dispensados</span>
                <span className="font-medium">{dispensacaoSucesso.itensDispensados.length} medicamento(s)</span>
              </div>
            </div>
          </section>
        )}

        {/* Exibição Completa da Receita */}
        {receita && (
          <div className="space-y-6 animate-in fade-in">
            {/* Header Card com Status */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-black text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                      TOKEN: {receita.token}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">
                      Emitido em {new Date(receita.dataEmissao).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-2">
                    {receita.subtipo === 'controle_especial'
                      ? 'Receita de Controle Especial'
                      : receita.subtipo === 'antimicrobiano'
                      ? 'Receita de Antimicrobiano'
                      : receita.subtipo === 'magistral'
                      ? 'Prescrição Magistral Veterinária'
                      : 'Receita Médica Veterinária'}
                  </h2>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {receita.dispensavel ? (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Válida para Dispensação
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                      Dispensação Bloqueada
                    </span>
                  )}

                  {receita.statusDispensacao === 'parcialmente_dispensada' && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Parcialmente Dispensada
                    </span>
                  )}
                  {receita.statusDispensacao === 'dispensada' && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      Totalmente Dispensada
                    </span>
                  )}
                </div>
              </div>

              {/* Alerta de bloqueio caso não dispensável */}
              {!receita.dispensavel && receita.motivoBloqueio && (
                <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900 text-xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-amber-950 block">Atenção Farmacêutico:</strong>
                    <p className="mt-0.5">{receita.motivoBloqueio}</p>
                  </div>
                </div>
              )}

              {/* Alerta de SIPEAGRO se houver */}
              {receita.isControlado && receita.numeroNotificacaoSipeagro && (
                <div className="mt-4 p-3 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center gap-2 text-indigo-900 text-xs">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Medicamento Controlado — <strong>Notificação de Receita SIPEAGRO / MAPA nº: {receita.numeroNotificacaoSipeagro}</strong>
                  </span>
                </div>
              )}

              {/* Grid: Prescritor, Paciente e Tutor */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 text-xs">
                {/* Prescritor */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Médico(a) Veterinário(a)
                  </span>
                  <p className="font-bold text-slate-800 text-sm">{receita.prescritor.nome}</p>
                  <p className="text-slate-600 mt-0.5">CRMV: {receita.prescritor.crmv}</p>
                  {receita.prescritor.registroMapa && (
                    <p className="text-slate-600">Registro MAPA: {receita.prescritor.registroMapa}</p>
                  )}
                  {receita.prescritor.clinicaNome && (
                    <p className="text-slate-500 mt-1 italic">{receita.prescritor.clinicaNome}</p>
                  )}
                </div>

                {/* Paciente */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Paciente (Animal)
                  </span>
                  <p className="font-bold text-slate-800 text-sm">{receita.paciente.nome}</p>
                  <p className="text-slate-600 mt-0.5">
                    {[receita.paciente.especie, receita.paciente.raca].filter(Boolean).join(' • ') || 'Não especificado'}
                  </p>
                  <p className="text-slate-500">
                    {[receita.paciente.idade, receita.paciente.peso ? `${receita.paciente.peso} kg` : null].filter(Boolean).join(' • ')}
                  </p>
                </div>

                {/* Tutor */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Responsável Legal (Tutor)
                  </span>
                  <p className="font-bold text-slate-800 text-sm">{receita.tutor.nome}</p>
                  <p className="text-slate-600 mt-0.5">CPF: {receita.tutor.cpfMascarado}</p>
                  <p className="text-slate-400 text-[10px] mt-1">
                    Identificação protegida conforme legislação LGPD.
                  </p>
                </div>
              </div>
            </div>

            {/* Selo e Validação ICP-Brasil */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  receita.assinatura?.isAssinada ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {receita.assinatura?.isAssinada
                      ? 'Documento com Assinatura Digital ICP-Brasil'
                      : 'Assinatura Digital ICP-Brasil Pendente'}
                  </h4>
                  {receita.assinatura?.isAssinada ? (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Signatário: <strong>{receita.assinatura.titular}</strong> (CPF {receita.assinatura.cpfMascarado}) • {receita.assinatura.emissorAC}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700 mt-0.5">
                      Esta receita ainda não possui certificação digital qualificada.
                    </p>
                  )}
                </div>
              </div>

              {receita.assinatura?.pdfUrl && (
                <div className="flex items-center gap-2">
                  <a
                    href={receita.assinatura.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>Baixar PDF</span>
                  </a>
                  <a
                    href="https://validar.iti.gov.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-blue-200"
                  >
                    <span>Conferir no ITI</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Medicamentos Prescritos & Saldos */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                  <Pill className="w-4 h-4 text-teal-600" />
                  <span>Medicamentos Prescritos & Saldos de Dispensação</span>
                </h3>
                <span className="text-xs text-slate-500">
                  Validade: até <strong>{receita.validadeAte}</strong> ({receita.validadeDias} dias)
                </span>
              </div>

              <div className="space-y-4">
                {receita.itens.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">
                          {it.produto} {it.concentracao}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 pl-8">
                        <strong>Posologia:</strong> {it.posologia || 'Conforme orientação veterinária.'}
                      </p>
                      {it.quantidadeExtenso && (
                        <p className="text-[11px] text-slate-400 pl-8 italic">
                          Qtd por extenso: {it.quantidadeExtenso}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pl-8 md:pl-0 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Prescrito</span>
                        <span className="font-bold text-xs text-slate-700">
                          {it.quantidadePrescrita} {it.unidade}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Dispensado</span>
                        <span className="font-bold text-xs text-slate-500">
                          {it.quantidadeDispensada}
                        </span>
                      </div>
                      <div className="text-right pl-2 border-l border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-teal-700 block">Saldo Restante</span>
                        <span className={`font-black text-sm ${it.saldoRestante > 0 ? 'text-teal-700' : 'text-slate-400'}`}>
                          {it.saldoRestante} {it.unidade}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Orientações Gerais se houver */}
              {receita.orientacoes && receita.orientacoes.length > 0 && (
                <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                  <strong className="text-slate-800 font-bold block mb-1">Orientações Gerais:</strong>
                  {receita.orientacoes.map((ori, i) => (
                    <p key={i}>• {ori}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Formulário de Registro de Dispensação */}
            {receita.dispensavel && (
              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
                <div className="border-b border-slate-100 pb-4 mb-5">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-teal-600" />
                    <span>Registrar Dispensação em Farmácia</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Preencha os dados do farmacêutico e confirme as quantidades dispensadas para baixar o saldo.
                  </p>
                </div>

                <form onSubmit={handleDispensar} className="space-y-6">
                  {/* Dados do Farmacêutico & Farmácia */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">Nome Completo do Farmacêutico *</label>
                      <input
                        type="text"
                        required
                        value={farmaceuticoNome}
                        onChange={(e) => setFarmaceuticoNome(e.target.value)}
                        placeholder="Ex: Dra. Mariana Silva"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">CRF *</label>
                      <input
                        type="text"
                        required
                        value={farmaceuticoCrf}
                        onChange={(e) => setFarmaceuticoCrf(e.target.value)}
                        placeholder="Ex: 12345"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">UF do CRF *</label>
                      <select
                        value={farmaceuticoUf}
                        onChange={(e) => setFarmaceuticoUf(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                      >
                        {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((uf) => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">Nome da Farmácia / Drogaria *</label>
                      <input
                        type="text"
                        required
                        value={farmaciaNome}
                        onChange={(e) => setFarmaciaNome(e.target.value)}
                        placeholder="Ex: Drogaria Bem Estar Ltda"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">CNPJ da Farmácia *</label>
                      <input
                        type="text"
                        required
                        value={farmaciaCnpj}
                        onChange={(e) => setFarmaciaCnpj(e.target.value)}
                        placeholder="Ex: 00.000.000/0001-00"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Quantidades por Item */}
                  <div className="border-t border-slate-100 pt-5">
                    <label className="font-bold text-slate-700 text-xs block mb-3">
                      Quantidades a Dispensar Nesta Entrega:
                    </label>

                    <div className="space-y-3">
                      {receita.itens.map((it) => (
                        <div
                          key={it.index}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="max-w-md">
                            <p className="font-bold text-slate-800">
                              {it.produto} {it.concentracao}
                            </p>
                            <span className="text-[11px] text-slate-500">
                              Saldo disponível: <strong>{it.saldoRestante} {it.unidade}</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5">Lote (opcional)</span>
                              <input
                                type="text"
                                placeholder="Lote nº"
                                value={lotesPorItem[it.index] || ''}
                                onChange={(e) =>
                                  setLotesPorItem({ ...lotesPorItem, [it.index]: e.target.value })
                                }
                                className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                              />
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5">Qtd a dispensar</span>
                              <input
                                type="number"
                                min={0}
                                max={it.saldoRestante}
                                value={quantidadesADispensar[it.index] ?? it.saldoRestante}
                                onChange={(e) =>
                                  setQuantidadesADispensar({
                                    ...quantidadesADispensar,
                                    [it.index]: Math.min(it.saldoRestante, Math.max(0, Number(e.target.value))),
                                  })
                                }
                                disabled={it.saldoRestante <= 0}
                                className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-center"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Observações da Farmácia */}
                  <div>
                    <label className="font-bold text-slate-700 text-xs block mb-1">
                      Observações da Dispensação (opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={observacoesDispensa}
                      onChange={(e) => setObservacoesDispensa(e.target.value)}
                      placeholder="Observações complementares ou orientações do farmacêutico..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  {/* Declaração Legal Obrigatória */}
                  <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-teal-950 text-xs">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={declaracaoAceita}
                        onChange={(e) => setDeclaracaoAceita(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-teal-300 cursor-pointer"
                      />
                      <span>
                        <strong>Declaração de Responsabilidade Profissional:</strong> Declaro sob as penas da lei que conferi a autenticidade e validade desta prescrição veterinária, chequei a identidade do tutor ou seu portador e realizei a dispensação dos itens indicados nesta data.
                      </span>
                    </label>
                  </div>

                  {/* Botão de Registro */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={dispensando || !declaracaoAceita}
                      className="px-6 py-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-2xl shadow-md shadow-teal-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {dispensando ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Registrando Dispensação...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirmar e Registrar Dispensação</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Histórico de Dispensações Anteriores */}
            {receita.dispensacoes && receita.dispensacoes.length > 0 && (
              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
                <h3 className="font-black text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Histórico de Dispensações Desta Receita</span>
                </h3>

                <div className="space-y-2 text-xs">
                  {receita.dispensacoes.map((disp: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-800">{disp.protocolo}</span>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          {new Date(disp.data).toLocaleString('pt-BR')} • {disp.farmaciaNome} (CRF: {disp.farmaceuticoCrf})
                        </p>
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        {Array.isArray(disp.itensDispensados)
                          ? disp.itensDispensados.map((item: any) => `${item.produto} (qtd: ${item.quantidadeDispensada})`).join(', ')
                          : 'Itens registrados'}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Botão de Consulta Nova */}
            <div className="text-center pt-4">
              <button
                onClick={handleNovaConsulta}
                className="text-xs text-slate-500 hover:text-slate-700 font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Consultar outra receita</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
