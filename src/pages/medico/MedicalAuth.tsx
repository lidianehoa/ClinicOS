import { useState } from 'react';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../../services/firebase';
import { 
  saveUserProfile, 
  resolveTenantByEmail, 
  setActiveTenantId, 
  registerClinic,
  type UserRole, 
  type AppUser 
} from '../../services/dataService';
import { Activity, Stethoscope, ArrowLeft, Loader2, AlertCircle, Zap, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DEMO_EMAIL    = 'demo.medico@clinicos.app';
const DEMO_PASSWORD = 'Demo@2025!';

type AuthMode = 'login' | 'register-invited' | 'register-new' | 'register-autonomous';

const MedicalAuth = () => {
  const { t } = useTranslation(['auth', 'common']);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Campos para login e register-invited
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Novos campos para register-new
  const [nome, setNome] = useState('');
  const [clinicName, setClinicName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      } else if (authMode === 'register-new' || authMode === 'register-autonomous') {
        const cleanNome = nome.trim();
        let cleanClinicName = clinicName.trim();

        if (authMode === 'register-autonomous') {
          cleanClinicName = `Atendimento Domiciliar - ${cleanNome}`;
          if (!cleanNome) {
              throw new Error('missing-fields');
          }
        } else {
          if (!cleanNome || !cleanClinicName) {
              throw new Error('missing-fields');
          }
        }

        const result = await registerClinic({
            clinicName: cleanClinicName,
            ownerName: cleanNome,
            email: cleanEmail,
            password: cleanPassword
        });

        if (result.success && result.tenantId) {
            setActiveTenantId(result.tenantId);
            // registerNewClinic (Cloud Function) já cria o usuário no Auth
            // Vamos apenas logar com ele agora:
            await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        } else {
            throw new Error('register-failed');
        }

      } else {
        // register-invited
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
          crmv: '',
          status: 'ativo',
          photoURL: user.photoURL || null,
          activeTenantId: targetTenantId,
          tenants: lookup.tenants ? lookup.tenants.map(t => t.tenantId) : [targetTenantId]
        };

        await saveUserProfile(profile);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'email-not-authorized') {
        setError('E-mail não autorizado. O administrador precisa cadastrá-lo nas Configurações.');
      } else if (err.message === 'missing-fields') {
        setError('Preencha todos os campos obrigatórios.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A nova senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Ocorreu um erro ao tentar processar o acesso. Tente novamente.');
      }
      setLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setDemoLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
    } catch (err: any) {
      console.error(err);
      setError('Acesso demo temporariamente indisponível. Tente novamente em alguns instantes.');
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-800 via-teal-700 to-teal-600 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none transform -translate-x-1/3 translate-y-1/3" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-800/80 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-3xl shadow-2xl">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-teal-500/20">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{t('common:app_name')}</h1>
            <div className="flex items-center gap-2 mt-2 text-teal-400 font-medium tracking-widest uppercase text-sm">
              <Stethoscope className="w-4 h-4" />
              <span>{t('medical_login_title')}</span>
            </div>
            {authMode === 'register-invited' && (
              <p className="mt-4 text-sm text-slate-400 text-center">
                {t('register_subtitle', 'Cadastre sua senha para acessar o sistema')}
              </p>
            )}
            {authMode === 'register-new' && (
              <p className="mt-4 text-sm text-slate-400 text-center">
                Crie sua clínica e comece a gerenciar seus pacientes
              </p>
            )}
            {authMode === 'register-autonomous' && (
              <p className="mt-4 text-sm text-slate-400 text-center">
                Crie sua conta para Atendimento Domiciliar
              </p>
            )}
          </div>

          {/* ─── DEMO ACCESS ─────────────────────────────── */}
          {authMode === 'login' && (
            <>
              <button
                onClick={handleDemoAccess}
                disabled={demoLoading || loading}
                className="w-full mb-6 relative group bg-gradient-to-r from-teal-500/20 to-teal-500/20 hover:from-teal-500/30 hover:to-teal-500/30 border border-teal-500/30 hover:border-teal-400/50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 overflow-hidden disabled:opacity-60"
              >
                {/* shimmer */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
                {demoLoading
                  ? <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
                  : <Zap className="w-5 h-5 text-teal-400" />
                }
                <span className="relative">{demoLoading ? t('demo_loading', 'Entrando no demo...') : t('demo_button', 'Acessar como Demo')}</span>
                <span className="relative bg-teal-500/30 text-teal-300 text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full">
                  {t('demo_free', 'Grátis')}
                </span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{t('or_login', 'ou entre com sua conta')}</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            </>
          )}

          {/* ─── LOGIN / REGISTER FORM ──────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {(authMode === 'register-new' || authMode === 'register-autonomous') && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300 ml-1">Seu Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Ex: Dra. Ana Paula"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  />
                </div>
                {authMode === 'register-new' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300 ml-1">Nome da Clínica ou Consultório</label>
                    <input
                      type="text"
                      required
                      value={clinicName}
                      onChange={e => setClinicName(e.target.value)}
                      placeholder="Ex: Clínica Vida Animal"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                    />
                  </div>
                )}
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300 ml-1">{t('email_label')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="dr.nome@clinica.com"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300 ml-1">{authMode === 'login' ? t('password_label') : t('new_password_label', 'Nova Senha')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('password_placeholder')}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-slate-500 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || demoLoading}
              className="w-full bg-teal-400 hover:bg-teal-300 text-teal-900 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-teal-900/20 disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                authMode === 'login' ? t('medical_login_button') : 
                authMode === 'register-new' ? 'Criar Clínica' : 
                authMode === 'register-autonomous' ? 'Criar Conta' :
                t('register_button', 'Cadastrar Senha')
              )}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 text-center">
            {authMode !== 'login' && (
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
              >
                {t('already_have_password', 'Já possui uma senha?')} <span className="text-teal-400">{t('do_login', 'Fazer Login')}</span>
              </button>
            )}

            {authMode !== 'register-invited' && (
              <button
                type="button"
                onClick={() => setAuthMode('register-invited')}
                className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
              >
                Fui convidado pela clínica. <span className="text-teal-400">Cadastrar Senha</span>
              </button>
            )}

            {authMode !== 'register-new' && (
              <button
                type="button"
                onClick={() => setAuthMode('register-new')}
                className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
              >
                Tenho uma clínica ou consultório. <span className="text-teal-400">Criar Clínica</span>
              </button>
            )}

            {authMode !== 'register-autonomous' && (
              <button
                type="button"
                onClick={() => setAuthMode('register-autonomous')}
                className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
              >
                Atendo a domicílio (Autônomo). <span className="text-teal-400">Criar Conta</span>
              </button>
            )}
          </div>
        </div>

        {/* Demo info card */}
        <div className="mt-4 bg-teal-500/5 border border-teal-500/10 rounded-2xl p-4 text-center space-y-1">
          <p className="text-xs font-bold text-teal-400 uppercase tracking-widest">{t('setup:demo_access', { defaultValue: 'Acesso Demo' })}</p>
          <p className="text-xs text-slate-400">{t('demo_description', 'Explore o portal completo sem compromisso. Dados reais da clínica para demonstração.')}</p>
        </div>

        <div className="mt-4 text-center">
          <a href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('back_to_admin').replace('← ', '')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default MedicalAuth;
