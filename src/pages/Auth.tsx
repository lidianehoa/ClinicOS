import { useState } from 'react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from '../services/firebase';
import { 
  saveUserProfile, 
  resolveTenantByEmail, 
  registerClinic,
  setActiveTenantId,
  type UserRole, 
  type AppUser 
} from '../services/dataService';
import { 
  Mail, 
  Lock,
  AlertCircle,
  ArrowRight,
  Building2,
  User,
  Phone,
  CheckCircle2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

type AuthMode = 'login' | 'first_access' | 'new_clinic';

const Auth = () => {
  const { t } = useTranslation(['auth', 'common']);
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [crmv, setCrmv] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      if (mode === 'login') {
        // ── LOGIN NORMAL ──────────────────────────────────────────────────
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      } else if (mode === 'first_access') {
        // ── PRIMEIRO ACESSO (RESOLUÇÃO SEGURA VIA BACKEND / CLOUD FUNCTION) ──
        const lookup = await resolveTenantByEmail(cleanEmail);
        
        if (!lookup.found || !lookup.defaultTenantId) {
          throw new Error('email-not-authorized');
        }

        const targetTenantId = lookup.defaultTenantId;
        setActiveTenantId(targetTenantId);

        let user = auth.currentUser;
        if (!user) {
          const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
          user = userCredential.user;
        }

        const roleToAssign: UserRole = (lookup.tenants?.[0]?.role as UserRole) || 'veterinario';

        const profile: AppUser = {
          uid: user.uid,
          nome: cleanEmail.split('@')[0],
          email: cleanEmail,
          role: roleToAssign,
          status: 'ativo',
          photoURL: user.photoURL || null,
          activeTenantId: targetTenantId,
          tenants: lookup.tenants ? lookup.tenants.map(t => t.tenantId) : [targetTenantId]
        };

        await saveUserProfile(profile);
      } else if (mode === 'new_clinic') {
        // ── ONBOARDING DE NOVA CLÍNICA ────────────────────────────────────
        if (!clinicName.trim() || !ownerName.trim()) {
          throw new Error('missing-fields');
        }

        try {
          // Tentativa 1: Via Cloud Function backend
          const res = await registerClinic({
            clinicName: clinicName.trim(),
            ownerName: ownerName.trim(),
            email: cleanEmail,
            password: cleanPassword,
            phone: phone.trim(),
            crmv: crmv.trim(),
          });
          
          if (res.success && res.tenantId) {
            setActiveTenantId(res.tenantId);
            await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
          }
        } catch (fnErr: any) {
          console.warn('Fallback para criação direta de clínica no cliente:', fnErr);
          // Fallback seguro caso Cloud Functions não esteja rodando localmente
          const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
          const user = userCredential.user;

          const slug = clinicName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '_')
            .slice(0, 25);
          const newTenantId = `clinic_${slug}_${Date.now().toString(36)}`;
          setActiveTenantId(newTenantId);

          const profile: AppUser = {
            uid: user.uid,
            nome: ownerName.trim(),
            email: cleanEmail,
            role: 'administrador',
            crmv: crmv.trim(),
            status: 'ativo',
            activeTenantId: newTenantId,
            tenants: [newTenantId],
            clinicName: clinicName.trim()
          };

          await saveUserProfile(profile);
        }
      }
    } catch (err: any) {
      console.error('Erro Auth:', err);
      let msg = 'Ocorreu um erro técnico. Verifique sua conexão.';
      
      if (err.message === 'email-not-authorized') msg = 'E-mail não autorizado. Solicite ao administrador da sua clínica o cadastro em Configurações > Equipe.';
      if (err.message === 'missing-fields') msg = 'Por favor, preencha todos os campos obrigatórios.';
      if (err.code === 'auth/invalid-credential') msg = 'Email ou senha incorretos.';
      if (err.code === 'auth/user-not-found') msg = 'Usuário não encontrado.';
      if (err.code === 'auth/wrong-password') msg = 'Senha incorreta.';
      if (err.code === 'auth/invalid-email') msg = 'Formato de email inválido.';
      if (err.code === 'auth/email-already-in-use') msg = 'Este email já possui senha cadastrada. Faça login.';
      if (err.code === 'auth/weak-password') msg = 'A nova senha deve ter pelo menos 6 caracteres.';
      if (err.code === 'auth/network-request-failed') msg = 'Falha na rede. Verifique sua internet.';
      if (err.code === 'auth/too-many-requests') msg = 'Muitas tentativas. Tente novamente mais tarde.';
      
      if (msg === 'Ocorreu um erro técnico. Verifique sua conexão.' && err.message) {
        msg = `Erro: ${err.message}`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-clinic-900 overflow-hidden relative py-10">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-clinic-500/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-clinic-300/20 rounded-full blur-[120px] animate-pulse" />

      <div className="w-full max-w-md px-6 relative z-10">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[40px] p-8 md:p-10 shadow-2xl shadow-black/20">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-56 bg-[#FBF7EE] rounded-3xl px-4 py-3 mb-4 shadow-lg ring-1 ring-pink-300/60">
              <img src="/logo-dra-lidiane.png" alt="Dra. Lidiane — Médica Veterinária" className="w-full h-auto object-contain" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1.5">
              {mode === 'login' && t('login_title', 'Acessar ClinicOS')}
              {mode === 'first_access' && t('register_title', 'Primeiro Acesso')}
              {mode === 'new_clinic' && 'Cadastrar Nova Clínica'}
            </h1>
            <p className="text-white/60 text-xs md:text-sm">
              {mode === 'login' && 'Gestão veterinária segura e multi-clínica'}
              {mode === 'first_access' && 'Cadastre sua senha para acessar sua clínica'}
              {mode === 'new_clinic' && 'Crie sua conta administrativa e ative sua unidade'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'new_clinic' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-white/80 text-xs font-medium ml-2">Nome da Clínica / Hospital</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      required
                      value={clinicName}
                      onChange={e => setClinicName(e.target.value)}
                      placeholder="Ex: Clínica Veterinária São Francisco"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-clinic-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-white/80 text-xs font-medium ml-2">Nome do Responsável / Gestor</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={e => setOwnerName(e.target.value)}
                      placeholder="Ex: Dra. Juliana Souza"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-clinic-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-white/80 text-xs font-medium ml-2">Telefone / WhatsApp</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type="text"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-clinic-500/50 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-white/80 text-xs font-medium ml-2">CRMV (Opcional)</label>
                    <input
                      type="text"
                      value={crmv}
                      onChange={e => setCrmv(e.target.value)}
                      placeholder="CRMV-SP 12345"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-clinic-500/50 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-white/80 text-xs font-medium ml-2">{t('email_label', 'E-mail')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('email_placeholder', 'seu@email.com')}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-clinic-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-white/80 text-xs font-medium ml-2">
                {mode === 'login' ? t('password_label', 'Senha') : 'Criar Nova Senha'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('password_placeholder', '••••••••')}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-clinic-500/50 transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-2xl text-xs animate-in zoom-in-95 duration-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 px-4 py-3 rounded-2xl text-xs animate-in zoom-in-95 duration-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-clinic-600 to-clinic-500 hover:from-clinic-700 hover:to-clinic-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-clinic-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 group text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' && t('login_button', 'Entrar')}
                  {mode === 'first_access' && 'Ativar Minha Senha'}
                  {mode === 'new_clinic' && 'Criar e Acessar Clínica'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Alternadores de modo */}
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-2.5 text-center text-xs">
            {mode !== 'login' && (
              <button
                onClick={() => { setMode('login'); setError(null); }}
                className="text-clinic-300 hover:text-white transition-colors font-medium"
              >
                Já possui uma senha? <span className="underline">Fazer Login</span>
              </button>
            )}

            {mode !== 'first_access' && (
              <button
                onClick={() => { setMode('first_access'); setError(null); }}
                className="text-white/60 hover:text-white transition-colors font-medium"
              >
                Primeiro acesso à clínica? <span className="text-clinic-400 underline">Cadastrar Senha</span>
              </button>
            )}

            {mode !== 'new_clinic' && (
              <button
                onClick={() => { setMode('new_clinic'); setError(null); }}
                className="text-white/60 hover:text-white transition-colors font-medium"
              >
                Deseja criar uma nova clínica? <span className="text-clinic-400 underline">Cadastrar Clínica</span>
              </button>
            )}
          </div>
        </div>
        <p className="text-center text-[11px] text-white/50 mt-6">
          © {new Date().getFullYear()} · Tecnologia desenvolvida por{' '}
          <span className="text-pink-300 font-semibold">Lidiane Helena – DUOVET</span>
        </p>
      </div>
    </div>
  );
};

export default Auth;

