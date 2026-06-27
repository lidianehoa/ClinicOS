import { useState } from 'react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from '../services/firebase';
import { saveUserProfile, getStaffByEmail, type UserRole, type AppUser } from '../services/dataService';
import { 
  Mail, 
  Lock,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Auth = () => {
  const { t } = useTranslation(['auth', 'common']);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Auto-detect if user is already authenticated but missing profile
  useState(() => {
    if (auth.currentUser && isLogin) {
      setIsLogin(false); // Force register mode to complete profile
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      } else {
        // First Access Logic
        const staffRecord = await getStaffByEmail(cleanEmail);
        
        if (!staffRecord) {
          throw new Error('email-not-authorized');
        }

        let user = auth.currentUser;
        
        if (!user) {
          const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
          user = userCredential.user;
        }

        // Map accessLevel to UserRole
        let mappedRole: UserRole = 'auxiliar';
        if (staffRecord.accessLevel === 'Professional') mappedRole = 'veterinario';
        if (staffRecord.accessLevel === 'Manager') mappedRole = 'gerente';
        if (staffRecord.accessLevel === 'Admin') mappedRole = 'administrador';

        const profile: AppUser = {
          uid: user.uid,
          nome: staffRecord.name,
          email: user.email || cleanEmail,
          role: mappedRole,
          crmv: staffRecord.professionalId || '',
          status: 'ativo',
          photoURL: user.photoURL || null,
          staffId: staffRecord.id
        };

        await saveUserProfile(profile);
      }
    } catch (err: any) {
      console.error('Erro Auth:', err);
      let msg = 'Ocorreu um erro técnico. Verifique sua conexão.';
      
      if (err.message === 'email-not-authorized') msg = 'E-mail não autorizado. O administrador precisa cadastrá-lo em Configurações.';
      if (err.code === 'auth/invalid-credential') msg = 'Email ou senha incorretos.';
      if (err.code === 'auth/user-not-found') msg = 'Utilizador não encontrado.';
      if (err.code === 'auth/wrong-password') msg = 'Senha incorreta.';
      if (err.code === 'auth/invalid-email') msg = 'Formato de email inválido.';
      if (err.code === 'auth/email-already-in-use') msg = 'Este email já possui senha cadastrada.';
      if (err.code === 'auth/weak-password') msg = 'A nova senha deve ter pelo menos 6 caracteres.';
      if (err.code === 'auth/unauthorized-domain') msg = 'Domínio não autorizado no Firebase Console.';
      if (err.code === 'auth/network-request-failed') msg = 'Falha na rede. Verifique sua internet.';
      if (err.code === 'auth/too-many-requests') msg = 'Muitas tentativas. Tente novamente mais tarde.';
      if (err.code === 'permission-denied') msg = 'Erro de permissão ao criar perfil. Contacte o administrador.';
      
      // Se for um erro desconhecido, mostra a mensagem técnica para diagnóstico
      if (msg === 'Ocorreu um erro técnico. Verifique sua conexão.' && err.message) {
        msg = `Erro: ${err.message}`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-base overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[120px] animate-pulse" />

      <div className="w-full max-w-md px-6 relative z-10">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[40px] p-8 md:p-10 shadow-2xl shadow-black/20">
          <div className="flex flex-col items-center mb-10 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              {isLogin ? t('login_title') : t('register_title', 'Primeiro Acesso')}
            </h1>
            <p className="text-white/60 text-sm">
              {isLogin 
                ? t('login_subtitle', 'Acesse o sistema de gestão do ClinicOS') 
                : t('register_subtitle', 'Cadastre sua senha para acessar o sistema')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-2">
              <label className="text-white/80 text-sm font-medium ml-2">{t('email_label')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('email_placeholder')}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-white/80 text-sm font-medium ml-2">{isLogin ? t('password_label') : t('new_password_label', 'Nova Senha')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('password_placeholder')}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>



            {error && (
              <div className="flex items-center gap-3 bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-2xl text-sm animate-in zoom-in-95 duration-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-pink-600 hover:to-purple-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? t('login_button') : t('register_button', 'Cadastrar Senha')}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-white/60 hover:text-white transition-colors text-sm font-medium"
            >
              {isLogin ? (
                <>{t('first_access_prompt', 'Primeiro acesso ao sistema?')} <span className="text-primary">{t('register_button', 'Cadastrar Senha')}</span></>
              ) : (
                <>{t('already_have_password', 'Já possui uma senha?')} <span className="text-primary">{t('do_login', 'Fazer Login')}</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
