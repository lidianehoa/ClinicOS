import { useState } from 'react';
import {
  Terminal, CheckCircle, Copy, ChevronDown, ChevronUp,
  Server, Database, Lock, Rocket, User, Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TENANT_ID = import.meta.env.VITE_APP_TENANT_ID || 'clinicos_demo';
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || '(not configured)';
const IS_DEV = import.meta.env.DEV;

// ── CodeBlock ─────────────────────────────────────────────────────────────────
function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group my-3">
      <pre className="bg-slate-900 text-green-400 text-xs font-mono p-4 rounded-xl overflow-x-auto leading-relaxed whitespace-pre-wrap">
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1"
      >
        {copied ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

// ── StepCard ──────────────────────────────────────────────────────────────────
function StepCard({
  step, icon: Icon, title, color, children
}: {
  step: number;
  icon: any;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(step === 1);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors text-left"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 ${color}`}>
          {step}
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color.replace('bg-', 'bg-').replace('500', '50').replace('600', '50').replace('700', '50')}`}>
          <Icon className={`w-4 h-4`} style={{ color: 'inherit' }} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ── InfoBadge ─────────────────────────────────────────────────────────────────
function InfoBadge({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono font-bold text-slate-800">{value}</span>
        <div className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-400'}`} />
      </div>
    </div>
  );
}

