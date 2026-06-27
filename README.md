# ClinicOS

> Complete Clinic Management ERP with Scheduling, Medical Records, WhatsApp Notifications, Real-time Queue and Analytics Dashboard.

## Features

| Module | Description |
|---|---|
| 📅 **Scheduling** | Weekly/daily calendar with drag-to-create appointments |
| 🏥 **Monitoring** | Real-time patient queue with auto-save |
| 💰 **POS / Cashier** | Point of sale with service catalog and sales history |
| 👥 **CRM** | Client and patient management with interaction log |
| 📋 **Medical Records** | Clinical history with PDF export and auto-save |
| 📊 **Dashboard** | Financial KPIs and daily analytics |
| 📱 **WhatsApp** | Automated reminders via Evolution API |
| ⚙️ **Settings** | Clinic data, services, staff, integrations |
| 🤖 **AI Assistant** | Google Gemini integration (optional) |

## Tech Stack

- **React 18** + TypeScript + Vite
- **Firebase Auth** + Firestore (Realtime)
- **Tailwind CSS** + Lucide React icons
- **Evolution API** — WhatsApp notifications (optional)
- **Google GenAI** — AI assistant (optional)

## Live Demo

Try it now — no setup needed:

| | |
|---|---|
| 🔗 **URL** | https://monitorbea.web.app |
| 📧 **Email** | `demo@clinicos.com` |
| 🔑 **Password** | `Demo@2026` |

Pre-loaded with fictional data: 5 clients, 5 patients, 8 appointments (yesterday / today / tomorrow), 3 medical records and 5 days of cash register history.

---



### Prerequisites

- Node.js 18+
- A [Firebase project](https://console.firebase.google.com) (free Spark plan works)
- Git

### 1. Clone and install

```bash
git clone https://github.com/lidianehoa/ClinicOS
cd ClinicOS
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values. The most important variable is `VITE_APP_TENANT_ID` — it acts as the namespace for all Firestore data:

```env
VITE_APP_TENANT_ID=my_clinic_name    # unique identifier for this clinic
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=my-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=my-project
VITE_FIREBASE_STORAGE_BUCKET=my-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123...
```

### 3. Set up Firebase

1. [Create a Firebase project](https://console.firebase.google.com)
2. Enable **Authentication** → Email/Password
3. Enable **Firestore Database** → Start in production mode
4. Copy credentials from Project Settings → Your Apps → Web App

### 4. Deploy Firestore Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase use --add       # select your project
firebase deploy --only firestore:rules
```

### 5. Run locally

```bash
npm run dev
```

### 6. Create the first admin user

1. Register a user in the app
2. In Firebase Console → Firestore → `bea_data/{your-tenant-id}/users/{uid}`
3. Add field: `role = "admin"`
4. Refresh — Admin Console is now visible

---

## Multi-Instance Deployment

ClinicOS is designed for **multi-tenant SaaS deployment**. Each clinic gets a completely isolated data namespace by setting a unique `VITE_APP_TENANT_ID`:

```
Clinic A → VITE_APP_TENANT_ID=downtown_vet
           Data: /artifacts/downtown_vet/public/data/...

Clinic B → VITE_APP_TENANT_ID=smile_dental
           Data: /artifacts/smile_dental/public/data/...
```

Multiple clinics can share a single Firebase project or each have their own — the isolation is guaranteed by the tenant ID namespace, not by the project.

### Deploy to Vercel

```bash
vercel deploy
# Add all .env variables in Vercel Dashboard → Project → Settings → Environment Variables
```

### Setup Guide

After deploying, visit `/setup` in your app for an interactive deployment guide that shows your current instance configuration.

---

## Demo Scripts

The `scripts/` directory contains Node.js utilities to bootstrap a demo instance.

### Create demo user

```bash
node scripts/createDemoUser.mjs
```

Creates `demo@clinicos.com` in Firebase Auth and sets their Firestore profile with `role: administrador`.

### Seed demo data

```bash
node scripts/seedDemoData.mjs
```

Populates the `clinicos_demo` tenant with fictional data across all modules:

| Collection | Records |
|---|---|
| Clinic config | 1 |
| Services | 6 |
| Staff | 3 |
| Customers + patients | 5 each |
| Appointments | 8 (spread over ±3 days) |
| Medical records | 3 |
| Cash register (caixa) | 5 days |

> **Note:** Both scripts use ES Modules (`.mjs`) and require Node.js 18+. They use the same Firebase credentials that are hardcoded in `src/services/firebase.ts`.

---

## Optional Integrations


### WhatsApp (Evolution API)

Configure in the app: **Settings → Integrations → WhatsApp**

Or set in `.env`:
```env
VITE_EVOLUTION_URL=https://your-evolution-api.com
VITE_EVOLUTION_KEY=your-api-key
VITE_EVOLUTION_INSTANCE=clinicos
```

### AI Assistant (Google Gemini)

Configure in the app: **Settings → Integrations → Google AI**

---

## Firestore Data Structure

```
/artifacts/{tenantId}/public/data/
  ├── customers/          → client profiles
  ├── daily_flow/         → daily transaction records
  ├── daily_expenses/     → daily expense records
  ├── appointments/       → scheduled appointments
  ├── records/            → medical records (prontuários)
  ├── interactions/       → CRM interaction logs
  └── vendas/             → POS sales

/bea_data/{tenantId}/
  ├── users/              → user profiles & roles
  ├── produtos/           → product/service catalog
  ├── empresa/            → clinic configuration
  ├── services/           → service definitions
  ├── staff/              → staff members
  └── caixa/              → cashier sessions

/notifications_log/       → WhatsApp dispatch audit log
```

---

## Security

- All Firestore access requires Firebase Authentication (`request.auth != null`)
- Data is namespaced by `VITE_APP_TENANT_ID` at the path level
- Security rules are defined in `firestore.rules` and deployed via Firebase CLI
- `.env` is excluded from version control via `.gitignore`

---

## License

MIT — see [LICENSE](LICENSE) for details.
