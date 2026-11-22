import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { auth } from '../services/firebase';

/**
 * Troca de senha do usuário logado.
 * O Firebase exige confirmar a senha atual (reautenticação) antes de aceitar a nova.
 */
export default function AlterarSenhaCard() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const validar = (): string => {
    if (!senhaAtual) return 'Digite a sua senha atual.';
    if (novaSenha.length < 8) return 'A nova senha precisa ter pelo menos 8 caracteres.';
    if (!/[A-Za-z]/.test(novaSenha) || !/\d/.test(novaSenha)) return 'Use letras e números na nova senha.';
    if (novaSenha === senhaAtual) return 'A nova senha precisa ser diferente da atual.';
    if (novaSenha !== confirmacao) return 'A confirmação não confere com a nova senha.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }
    const user = auth.currentUser;
    if (!user || !user.email) {
      setErro('Sessão expirada. Saia e entre novamente.');
      return;
    }
    setSalvando(true);
    try {
      const credencial = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(user, credencial);
      await updatePassword(user, novaSenha);
      setSucesso('Senha alterada com sucesso.');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmacao('');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErro('A senha atual está incorreta.');
      } else if (code === 'auth/too-many-requests') {
        setErro('Muitas tentativas. Aguarde alguns minutos e tente de novo.');
      } else if (code === 'auth/weak-password') {
        setErro('Senha fraca. Use pelo menos 8 caracteres, com letras e números.');
      } else {
        setErro('Não foi possível alterar a senha. Tente novamente.');
        console.error('Erro ao alterar senha:', err);
      }
    } finally {
      setSalvando(false);
    }
  };

  const inputClass =
    'w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-700 focus:ring-2 focus:ring-primary/20';

  return (
    <div className="max-w-xl bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-primary" /> Alterar senha
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase">Senha atual</label>
          <input
            type={mostrar ? 'text' : 'password'}
            autoComplete="current-password"
            value={senhaAtual}
            onChange={e => setSenhaAtual(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase">Nova senha</label>
          <input
            type={mostrar ? 'text' : 'password'}
            autoComplete="new-password"
            value={novaSenha}
            onChange={e => setNovaSenha(e.target.value)}
            className={inputClass}
          />
          <span className="text-[10px] text-slate-400 block">Mínimo de 8 caracteres, com letras e números.</span>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase">Confirmar nova senha</label>
          <input
            type={mostrar ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmacao}
            onChange={e => setConfirmacao(e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          type="button"
          onClick={() => setMostrar(!mostrar)}
          className="text-xs text-slate-500 flex items-center gap-1 hover:text-slate-700"
        >
          {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {mostrar ? 'Ocultar senhas' : 'Mostrar senhas'}
        </button>

        {erro && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}
          </div>
        )}
        {sucesso && (
          <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> {sucesso}
          </div>
        )}

        <button
          type="submit"
          disabled={salvando}
          className="w-full bg-primary text-white font-bold rounded-xl py-3 text-sm hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </form>
    </div>
  );
}
