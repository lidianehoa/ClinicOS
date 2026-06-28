# ClinicOS

> **Complete Clinic Management ERP** — Medical Portal with surgical records, bank reconciliation with AI, pricing engine, WhatsApp automation, barcode scanner, and multi-language support. Deploy a new clinic instance in under 10 minutes.

[![TypeScript](https://img.shields.io/badge/TypeScript-92%25-3178c6)](https://github.com/lidianehoa/ClinicOS)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-orange)](https://firebase.google.com)
[![React](https://img.shields.io/badge/Frontend-React%2018-61dafb)](https://react.dev)
[![i18n](https://img.shields.io/badge/i18n-PT--BR%20%7C%20EN%20%7C%20ES-teal)](https://www.i18next.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## Live Demo

| | |
|---|---|
| 🔗 **Admin URL** | https://monitorbea.web.app |
| 📧 **Admin email** | `demo@clinicos.com` |
| 🔑 **Admin password** | `Demo@2026` |
| 🏥 **Medical Portal URL** | https://monitorbea.web.app/medico |
| 📧 **Medical email** | `michael@clinicos-demo.com` |
| 🔑 **Medical password** | `Clinicos@2026` |

Pre-loaded with fictional data across all modules. No setup required.

---

## What's Inside — 15+ Production Modules

### 🏥 Medical Portal (role-based separate login)

A dedicated portal for healthcare professionals at `/medico` — completely isolated from the administrative system. Role-based routing: doctors see only clinical modules, receptionists see queue and cashier only.

#### Consultations
- Full clinical form: vital signs, anamnesis, physical exam, diagnosis, prescription
- Auto-save every 30 seconds
- Patient timeline aggregating all events (consultations, hospitalizations, surgeries, vaccines, exams)
- Supply autocomplete with stock deduction on finalization
- Low stock alerts with before/after confirmation modal

#### Hospitalization
- Real-time patient list by sector: **Hospitalized / Isolation / Quarantine / Triage**
- Live duration counter updating every minute
- Prescription engine with automatic schedule generation (6/6h, 8/8h, 12/12h, 24/24h, SOS, Continuous)
- **24-hour execution map** — color-coded matrix: 🟢 administered / 🟡 pending / 🔴 overdue / 🔵 late
- Evolution notes with timestamped clinical entries
- Supply tracking with per-administration stock deduction
- Discharge workflow with reason classification (cure, owner request, death, transfer)
- Full hospitalization history with date range filters

#### Surgeries
5-tab surgical record with complete documentation:
1. **Admission** — ASA classification (I–V), fasting hours, pre-op exams, vital signs, consent tracking, surgical purpose and clinical indication
2. **Anesthesia** — MPA, induction, maintenance (agent + concentration), analgesia, monitoring checklist, automatic dose calculation by patient weight (mg/kg → actual dose)
3. **Procedure** — detailed description, technique, intraoperative findings, complications, synthesis/closure, biopsy tracking
4. **Post-op** — home medications, activity restrictions, return date, discharge instructions
5. **Supplies** — categorized by anesthesia / surgical material / medication, with total cost accumulation
- PDF surgical report export via `window.print()`
- Automatic stock deduction of all supplies on finalization

---

### 💊 Inventory & Stock Management
- Full product catalog: EAN barcode, NCM, ANVISA codes, cost/sale price, minimum/maximum stock, expiry date, supplier
- Automatic stock deduction triggered by consultations, hospitalizations, and surgeries
- Real-time low stock alerts in `/stock_alerts` collection
- Alert banner visible in Medical Portal dashboard

---

### 🔲 Barcode Scanner (POS/PDV)
- USB scanner support via keyboard emulation — **no driver required**
- `useBarcodeScanner` hook detects scanner input by keystroke timing (< 50ms between keys)
- Unified POS searches `/products` and `/services` simultaneously
- Visual feedback: ✅ added to cart / ❌ not found / ⚠️ internal use only (R$0 sale price)
- Manual barcode input field as fallback

---

### 📊 CSV Product Importer
- Compatible with major veterinary ERP exports (SimplesVet format)
- Semicolon-separated CSV with automatic BR number parsing (`R$ 1.500,50` → `1500.50`)
- Batch import via Firestore `writeBatch` (400 items/batch to avoid quota limits)
- Preview with first 5 items, item count, and error report before import
- 3 import modes: Replace all / Add new only / Update existing

---

### 💰 Pricing Engine
Based on clinical cost methodology for health clinics:
- **4-layer cost calculation**: supplies cost + clinical labor (cost/hour × procedure duration) + fixed cost allocation (pro-rated by working minutes) + tax/card rate deductions (calculated inside the price)
- **Biological risk premium**: Low (+0%) / Medium (+10%) / High (+25%) / Very High (+40%)
- **3 prices delivered**: minimum (break-even), suggested (target margin), risk-adjusted
- Portfolio health dashboard: Healthy ✅ / Below target ⚠️ / Loss ❌ / Not configured ⬜
- Staff hourly cost calculation (monthly cost ÷ working hours)
- Card rate weighted average by payment mix
- Updates service sale price in `/services` on confirmation

---

### 🏦 Bank Reconciliation with AI

Supports 3 import formats:

| Format | Source | Processing |
|---|---|---|
| **PDF** | Mobile banking apps (Santander, Itaú, Bradesco, BB) | Claude API extracts transactions |
| **CSV** | Fintechs (Nubank, Inter, PagBank, C6) | Local — no AI, no cost |
| **OFX** | Internet banking (Itaú, Bradesco, BB, Santander, Sicoob) | Local — no AI, no cost |

**6-layer progressive matching algorithm:**
1. Key + exact value
2. Key in transaction description text
3. Batch (N clinic items = 1 bank entry)
4. Key + value within R$0.10 tolerance (rounding)
5. Value + date (no key)
6. Fuzzy description similarity

**3-phase workflow:**
- **Phase 1** — `validateBases()`: checks period overlap and empty bases. If invalid → STOP, show reason
- **Phase 2** — `autoMatch()`: 6 progressive layers with Set-based ID tracking (no double-matching)
- **Phase 3** — `checkIntegrity()`: composition of difference must equal global difference (±R$0.50). If fails → export blocked

**Report features:**
- Composition of difference breakdown: pending bank + pending clinic + divergences = global gap
- Integrity proof badge: ✅ Validated / ❌ Resolve before exporting
- Layer badge on each matched item: `[L1 — exact]` to `[L6 — fuzzy]`
- PDF export via `window.print()` (blocked if integrity fails)

---

### 📱 WhatsApp Automation (Evolution API)
- Appointment confirmation sent automatically on booking (toggle in modal)
- Manual reminder button per appointment in daily list
- Return reminder button when finalizing consultation with return date
- Bulk reminder dispatch for all next-day appointments from Admin Console
- Rate-limiting delays between bulk dispatches
- Full notification log in `/notifications_log` collection
- Configurable in **Settings → Integrations** — no code changes required

---

### 📅 Appointments
- Weekly calendar (07:00–20:00) with proportional-height appointment blocks
- Daily list view with quick action buttons
- Smart creation modal: client autocomplete → auto-loads patients, service → auto-fills duration and end time
- Color-coded status: scheduled / confirmed / in_progress / completed / cancelled / no_show
- Full flow: Schedule → Confirm → Start (auto-adds to monitoring queue) → Complete → Charge (POS pre-loaded with service)
- Upcoming appointments shown in CRM patient profile

---

### 👥 CRM
- Client and patient profiles with complete demographic data
- Patient timeline aggregating all clinical events chronologically
- Upcoming appointments section in patient profile
- Interaction log per client

---

### 📋 Medical Records
- Auto-save every 30 seconds (draft → Firestore)
- PDF export with clinic logo and professional signature
- Accessible from CRM, Monitoring, and Appointments
- Linked to consultation finalization workflow

---

### 💵 POS / Cashier
- Unified item search (services + products)
- Multiple payment methods: cash, debit, credit (cash/installment), Pix
- Change calculation for cash payments
- Daily sales history and summary
- Standalone kiosk mode (PDVAutonomo) — sidebar-free interface

---

### 📊 Dashboard
- Real-time KPIs: revenue, expenses, net balance, average ticket
- Period filters: today, this week, this month
- Revenue chart by period
- Top services by volume
- Low stock alert banner

---

### ⚙️ Settings
- **Clinic data** — name, CNPJ, address (ViaCEP autocomplete), logo, business hours
- **Services & Prices** — full CRUD, integrated with POS
- **Staff** — roles, access levels (admin / manager / professional / receptionist)
- **Integrations** — Evolution API (WhatsApp), Claude API (PDF parser), Google AI (Gemini)

---

### 🔧 Admin Console
- Operation timeline with all system events
- Critical actions (clear daily data)
- Stock alerts management panel
- WhatsApp bulk reminder dispatch with progress feedback
- Notification log viewer

---

### 🤖 AI Assistant
- Placeholder with professional UI — ready to activate
- Configure Google GenAI API key in Settings → Integrations
- Redirects to Settings when API key not configured

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, Lucide React |
| Backend | Firebase Auth, Firestore (serverless, real-time) |
| Hosting | Firebase Hosting |
| i18n | react-i18next — PT-BR 🇧🇷 / EN 🇺🇸 / ES 🇪🇸 |
| WhatsApp | Evolution API |
| AI — PDF parser | Anthropic Claude API (`claude-haiku`) |
| AI — Assistant | Google GenAI / Gemini (optional) |
| Barcode | USB scanner via keyboard emulation hook |
| CSV parsing | PapaParse |
| PDF export | `window.print()` with print-optimized CSS |

---

## Internationalization

45 translation files across 15 namespaces and 3 languages:

```
src/i18n/locales/
  pt-BR/   → common, auth, dashboard, monitoring, cashier,
             crm, appointments, records, products, pricing,
             reconciliation, settings, medical, admin, setup
  en/      → (same 15 namespaces)
  es/      → (same 15 namespaces)
```

Language selector in sidebar footer. Language persists via `localStorage`. Switching updates the entire UI instantly without page reload.

---

## Multi-Instance Architecture

Each clinic deployment gets a completely isolated Firestore namespace:

```bash
# Clinic A
VITE_APP_TENANT_ID=downtown_vet
# Data path: /artifacts/downtown_vet/public/data/...

# Clinic B
VITE_APP_TENANT_ID=smile_dental
# Data path: /artifacts/smile_dental/public/data/...
```

Multiple clinics can share a single Firebase project or each have their own. No code changes required per client.

---

## Quick Start

### Prerequisites
- Node.js 18+
- Firebase project (free Spark plan works)
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

Edit `.env`:
```env
# Tenant — unique identifier for this clinic instance
VITE_APP_TENANT_ID=my_clinic_name

# Firebase
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=my-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=my-project
VITE_FIREBASE_STORAGE_BUCKET=my-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123...

# Optional integrations
VITE_EVOLUTION_URL=https://your-evolution-api.com
VITE_EVOLUTION_KEY=your-api-key
VITE_EVOLUTION_INSTANCE=clinicos
```

### 3. Set up Firebase
1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication → Email/Password**
3. Enable **Firestore Database → Production mode**
4. Copy credentials to `.env`

### 4. Deploy Firestore security rules
```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

### 5. Run locally
```bash
npm run dev
```

### 6. Create the first admin user
1. Register a user in the app
2. In Firebase Console → Firestore → find `/bea_data/{tenant-id}/users/{uid}`
3. Add field: `role = "admin"`
4. Refresh — Admin Console is now accessible

---

## Demo Scripts

Bootstrap a demo instance with fictional data:

```bash
# Create demo admin user (demo@clinicos.com / Demo@2026)
node scripts/createDemoUser.mjs

# Create demo medical user
node scripts/createMedicalDemoUser.mjs

# Seed all modules with fictional data
node scripts/seedDemoData.mjs
```

**Seeded data:**

| Collection | Records |
|---|---|
| Clinic config | 1 |
| Services | 6 |
| Staff | 3 |
| Clients + patients | 5 each |
| Appointments | 8 (yesterday / today / tomorrow) |
| Medical records | 3 |
| Cash register | 5 days |
| Pricing config | Full setup |

---

## Deploy to Firebase Hosting

```bash
npm run build && firebase deploy --only hosting
```

## Deploy to Vercel

```bash
vercel deploy
# Add all .env variables in Vercel Dashboard → Project → Settings → Environment Variables
```

---

## Setup Guide

After deploying, visit `/setup` for an interactive guide showing your current instance configuration, deployment steps, and demo credentials.

---

## Firestore Data Structure

```
/artifacts/{tenantId}/public/data/
  ├── customers/              → client profiles
  ├── patients/               → patient profiles
  ├── appointments/           → scheduled appointments
  ├── records/                → medical records
  ├── consultations/          → consultation sheets (Medical Portal)
  ├── hospitalizations/       → hospitalization records
  ├── hospitalization_evolutions/ → clinical evolution notes
  ├── scheduled_doses/        → prescription dose schedule
  ├── surgeries/              → surgical records
  ├── products/               → product/inventory catalog
  ├── services/               → service definitions
  ├── staff/                  → staff members
  ├── reconciliations/        → bank reconciliation sessions
  ├── reconciliation_items/   → matched/unmatched items
  └── stock_alerts/           → low stock alerts

/bea_data/{tenantId}/
  ├── users/                  → user profiles & roles
  ├── settings/clinic         → clinic configuration
  ├── settings/integrations   → API keys (Evolution, Claude, Gemini)
  ├── pricing/config          → pricing engine setup
  └── pricing/services/{id}   → per-service pricing results

/notifications_log/           → WhatsApp dispatch audit log
```

---

## Security

- All Firestore access requires Firebase Authentication
- Data namespaced by `VITE_APP_TENANT_ID` at path level
- Firestore security rules in `firestore.rules` — deployed via Firebase CLI
- `.env` excluded from version control via `.gitignore`
- API keys (Evolution, Claude, Gemini) stored in Firestore, not in client bundle

---

## Optional Integrations

### WhatsApp (Evolution API)
Configure in **Settings → Integrations → WhatsApp** or via `.env`:
```env
VITE_EVOLUTION_URL=https://your-evolution-api.com
VITE_EVOLUTION_KEY=your-api-key
VITE_EVOLUTION_INSTANCE=clinicos
```

### Bank Statement AI Parser (Claude API)
Configure in **Settings → Integrations → AI Statement Parser**.
Required only for PDF bank statement imports. CSV and OFX work without AI.
Cost: ~$0.01 per PDF statement.
Get API key at [console.anthropic.com](https://console.anthropic.com).

### AI Assistant (Google Gemini)
Configure in **Settings → Integrations → Google AI**.
Optional — system works fully without it.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## About

Built by a licensed veterinarian and software developer. Every feature reflects a real clinical workflow problem. The domain expertise is embedded in the product — not just the interface.

> **92.1% TypeScript** — fully typed, production-grade codebase.
