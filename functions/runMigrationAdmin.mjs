/**
 * runMigrationAdmin.mjs
 * 
 * Executa a migração de dados para a estrutura multi-tenant usando Firebase Admin SDK:
 * 
 *   clinicas/{tenantId}/...
 *   tenants/{tenantId}
 *   usuarios/{uid}
 *   staff_email_index/{email}
 *
 * Execução:
 *   node functions/runMigrationAdmin.mjs
 */

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'manual-clinico' });

const auth = getAuth();
const db = getFirestore();

const TARGET_TENANT_ID = 'clinicos_demo';
const ADMIN_EMAIL = 'lidianehoa@gmail.com';

async function copyCollection(srcColRef, destColRef, label) {
  try {
    const snap = await srcColRef.get();
    if (snap.empty) {
      console.log(`  [vazio] ${label}`);
      return 0;
    }
    console.log(`  [migrando] ${label} (${snap.size} documentos)...`);
    
    let count = 0;
    for (const d of snap.docs) {
      const data = d.data();
      await destColRef.doc(d.id).set({
        ...data,
        id: d.id,
        tenantId: TARGET_TENANT_ID
      }, { merge: true });
      count++;
    }
    console.log(`  [ok] ${label}: ${count} docs migrados.`);
    return count;
  } catch (err) {
    console.warn(`  [aviso] ${label}:`, err.message);
    return 0;
  }
}