// ── SetupGuide ────────────────────────────────────────────────────────────────
export default function SetupGuide() {
  const { t } = useTranslation(['admin', 'common']);
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
              <Terminal className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">{t('admin:setup.title', 'ClinicOS — Setup Guide')}</h1>
              <p className="text-slate-500 text-sm font-medium">{t('admin:setup.subtitle', 'Deploy a new clinic instance in 6 steps')}</p>
            </div>
          </div>

          {/* Current Instance Info */}
          <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
            <h2 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">
              Current Instance Info
            </h2>
            <div className="space-y-2">
              <InfoBadge
                label="Tenant ID"
                value={TENANT_ID}
                ok={TENANT_ID !== 'clinicos_demo' && TENANT_ID !== 'your_clinic_id'}
              />
              <InfoBadge
                label="Firebase Project"
                value={PROJECT_ID}
                ok={PROJECT_ID !== '(not configured)'}
              />
              <InfoBadge
                label="Environment"
                value={IS_DEV ? 'Development' : 'Production'}
                ok={true}
              />
              <InfoBadge
                label="Firestore Namespace"
                value={`/artifacts/${TENANT_ID}/...`}
                ok={true}
              />
            </div>
            {TENANT_ID === 'clinicos_demo' && (
              <div className="mt-4 flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs font-medium">
                ⚠️ You are using the default demo tenant ID. Set{' '}
                <code className="font-mono bg-amber-100 px-1 rounded">VITE_APP_TENANT_ID</code>
                {' '}in your <code className="font-mono bg-amber-100 px-1 rounded">.env</code> file to create an isolated instance.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">

        <StepCard step={1} icon={Terminal} title="Clone the repository & install dependencies" color="bg-indigo-600">
          <div className="pt-4 space-y-2 text-sm text-slate-600">
            <p>Clone the repository and install Node.js dependencies.</p>
            <CodeBlock>{`git clone https://github.com/lidianehoa/ClinicOS
cd ClinicOS
npm install`}</CodeBlock>
            <div className="text-xs text-slate-500">Requires Node.js 18+ and npm.</div>
          </div>
        </StepCard>

        <StepCard step={2} icon={Server} title="Configure environment variables" color="bg-teal-600">
          <div className="pt-4 space-y-2 text-sm text-slate-600">
            <p>Copy the template and fill in your values:</p>
            <CodeBlock>{`cp .env.example .env`}</CodeBlock>
            <p>Then edit <code className="bg-slate-100 px-1 rounded font-mono text-xs">.env</code> and set your unique tenant ID:</p>
            <CodeBlock>{`# .env
VITE_APP_TENANT_ID=my_clinic_name   # unique per client
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=my-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=my-project
VITE_FIREBASE_STORAGE_BUCKET=my-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123...`}</CodeBlock>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
              <strong className="text-slate-700">Tenant ID rules:</strong> Use only lowercase letters, numbers and underscores.
              Each unique ID creates a completely isolated data namespace in Firestore.
            </div>
          </div>
        </StepCard>

        <StepCard step={3} icon={Database} title="Create a Firebase project" color="bg-teal-600">
          <div className="pt-4 space-y-3 text-sm text-slate-600">
            <ol className="space-y-2 list-none">
              {[
                'Go to console.firebase.google.com',
                'Click "Create a project" → name it',
                'In Build → Authentication → Get started → Email/Password → Enable',
                'In Build → Firestore Database → Create database → Start in production mode',
                'In Project Settings → Your apps → Add app (Web) → Register',
                'Copy the firebaseConfig values to your .env',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </StepCard>

        <StepCard step={4} icon={Lock} title="Deploy Firestore Security Rules" color="bg-amber-600">
          <div className="pt-4 space-y-2 text-sm text-slate-600">
            <p>Install Firebase CLI and deploy the rules that protect your data:</p>
            <CodeBlock>{`npm install -g firebase-tools
firebase login
firebase use --add   # select your project
firebase deploy --only firestore:rules`}</CodeBlock>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              ⚠️ <strong>Important:</strong> Without deploying these rules, your Firestore is in
              open mode and any user can read all data. Always deploy rules before sharing the app URL.
            </div>
            <p className="text-xs text-slate-500">
              The rules file is at <code className="bg-slate-100 px-1 rounded font-mono">firestore.rules</code> in the project root.
              All data access requires Firebase Authentication.
            </p>
          </div>
        </StepCard>

        <StepCard step={5} icon={Rocket} title="Run locally or deploy to production" color="bg-emerald-600">
          <div className="pt-4 space-y-4 text-sm text-slate-600">
            <div>
              <p className="font-bold text-slate-700 mb-2">Development:</p>
              <CodeBlock>{`npm run dev`}</CodeBlock>
            </div>
            <div>
              <p className="font-bold text-slate-700 mb-2">Production — Vercel (recommended):</p>
              <CodeBlock>{`# Install Vercel CLI
npm install -g vercel

# Deploy (first time)
vercel deploy

# Set environment variables in Vercel Dashboard:
# Project → Settings → Environment Variables
# Add all variables from your .env file`}</CodeBlock>
            </div>
            <div>
              <p className="font-bold text-slate-700 mb-2">Production — Firebase Hosting:</p>
              <CodeBlock>{`npm run build
firebase deploy --only hosting`}</CodeBlock>
            </div>
          </div>
        </StepCard>

        <StepCard step={6} icon={User} title="Create the first admin user" color="bg-rose-600">
          <div className="pt-4 space-y-3 text-sm text-slate-600">
            <ol className="space-y-2 list-none">
              {[
                'Open the deployed app URL',
                'Register a user with email and password',
                'Go to Firebase Console → Firestore Database',
                `Navigate to: bea_data → ${TENANT_ID} → users → [your-uid]`,
                'Add field: role = "admin" (string)',
                'Refresh the app — Admin Console is now accessible in the menu',
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </StepCard>

        {/* Demo Access */}
        <div className="bg-white border-2 border-indigo-200 rounded-2xl shadow-sm p-6 mt-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-black text-slate-800 text-lg">Live Demo</h2>
            <span className="ml-auto text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Online Now</span>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Try ClinicOS instantly with pre-loaded fictional data — no setup required.
          </p>
          <div className="grid grid-cols-1 gap-2 mb-4">
            {[
              { label: '🔗 URL', value: 'https://monitorbea.web.app' },
              { label: '📧 Email', value: 'demo@clinicos.com' },
              { label: '🔑 Password', value: 'Demo@2026' },
              { label: '🏢 Tenant', value: 'clinicos_demo (isolated)' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl">
                <span className="text-xs font-bold text-slate-500">{label}</span>
                <span className="text-sm font-mono font-bold text-slate-800">{value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            The demo runs on an isolated tenant with fictional patients, appointments, medical records and financial data.
            All features are available for exploration.
          </p>
        </div>

        {/* Multi-tenant section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-indigo-500" />
            <h2 className="font-black text-slate-800">Multi-Instance Deployment</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            To deploy ClinicOS for a second clinic, simply repeat the process with a different
            <code className="bg-slate-100 px-1 mx-1 rounded font-mono text-xs">VITE_APP_TENANT_ID</code>.
            All data will be completely isolated in Firestore.
          </p>
          <CodeBlock>{`# Clinic A (using same Firebase project)
VITE_APP_TENANT_ID=downtown_vet
# → Data lives at: /artifacts/downtown_vet/...

# Clinic B (same codebase, different .env)
VITE_APP_TENANT_ID=smile_dental
# → Data lives at: /artifacts/smile_dental/...`}</CodeBlock>
          <p className="text-xs text-slate-500 mt-3">
            Each instance can share one Firebase project (free Spark plan), or each can have its own
            project for maximum isolation. The Firestore security rules enforce authentication-only access
            regardless of which tenant is active.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center py-8 text-xs text-slate-400">
          ClinicOS · Built with React, Firebase & Tailwind CSS
          <br />
          <a
            href="https://github.com/lidianehoa/ClinicOS"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline mt-1 inline-block"
          >
            github.com/lidianehoa/ClinicOS
          </a>
        </div>
      </div>
    </div>
  );
}
