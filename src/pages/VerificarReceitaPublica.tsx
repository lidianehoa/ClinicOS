import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download, ExternalLink, AlertTriangle, FileCheck, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { getReceitaPublica, VerificacaoReceitaPublica } from '../services/dataService';

export const VerificarReceitaPublica: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [receita, setReceita] = useState<VerificacaoReceitaPublica | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extrair o código de 10 caracteres da URL:
  // Suporta rotas: /{tenantSlug}/verificar/{codigo} ou /verificar/{codigo}
  const extractCodeFromPath = (): string => {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    const verificarIdx = parts.indexOf('verificar');
    if (verificarIdx !== -1 && parts[verificarIdx + 1]) {
      return parts[verificarIdx + 1].toUpperCase();
    }
    // Fallback: query parameter ?codigo=...
    const urlParams = new URLSearchParams(window.location.search);
    return (urlParams.get('codigo') || '').toUpperCase();
  };

  const codigo = extractCodeFromPath();

  useEffect(() => {
    if (!codigo) {
      setLoading(false);
      setError('Código de conferência não informado na URL.');
      return;
    }

    getReceitaPublica(codigo)
      .then(res => {
        if (!res) {
          setError(`Nenhuma receita encontrada com o código "${codigo}". Verifique o endereço digitado.`);
        } else {
          setReceita(res);
        }
      })
      .catch(err => {
        console.error('Erro ao consultar receita pública:', err);
        setError('Ocorreu um erro ao consultar os dados de autenticidade da receita. Tente novamente mais tarde.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [codigo]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800 font-sans p-4 md:p-8">
      <div className="max-w-2xl mx-auto w-full pt-4 md:pt-10">
        
        {/* Topo / Logo */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black shadow-md shadow-teal-600/20">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">ClinicOS Autentica</span>
              <h1 className="text-lg font-black text-slate-900 leading-tight">Portal de Conferência de Receitas</h1>
            </div>
          </div>
          <span className="text-[11px] font-mono bg-slate-200/80 px-2.5 py-1 rounded-md text-slate-600">
            ICP-Brasil
          </span>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-200 flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-600">Verificando autenticidade do documento...</p>
          </div>
        ) : error || !receita ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-rose-200 text-center space-y-4">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Documento Não Localizado</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">{error}</p>
            <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
              Dúvidas? Entre em contato diretamente com o médico veterinário ou a clínica emissora.
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-6">
            
            {/* Status Header */}
            {receita.status === 'assinada' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-bold text-emerald-950 uppercase tracking-wide">
                    Documento Válido e Assinado Digitalmente
                  </h2>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Assinatura eletrônica qualificada com certificado ICP-Brasil em conformidade com a MP 2.200-2/2001 e normas do CFMV.
                  </p>
                </div>
              </div>
            )}

            {receita.status === 'aguardando_assinatura' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-bold text-amber-950 uppercase tracking-wide">
                    Aguardando Assinatura Digital
                  </h2>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Esta receita foi emitida no sistema e aguarda a assinatura digital qualificada do médico veterinário.
                  </p>
                </div>
              </div>
            )}

            {receita.status === 'substituida' && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-bold text-orange-950 uppercase tracking-wide">
                    Receita Substituída por Nova Versão
                  </h2>
                  <p className="text-xs text-orange-800 mt-0.5">
                    Esta receita médica foi corrigida ou atualizada pelo veterinário. Ela não deve mais ser dispensada em farmácias.
                  </p>
                </div>
              </div>
            )}

            {receita.status === 'cancelada' && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
                <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-bold text-rose-950 uppercase tracking-wide">
                    Receita Cancelada
                  </h2>
                  <p className="text-xs text-rose-800 mt-0.5">
                    Esta receita foi revogada ou cancelada pelo profissional emissor e perdeu sua validade.
                  </p>
                </div>
              </div>
            )}

            {/* Dados Principais do Documento */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Declaração de Emissão Profissional
                </span>
                <p className="text-sm font-medium text-slate-900 leading-relaxed">
                  Receita emitida por{' '}
                  <strong className="font-bold text-teal-800">{receita.nomeVeterinario}</strong>,{' '}
                  CRMV <strong className="font-bold text-teal-800">{receita.crmvVeterinario}</strong>,{' '}
                  em <strong className="font-bold">{formatDate(receita.dataEmissao)}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Código de Autenticidade</span>
                  <span className="text-sm font-mono font-bold text-teal-700">{receita.codigo}</span>
                </div>
                {receita.dataAssinatura && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Data/Hora da Assinatura</span>
                    <span className="text-sm font-medium text-slate-800">{formatDateTime(receita.dataAssinatura)}</span>
                  </div>
                )}
              </div>

              {receita.hashSha256 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Resumo Criptográfico do Documento (SHA-256)</span>
                  <p className="text-[11px] font-mono break-all text-slate-600 bg-white p-2 rounded-lg border border-slate-200 select-all">
                    {receita.hashSha256}
                  </p>
                </div>
              )}
            </div>

            {/* Botão de Download do PDF Oficial */}
            {receita.pdfUrl && receita.status === 'assinada' && (
              <div className="pt-2">
                <a
                  href={receita.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Baixar PDF Oficial Assinado
                </a>
              </div>
            )}

            {/* Caixa de Validação Oficial Governamental (ITI) */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-700" />
                <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  Validação Oficial no Governo Federal (ITI)
                </h3>
              </div>
              <p className="text-xs text-indigo-900/80 leading-relaxed">
                Para comprovação independente da cadeia de confiança ICP-Brasil e formato PAdES, faça o download do PDF assinado acima e realize a validação oficial no portal do <strong>Instituto Nacional de Tecnologia da Informação (ITI)</strong>:
              </p>
              <a
                href="https://validar.iti.gov.br"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                <span>Validar em validar.iti.gov.br</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="block text-[10px] text-indigo-600">
                * O validador do ITI verifica a integridade do carimbo de tempo, certificados das Autoridades Certificadoras (ACs) e o padrão criptográfico.
              </span>
            </div>

            {/* Aviso de Privacidade / LGPD */}
            <div className="pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                Em respeito à Lei Geral de Proteção de Dados (LGPD) e sigilo médico-veterinário, dados pessoais do tutor e do paciente animal não são expostos publicamente nesta página de consulta.
              </p>
            </div>

          </div>
        )}

      </div>

      {/* Rodapé da Página */}
      <footer className="text-center py-6 text-xs text-slate-400">
        ClinicOS • Sistema de Gestão Médico-Veterinária com Assinatura Digital ICP-Brasil
      </footer>
    </div>
  );
};

export default VerificarReceitaPublica;
