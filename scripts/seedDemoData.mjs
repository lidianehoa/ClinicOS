/**
 * seedDemoData.mjs — ClinicOS Demo Data Seed
 *
 * Populates Firestore tenant "clinicos_demo" with realistic fictional data
 * covering all modules: Clinic config, Services, Staff, Customers/Patients,
 * Appointments, Medical Records, and Caixa (daily cash).
 *
 * Paths mirror exactly what dataService.ts uses:
 *   /artifacts/clinicos_demo/public/data/customers/    ← clientes + animais
 *   /bea_data/clinicos_demo/services/                  ← serviços
 *   /bea_data/clinicos_demo/staff/                     ← colaboradores
 *   /bea_data/clinicos_demo/appointments/              ← agendamentos
 *   /bea_data/clinicos_demo/config/clinic              ← config da clínica
 *   /bea_data/clinicos_demo/caixa/{date}               ← caixa operacional
 *   /records/{id}                                      ← prontuários (root col)
 *
 * Usage:
 *   node scripts/seedDemoData.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch, collection } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyA_JDlAIzKDHuCFh4P5P8hlFL-3iCNtyO4',
  authDomain: 'manual-clinico.firebaseapp.com',
  projectId: 'manual-clinico',
  storageBucket: 'manual-clinico.firebasestorage.app',
  messagingSenderId: '127364027154',
  appId: '1:127364027154:web:442ff7eafc1f3750f659cb',
};

const TENANT = 'clinicos_demo';
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Date helpers ──────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

const TODAY     = fmt(new Date());
const TOMORROW  = fmt(addDays(1));
const YESTERDAY = fmt(addDays(-1));
const DAY3AGO   = fmt(addDays(-3));
const DAY4AGO   = fmt(addDays(-4));
const DAY5AGO   = fmt(addDays(-5));
const IN7DAYS   = fmt(addDays(7));
const IN10DAYS  = fmt(addDays(10));
const IN365DAYS = fmt(addDays(365));

// ── Path helpers (mirror dataService.ts) ─────────────────────────────────────
const OP_DOC  = (col, id) => doc(db, 'artifacts', TENANT, 'public', 'data', col, id);
const CFG_DOC = (col, id) => doc(db, 'bea_data',  TENANT, col, id);
const ROOT_DOC= (col, id) => doc(db, col, id);

// ── IDs ───────────────────────────────────────────────────────────────────────
const IDS = {
  // clients
  c_john:   'john_smith',
  c_maria:  'maria_garcia',
  c_robert: 'robert_wilson',
  c_ana:    'ana_costa',
  c_carlos: 'carlos_souza',
  // patients (stored inside customer.animais[])
  // staff
  s_sarah:  'staff_sarah_johnson',
  s_michael:'staff_michael_chen',
  s_ana:    'staff_ana_lima',
  // services
  sv_consult:  'srv_general_consult',
  sv_followup: 'srv_followup_consult',
  sv_vacc:     'srv_vaccination',
  sv_surgery:  'srv_basic_surgery',
  sv_imaging:  'srv_imaging_exam',
  sv_lab:      'srv_lab_exam',
  // appointments
  a1: 'apt_001', a2: 'apt_002', a3: 'apt_003',
  a4: 'apt_004', a5: 'apt_005', a6: 'apt_006',
  a7: 'apt_007', a8: 'apt_008',
  // records
  r1: 'rec_001', r2: 'rec_002', r3: 'rec_003',
};

const now = () => new Date().toISOString();

// ─────────────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 ClinicOS — Authenticating demo user...');
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, 'demo@clinicos.com', 'Demo@2026');

  console.log('🌱 ClinicOS — Seeding demo data for tenant:', TENANT, '\n');

  // ── 1. Clinic config ───────────────────────────────────────────────────────
  console.log('1/7  Clinic config...');
  await setDoc(CFG_DOC('config', 'clinic'), {
    name: 'ClinicOS Demo Clinic',
    cnpj: '00.000.000/0001-00',
    phone: '(11) 99999-0000',
    email: 'contato@clinicos-demo.com',
    website: 'https://clinicos.app',
    address: {
      cep: '01310-100',
      logradouro: 'Avenida Paulista',
      numero: '1000',
      complemento: '',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      estado: 'SP',
    },
    businessHours: {
      open: '08:00',
      close: '18:00',
      days: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false },
    },
  });

  // ── 2. Services ────────────────────────────────────────────────────────────
  console.log('2/7  Services...');
  const services = [
    { id: IDS.sv_consult,  name: 'General Consultation', category: 'Consultation', duration: 30, durationUnit: 'min', price: 150, description: 'Routine clinical consultation', status: 'Active' },
    { id: IDS.sv_followup, name: 'Follow-up Consultation', category: 'Consultation', duration: 20, durationUnit: 'min', price: 80,  description: 'Return visit follow-up', status: 'Active' },
    { id: IDS.sv_vacc,     name: 'Vaccination', category: 'Procedure', duration: 15, durationUnit: 'min', price: 60,  description: 'Vaccine administration', status: 'Active' },
    { id: IDS.sv_surgery,  name: 'Basic Surgery', category: 'Surgery', duration: 90, durationUnit: 'min', price: 800, description: 'General surgical procedures', status: 'Active' },
    { id: IDS.sv_imaging,  name: 'Imaging Exam', category: 'Exam', duration: 30, durationUnit: 'min', price: 200, description: 'X-ray or ultrasound', status: 'Active' },
    { id: IDS.sv_lab,      name: 'Laboratory Exam', category: 'Exam', duration: 15, durationUnit: 'min', price: 120, description: 'Blood and urine tests', status: 'Active' },
  ];
  for (const s of services) {
    await setDoc(CFG_DOC('services', s.id), { ...s, createdAt: now() });
  }

  // ── 3. Staff ───────────────────────────────────────────────────────────────
  console.log('3/7  Staff...');
  const staff = [
    { id: IDS.s_sarah,   name: 'Dr. Sarah Johnson',  role: 'Veterinarian',  professionalId: 'CRMV-SP 12345', email: 'sarah@clinicos-demo.com',   accessLevel: 'Professional', phone: '(11) 91111-0001', status: 'Active' },
    { id: IDS.s_michael, name: 'Dr. Michael Chen',   role: 'Veterinarian',  professionalId: 'CRMV-SP 67890', email: 'michael@clinicos-demo.com', accessLevel: 'Professional', phone: '(11) 91111-0002', status: 'Active' },
    { id: IDS.s_ana,     name: 'Ana Lima',            role: 'Receptionist',  professionalId: '',               email: 'ana@clinicos-demo.com',     accessLevel: 'Receptionist', phone: '(11) 91111-0003', status: 'Active' },
  ];
  for (const s of staff) {
    await setDoc(CFG_DOC('staff', s.id), { ...s, createdAt: now() });
  }

  // ── 4. Customers (with embedded animais[]) ─────────────────────────────────
  console.log('4/7  Customers + patients...');
  const customers = [
    {
      id: IDS.c_john,   nome: 'John Smith',   telefone: '(11) 99001-0001', email: 'john@example.com',   cidade: 'São Paulo', uf: 'SP',
      animais: [{ nome: 'Max',  especie: 'Cão', raca: 'Golden Retriever', nascimento: '2020-03-15', status: 'ativo' }],
      animal: 'Max', rankingABC: 'A', ticketMedio: '343.33',
    },
    {
      id: IDS.c_maria,  nome: 'Maria Garcia', telefone: '(11) 99001-0002', email: 'maria@example.com',  cidade: 'São Paulo', uf: 'SP',
      animais: [{ nome: 'Luna', especie: 'Gato', raca: 'Siamês',          nascimento: '2021-07-22', status: 'ativo' }],
      animal: 'Luna', rankingABC: 'B', ticketMedio: '120.00',
    },
    {
      id: IDS.c_robert, nome: 'Robert Wilson',telefone: '(11) 99001-0003', email: 'robert@example.com', cidade: 'Campinas',  uf: 'SP',
      animais: [{ nome: 'Thor', especie: 'Cão', raca: 'Pastor Alemão',    nascimento: '2019-11-08', status: 'ativo' }],
      animal: 'Thor', rankingABC: 'A', ticketMedio: '800.00',
    },
    {
      id: IDS.c_ana,    nome: 'Ana Costa',    telefone: '(11) 99001-0004', email: 'ana@example.com',    cidade: 'São Paulo', uf: 'SP',
      animais: [{ nome: 'Mel',  especie: 'Gato', raca: 'Persa',           nascimento: '2022-01-30', status: 'ativo' }],
      animal: 'Mel', rankingABC: 'C', ticketMedio: '80.00',
    },
    {
      id: IDS.c_carlos, nome: 'Carlos Souza', telefone: '(11) 99001-0005', email: 'carlos@example.com', cidade: 'Guarulhos', uf: 'SP',
      animais: [{ nome: 'Rex',  especie: 'Cão', raca: 'Labrador',         nascimento: '2018-06-12', status: 'ativo' }],
      animal: 'Rex', rankingABC: 'B', ticketMedio: '200.00',
    },
  ];
  for (const c of customers) {
    await setDoc(OP_DOC('customers', c.id), { ...c });
  }

  // ── 5. Appointments ────────────────────────────────────────────────────────
  console.log('5/7  Appointments...');
  const appointments = [
    { id: IDS.a1, date: TODAY,     startTime: '09:00', endTime: '09:30', clientId: IDS.c_john,   clientName: 'John Smith',    patientId: 'max',  patientName: 'Max',  serviceId: IDS.sv_consult,  serviceName: 'General Consultation', professionalId: IDS.s_sarah,   professionalName: 'Dr. Sarah Johnson', status: 'confirmed',   notes: '' },
    { id: IDS.a2, date: TODAY,     startTime: '10:00', endTime: '10:15', clientId: IDS.c_maria,  clientName: 'Maria Garcia',  patientId: 'luna', patientName: 'Luna', serviceId: IDS.sv_vacc,     serviceName: 'Vaccination',           professionalId: IDS.s_michael, professionalName: 'Dr. Michael Chen',  status: 'scheduled',   notes: '' },
    { id: IDS.a3, date: TODAY,     startTime: '14:00', endTime: '15:30', clientId: IDS.c_robert, clientName: 'Robert Wilson', patientId: 'thor', patientName: 'Thor', serviceId: IDS.sv_surgery,  serviceName: 'Basic Surgery',         professionalId: IDS.s_sarah,   professionalName: 'Dr. Sarah Johnson', status: 'in_progress', notes: 'Elective procedure - pre-op OK' },
    { id: IDS.a4, date: TOMORROW,  startTime: '09:30', endTime: '09:50', clientId: IDS.c_ana,    clientName: 'Ana Costa',     patientId: 'mel',  patientName: 'Mel',  serviceId: IDS.sv_followup, serviceName: 'Follow-up Consultation',professionalId: IDS.s_michael, professionalName: 'Dr. Michael Chen',  status: 'scheduled',   notes: '' },
    { id: IDS.a5, date: TOMORROW,  startTime: '11:00', endTime: '11:30', clientId: IDS.c_carlos, clientName: 'Carlos Souza',  patientId: 'rex',  patientName: 'Rex',  serviceId: IDS.sv_imaging,  serviceName: 'Imaging Exam',          professionalId: IDS.s_sarah,   professionalName: 'Dr. Sarah Johnson', status: 'scheduled',   notes: 'Hip dysplasia screening' },
    { id: IDS.a6, date: YESTERDAY, startTime: '09:00', endTime: '09:30', clientId: IDS.c_john,   clientName: 'John Smith',    patientId: 'max',  patientName: 'Max',  serviceId: IDS.sv_followup, serviceName: 'Follow-up Consultation',professionalId: IDS.s_sarah,   professionalName: 'Dr. Sarah Johnson', status: 'completed',   notes: '' },
    { id: IDS.a7, date: YESTERDAY, startTime: '14:00', endTime: '14:15', clientId: IDS.c_maria,  clientName: 'Maria Garcia',  patientId: 'luna', patientName: 'Luna', serviceId: IDS.sv_lab,      serviceName: 'Laboratory Exam',       professionalId: IDS.s_michael, professionalName: 'Dr. Michael Chen',  status: 'completed',   notes: '' },
    { id: IDS.a8, date: DAY3AGO,   startTime: '10:00', endTime: '11:30', clientId: IDS.c_robert, clientName: 'Robert Wilson', patientId: 'thor', patientName: 'Thor', serviceId: IDS.sv_surgery,  serviceName: 'Basic Surgery',         professionalId: IDS.s_sarah,   professionalName: 'Dr. Sarah Johnson', status: 'completed',   notes: 'Neutering - successful' },
  ];
  for (const a of appointments) {
    await setDoc(CFG_DOC('appointments', a.id), { ...a, createdAt: now(), updatedAt: now() });
  }

  // ── 6. Medical Records (/records/ root collection) ─────────────────────────
  console.log('6/7  Medical records...');
  const records = [
    {
      id: IDS.r1,
      patientId: 'max', patientName: 'Max',
      clientId: IDS.c_john, clientName: 'John Smith',
      appointmentId: IDS.a6,
      professionalId: IDS.s_sarah, professionalName: 'Dr. Sarah Johnson',
      date: YESTERDAY, time: '09:00',
      chiefComplaint: 'Vomiting for 2 days, loss of appetite',
      anamnesis: 'Patient presented with 2-day history of vomiting (3–4 episodes/day) and reduced appetite. No foreign body ingestion reported. Last deworming 6 months ago. Up to date on vaccinations.',
      currentMedications: 'None',
      physicalExam: { weight: 28.5, temperature: 38.8, heartRate: 88, respiratoryRate: 22, observations: 'Mild dehydration (~5%). Abdominal palpation reveals mild diffuse tenderness.' },
      diagnosis: 'Acute gastroenteritis',
      treatment: 'Metronidazole 250mg — 1 tablet every 12h for 5 days. Omeprazole 20mg — 1 tablet/day for 5 days. Light, easily digestible diet for 7 days. Oral rehydration. Monitor for worsening.',
      prescription: 'Metronidazol 250mg — 1 comprimido a cada 12h por 5 dias.\nOmeprazol 20mg — 1 comprimido/dia por 5 dias.',
      returnDate: IN7DAYS,
      evolution: 'Patient stable, sent home with medications and diet instructions.',
    },
    {
      id: IDS.r2,
      patientId: 'luna', patientName: 'Luna',
      clientId: IDS.c_maria, clientName: 'Maria Garcia',
      appointmentId: IDS.a7,
      professionalId: IDS.s_michael, professionalName: 'Dr. Michael Chen',
      date: YESTERDAY, time: '14:00',
      chiefComplaint: 'Annual checkup and laboratory exams',
      anamnesis: 'Healthy patient, routine annual examination. No complaints reported by owner. Diet: commercial dry food. Indoor-only cat.',
      currentMedications: 'None',
      physicalExam: { weight: 4.2, temperature: 38.5, heartRate: 140, respiratoryRate: 28, observations: 'No abnormalities found. BCS 5/9 (ideal). Coat in excellent condition.' },
      diagnosis: 'Healthy — routine annual checkup',
      treatment: 'Annual vaccination updated (V4 + Rabies). Antiparasitic applied. Dental scaling recommended within 6 months.',
      prescription: 'Antiparasitário tópico (Advantage) — aplicar mensalmente.',
      returnDate: IN365DAYS,
      evolution: 'Lab results within normal range. Owner advised on dental hygiene.',
    },
    {
      id: IDS.r3,
      patientId: 'thor', patientName: 'Thor',
      clientId: IDS.c_robert, clientName: 'Robert Wilson',
      appointmentId: IDS.a8,
      professionalId: IDS.s_sarah, professionalName: 'Dr. Sarah Johnson',
      date: DAY3AGO, time: '10:00',
      chiefComplaint: 'Elective neutering procedure',
      anamnesis: 'Patient in excellent health. Pre-operative blood panel normal. Owner consented to procedure. Pre-anesthetic sedation administered per protocol.',
      currentMedications: 'None',
      physicalExam: { weight: 35.0, temperature: 38.6, heartRate: 72, respiratoryRate: 18, observations: 'Excellent body condition. All pre-op parameters within normal limits.' },
      diagnosis: 'Post-operative recovery — elective neutering (orchiectomy)',
      treatment: 'Amoxicillin-Clavulanate 500mg — 1 tablet every 12h for 7 days. Meloxicam 2mg — 1 tablet/day for 5 days. Rest 10 days. E-collar for 7 days. Suture removal in 10 days.',
      prescription: 'Amoxicilina + Clavulanato 500mg — 12/12h por 7 dias.\nMeloxicam 2mg — 1 comprimido/dia por 5 dias.',
      returnDate: IN10DAYS,
      evolution: 'Surgery uneventful. Patient recovered from anesthesia without complications. Discharged same day.',
    },
  ];
  for (const r of records) {
    await setDoc(ROOT_DOC('records', r.id), { ...r, createdAt: now(), updatedAt: now() });
  }

  // ── 7. Caixa (cash register) — one doc per day ────────────────────────────
  console.log('7/7  Caixa (daily cash)...');

  const makeMov = (tipo, valor, descricao, operador, id) => ({
    _id: id || `mov_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    tipo,
    valor: String(valor),
    descricao,
    operador,
    criadoEm: now(),
  });

  const caixaDays = [
    {
      date: TODAY,
      movimentos: [
        makeMov('entrada', 150, 'Consulta Geral — Max (John Smith) — Cartão Crédito', 'Dr. Sarah Johnson', 'mov_today_001'),
      ],
    },
    {
      date: YESTERDAY,
      movimentos: [
        makeMov('entrada', 80,  'Retorno — Max (John Smith) — Pix', 'Dr. Sarah Johnson', 'mov_yes_001'),
        makeMov('entrada', 120, 'Exame Lab — Luna (Maria Garcia) — Débito', 'Dr. Michael Chen', 'mov_yes_002'),
      ],
      fechamento: {
        valorContado: '200',
        observacoes: 'Fechamento diário. Sem divergências.',
        fechadoEm: now(),
        operador: 'Ana Lima',
      },
    },
    {
      date: DAY3AGO,
      movimentos: [
        makeMov('entrada', 800, 'Cirurgia Básica — Thor (Robert Wilson) — Cartão Crédito', 'Dr. Sarah Johnson', 'mov_d3_001'),
        makeMov('saida',   350, 'Materiais médicos e cirúrgicos', 'Ana Lima', 'mov_d3_002'),
      ],
      fechamento: {
        valorContado: '450',
        observacoes: 'Saldo confere.',
        fechadoEm: now(),
        operador: 'Ana Lima',
      },
    },
    {
      date: DAY4AGO,
      movimentos: [
        makeMov('entrada', 200, 'Exame Imagem — Pix', 'Dr. Sarah Johnson', 'mov_d4_001'),
      ],
      fechamento: {
        valorContado: '200',
        observacoes: '',
        fechadoEm: now(),
        operador: 'Ana Lima',
      },
    },
    {
      date: DAY5AGO,
      movimentos: [
        makeMov('entrada', 60,   'Vacinação — Dinheiro', 'Dr. Michael Chen', 'mov_d5_001'),
        makeMov('saida',   1200, 'Aluguel mensal', 'Ana Lima', 'mov_d5_002'),
      ],
      fechamento: {
        valorContado: '60',
        observacoes: 'Aluguel debitado.',
        fechadoEm: now(),
        operador: 'Ana Lima',
      },
    },
  ];

  for (const day of caixaDays) {
    await setDoc(doc(db, 'bea_data', TENANT, 'caixa', day.date), {
      date: day.date,
      status: day.fechamento ? 'fechado' : 'aberto',
      saldoInicial: '0',
      operador: 'Demo User',
      aberturaAt: now(),
      movimentos: day.movimentos,
      ...(day.fechamento ? { fechamento: day.fechamento } : {}),
    });
  }

  // ── 8. Pricing Config & Services ───────────────────────────────────────────
  console.log('8/8  Pricing...');
  
  const pricingConfig = {
    staff: [
      { id: IDS.s_sarah, name: "Dr. Sarah Johnson", role: "Veterinarian", monthlyCost: 8000, hoursPerMonth: 160, costPerHour: 50, type: "clinical" },
      { id: IDS.s_michael, name: "Dr. Michael Chen", role: "Veterinarian", monthlyCost: 7500, hoursPerMonth: 160, costPerHour: 46.875, type: "clinical" },
      { id: IDS.s_ana, name: "Ana Lima", role: "Receptionist", monthlyCost: 2500, hoursPerMonth: 176, costPerHour: 14.20, type: "fixed" }
    ],
    fixedExpenses: [
      { id: "fe_1", name: "Rent", amount: 3500, category: "facility" },
      { id: "fe_2", name: "Electricity", amount: 400, category: "utilities" },
      { id: "fe_3", name: "Water", amount: 80, category: "utilities" },
      { id: "fe_4", name: "Software subscriptions", amount: 200, category: "software" },
      { id: "fe_5", name: "Marketing", amount: 500, category: "marketing" }
    ],
    taxRate: 6,
    cardRates: { debit: 1.5, creditCash: 2.5, creditInstallment: 3.5, pix: 0 },
    paymentMix: { debit: 20, creditCash: 30, creditInstallment: 30, pix: 20 },
    monthlyWorkingDays: 22,
    dailyWorkingHours: 8,
    updatedAt: now()
  };

  await setDoc(CFG_DOC('pricing', 'config'), pricingConfig);

  // General Consultation
  await setDoc(doc(db, 'bea_data', TENANT, 'pricing_services', IDS.sv_consult), {
    serviceId: IDS.sv_consult,
    serviceName: 'General Consultation',
    durationMinutes: 30,
    supplies: [
      { name: 'Seringa', unitCost: 1.5, quantity: 1, unit: 'un' },
      { name: 'Luvas', unitCost: 0.5, quantity: 2, unit: 'un' }
    ],
    clinicalStaffId: IDS.s_sarah,
    biologicalRisk: 'low',
    targetMargin: 30,
    result: {
      suppliesCost: 2.5,
      laborCost: 25.0,
      fixedCostShare: 18.2, // ~ ( (3500+400+80+200+500 + 2500) / (22*8*60) ) * 30 = 20.3, but we'll use exact math
      subtotalCost: 47.8, // Approximation for seed
      effectiveCardRate: 2.1, // 0.021
      taxRate: 6, // 0.06
      totalDeductions: 8.1,
      biologicalRiskPremium: 0,
      minimumPrice: 52.01,
      suggestedPrice: 77.22,
      maximumPrice: 77.22,
      contributionMargin: 32, // Healthy margin vs current 150 price
      breakEvenUnits: 153
    }
  });

  // Basic Surgery
  await setDoc(doc(db, 'bea_data', TENANT, 'pricing_services', IDS.sv_surgery), {
    serviceId: IDS.sv_surgery,
    serviceName: 'Basic Surgery',
    durationMinutes: 90,
    supplies: [
      { name: 'Kit Cirúrgico', unitCost: 150, quantity: 1, unit: 'un' },
      { name: 'Anestesia', unitCost: 80, quantity: 1, unit: 'dose' }
    ],
    clinicalStaffId: IDS.s_sarah,
    biologicalRisk: 'high',
    targetMargin: 40,
    result: {
      suppliesCost: 230,
      laborCost: 75.0,
      fixedCostShare: 54.6,
      subtotalCost: 359.6,
      effectiveCardRate: 2.1,
      taxRate: 6,
      totalDeductions: 8.1,
      biologicalRiskPremium: 25,
      minimumPrice: 391.29,
      suggestedPrice: 692.87,
      maximumPrice: 866.08,
      contributionMargin: 12, // Loss or below target against 800
      breakEvenUnits: 19
    }
  });

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────');
  console.log('✅ Seed complete! Data written to tenant:', TENANT);
  console.log('\n   Modules seeded:');
  console.log('   • Clinic config');
  console.log(`   • ${services.length} services`);
  console.log(`   • ${staff.length} staff members`);
  console.log(`   • ${customers.length} customers (with patients)`);
  console.log(`   • ${appointments.length} appointments (yesterday/today/tomorrow)`);
  console.log(`   • ${records.length} medical records`);
  console.log(`   • ${caixaDays.length} days of cash register`);
  console.log(`   • Pricing config and 2 analyzed services`);
  console.log('\n   Login now: https://monitorbea.web.app');
  console.log('   Email:     demo@clinicos.com');
  console.log('   Password:  Demo@2026');
  console.log('─────────────────────────────────────────────\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n❌ Seed failed:', err.code || err.message, err);
  process.exit(1);
});
