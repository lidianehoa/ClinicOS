import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { MessageCircle, KeyRound, Copy, Check, AlertCircle } from 'lucide-react';
import { app, db, functions, httpsCallable } from '../services/firebase';
import { getActiveTenantId } from '../services/dataService';

/**
 * Configurações → Integrações → VetZap CRM.
 * Gera a chave que a extensão usa para enviar leads e buscar o status dos clientes.
 * A chave aparece uma vez só; no banco fica apenas o hash.
 */
export default function VetzapIntegracaoCard() {
  const tenantId = getActiveTenantId();
  const urlApi = `https://us-central1-${app.options.projectId}.cloudfunctions.net/vetzapApi`;
  const [info, setInfo] = useState<{ finalChave?: string; geradaEm?: string } | null>(null);
  const [chave, setChave] = useState('');
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState<'' | 'chave' | 'url'>('');

  useEffect(() => {
    if (!db || !tenantId) return;
    getDoc(doc(db, 'clinicas', tenantId, 'config', 'integracao_vetzap'))
      .then(s => setInfo(s.exists() ? (s.data() as any) : null))
      .catch(() => setInfo(null));
  }, [tenantId]);

  const gerar = async () => {
    if (info && !confirm('Gerar uma chave nova desliga a chave atual. A extensão vai precisar da chave nova. Continuar?')) return;
    setGerando(true);
    setErro('');
    try {
      const fn = httpsCallable<{ tenantId: string }, { chave: string }>(functions, 'vetzapGerarChave');
      const r = await fn({ tenantId });
      setChave(r.data.chave);
      setInfo({ finalChave: r.data.chave.slice(-4), geradaEm: new Date().toISOString() });
    } catch (e: any) {
      setErro(String(e?.message || 'Não foi possível gerar a chave.').replace(/^[a-z0-9_-]+:\s*/i, ''));
    } finally {
      setGerando(false);
    }
  };

  const copiar = async (texto: string, qual: 'chave' | 'url') => {
    await navigator.clipboard.writeText(texto);
    setCopiado(qual);
    setTimeout(() => setCopiado(''), 1500);
  };

  return (
    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
        <div className="p-2 bg-teal-50 rounded-lg text-teal-700">
          <MessageCircle className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-slate-700">VetZap CRM (WhatsApp)</h3>
        <span className={`px-2 py-1 rounded text-xs font-bold ml-auto ${info ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
          {info ? `Chave ativa ••••${info.finalChave || ''}` : 'Não configurado'}
        </span>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed">
        Liga a extensão VetZap ao ClinicOS: o contato do WhatsApp vira tutor (e pet) aqui com um clique, e a etapa do contato no
        VetZap muda sozinha quando a consulta é agendada, realizada ou vira retorno.
      </p>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Endereço da API (cole no VetZap)</label>
        <div className="flex gap-2">
          <input readOnly value={urlApi} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-mono" />
          <button type="button" onClick={() => copiar(urlApi, 'url')} className="px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600">
            {copiado === 'url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {chave && (
        <div className="space-y-1.5 bg-pink-50 border border-pink-200 rounded-xl p-4">
          <label className="text-[11px] font-bold text-pink-800 uppercase tracking-wider">Sua chave (aparece só agora)</label>
          <div className="flex gap-2">
            <input readOnly value={chave} className="flex-1 bg-white border border-pink-200 rounded-xl py-2.5 px-4 text-xs font-mono" />
            <button type="button" onClick={() => copiar(chave, 'chave')} className="px-3 rounded-xl bg-teal-700 text-white hover:bg-teal-800">
              {copiado === 'chave' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-pink-900">Copie e cole nas Configurações do VetZap. Não compartilhe: quem tiver a chave consegue criar tutores na sua clínica.</p>
        </div>
      )}

      {erro && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}
        </div>
      )}

      <button
        type="button"
        onClick={gerar}
        disabled={gerando}
        className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl py-2.5 px-5 disabled:opacity-50"
      >
        <KeyRound className="w-4 h-4" />
        {gerando ? 'Gerando...' : info ? 'Gerar nova chave' : 'Gerar chave do VetZap'}
      </button>
    </div>
  );
}