async function runMigration() {
  console.log('====================================================');
  console.log(`Iniciando migração Admin para Multi-Tenant: ${TARGET_TENANT_ID}`);
  console.log('====================================================');

  let adminUid = 'admin_demo';
  try {
    const userRec = await auth.getUserByEmail(ADMIN_EMAIL);
    adminUid = userRec.uid;
    console.log(`Admin encontrado: ${ADMIN_EMAIL} (UID: ${adminUid})`);
  } catch (err) {
    console.warn(`Admin user lookup: ${err.message}`);
  }

  // 1. Criar registro mestre em tenants/{tenantId}
  console.log('\n1. Criando /tenants/clinicos_demo...');
  await db.collection('tenants').doc(TARGET_TENANT_ID).set({
    id: TARGET_TENANT_ID,
    nome: 'Clínica Veterinária ClinicOS Demo',
    ownerEmail: ADMIN_EMAIL,
    ownerUid: adminUid,
    plano: 'pro',
    status: 'active',
    createdAt: new Date().toISOString()
  }, { merge: true });

  // 2. Criar ou atualizar perfil global do usuário em usuarios/{uid}
  console.log(`\n2. Criando /usuarios/${adminUid}...`);
  await db.collection('usuarios').doc(adminUid).set({
    uid: adminUid,
    nome: 'Lidiane Hoa',
    email: ADMIN_EMAIL.toLowerCase(),
    role: 'administrador',
    activeTenantId: TARGET_TENANT_ID,
    tenants: [TARGET_TENANT_ID],
    status: 'ativo',
    clinicName: 'Clínica Veterinária ClinicOS Demo',
    createdAt: new Date().toISOString()
  }, { merge: true });

  // 3. Migrar coleções da raiz
  console.log('\n3. Migrando coleções da raiz para clinicas/clinicos_demo/...');
  await copyCollection(db.collection('pacientes'), db.collection('clinicas').doc(TARGET_TENANT_ID).collection('pacientes'), 'pacientes (raiz)');
  await copyCollection(db.collection('responsaveis'), db.collection('clinicas').doc(TARGET_TENANT_ID).collection('responsaveis'), 'responsaveis (raiz)');
  await copyCollection(db.collection('records'), db.collection('clinicas').doc(TARGET_TENANT_ID).collection('records'), 'records (raiz)');
  await copyCollection(db.collection('notifications_log'), db.collection('clinicas').doc(TARGET_TENANT_ID).collection('notifications_log'), 'notifications_log (raiz)');

  // 4. Migrar coleções de artifacts/clinicos_demo/public/data/...
  console.log('\n4. Migrando coleções de artifacts/clinicos_demo/public/data/...');
  const artifactCols = [
    'customers',
    'daily_flow',
    'daily_expenses',
    'interactions',
    'termos_atendimento',
    'auditorias_compliance',
    'medicamentos_aplicados',
    'checklist_residuos',
    'consultations',
    'consultas_clinicas',
    'stock_alerts',
    'hospitalizations',
    'hospitalization_evolutions',
    'surgeries',
    'prescriptions',
    'scheduled_doses',
    'casos_clinicos',
    'exames',
    'analises',
    'notas_explicativas',
    'protocolos_clinicos',
    'services',
    'products',
    'reconciliations',
    'reconciliation_items'
  ];

  for (const colName of artifactCols) {
    const src = db.collection('artifacts').doc(TARGET_TENANT_ID).collection('public').doc('data').collection(colName);
    const dest = db.collection('clinicas').doc(TARGET_TENANT_ID).collection(colName);
    await copyCollection(src, dest, `artifacts > ${colName}`);
  }

  // 5. Migrar coleções de bea_data/clinicos_demo/...
  console.log('\n5. Migrando coleções de bea_data/clinicos_demo/...');
  const beaCols = [
    'staff',
    'produtos',
    'pricing_services',
    'caixa',
    'users'
  ];

  for (const colName of beaCols) {
    const src = db.collection('bea_data').doc(TARGET_TENANT_ID).collection(colName);
    const dest = db.collection('clinicas').doc(TARGET_TENANT_ID).collection(colName === 'produtos' ? 'products' : colName);
    await copyCollection(src, dest, `bea_data > ${colName}`);
  }

  // 6. Migrar documentos de configuração config/{clinic, integrations, homecare, fiscal}
  console.log('\n6. Migrando configurações...');
  try {
    const snap = await db.collection('artifacts').doc(TARGET_TENANT_ID).collection('public').doc('data').collection('config').get();
    for (const d of snap.docs) {
      await db.collection('clinicas').doc(TARGET_TENANT_ID).collection('config').doc(d.id).set(d.data(), { merge: true });
      console.log(`  [ok] config/${d.id} migrado.`);
    }
  } catch (e) {
    console.log('  Configuração padrão será usada.');
  }

  // 7. Popular staff_email_index para todos os e-mails de staff
  console.log('\n7. Populando staff_email_index...');
  try {
    const staffSnap = await db.collection('clinicas').doc(TARGET_TENANT_ID).collection('staff').get();
    for (const d of staffSnap.docs) {
      const s = d.data();
      if (s.email) {
        const email = s.email.trim().toLowerCase();
        await db.collection('staff_email_index').doc(email).set({
          email,
          tenants: [{
            tenantId: TARGET_TENANT_ID,
            role: s.accessLevel || 'staff',
            status: s.status || 'Active'
          }],
          defaultTenantId: TARGET_TENANT_ID,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log(`  [staff_index] ${email} -> ${TARGET_TENANT_ID}`);
      }
    }

    // Garante o admin no index
    await db.collection('staff_email_index').doc(ADMIN_EMAIL.toLowerCase()).set({
      email: ADMIN_EMAIL.toLowerCase(),
      tenants: [{
        tenantId: TARGET_TENANT_ID,
        role: 'Admin',
        status: 'Active'
      }],
      defaultTenantId: TARGET_TENANT_ID,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`  [staff_index] ${ADMIN_EMAIL} -> ${TARGET_TENANT_ID}`);
  } catch (err) {
    console.warn('  Aviso ao indexar staff:', err.message);
  }

  console.log('\n====================================================');
  console.log('✅ Migração Multi-Tenant concluída com sucesso!');
  console.log('====================================================\n');
}

runMigration().catch(console.error);
