import fs from 'fs';
import path from 'path';

const localesDir = path.join(process.cwd(), 'src', 'i18n', 'locales');

const ptCrm = {
  "title": "CRM",
  "clients": "Clientes",
  "patients": "Pacientes",
  "new_client": "Novo Cliente",
  "new_patient": "Novo Paciente",
  "client_details": "Detalhes do Cliente",
  "patient_details": "Ficha do Paciente",
  "history": "Histórico",
  "pet_name": "Nome do pet",
  "breed": "Raça",
  "sex": "Sexo",
  "age": "Idade",
  "weight": "Peso",
  "client_name": "Nome do tutor",
  "document": "CPF",
  "client_since": "Cliente desde"
};

const enCrm = {
  "title": "CRM",
  "clients": "Clients",
  "patients": "Patients",
  "new_client": "New Client",
  "new_patient": "New Patient",
  "client_details": "Client Details",
  "patient_details": "Patient Record",
  "history": "History",
  "pet_name": "Pet name",
  "breed": "Breed",
  "sex": "Sex",
  "age": "Age",
  "weight": "Weight",
  "client_name": "Owner name",
  "document": "ID Document",
  "client_since": "Client since"
};

const esCrm = {
  "title": "CRM",
  "clients": "Clientes",
  "patients": "Pacientes",
  "new_client": "Nuevo Cliente",
  "new_patient": "Nuevo Paciente",
  "client_details": "Detalles del Cliente",
  "patient_details": "Ficha del Paciente",
  "history": "Historial",
  "pet_name": "Nombre de la mascota",
  "breed": "Raza",
  "sex": "Sexo",
  "age": "Edad",
  "weight": "Peso",
  "client_name": "Nombre del tutor",
  "document": "Documento de identidad",
  "client_since": "Cliente desde"
};

const ptAppointments = {
  "title": "Agendamentos",
  "calendar": "Calendário",
  "new_appointment": "Novo Agendamento",
  "schedule": "Agendar",
  "reschedule": "Reagendar",
  "cancel": "Cancelar Agendamento",
  "service": "Serviço",
  "professional": "Profissional",
  "status_scheduled": "Agendado",
  "status_confirmed": "Confirmado",
  "status_cancelled": "Cancelado",
  "status_completed": "Concluído",
  "select_date": "Selecione a data",
  "select_time": "Selecione o horário"
};

const enAppointments = {
  "title": "Appointments",
  "calendar": "Calendar",
  "new_appointment": "New Appointment",
  "schedule": "Schedule",
  "reschedule": "Reschedule",
  "cancel": "Cancel Appointment",
  "service": "Service",
  "professional": "Professional",
  "status_scheduled": "Scheduled",
  "status_confirmed": "Confirmed",
  "status_cancelled": "Cancelled",
  "status_completed": "Completed",
  "select_date": "Select date",
  "select_time": "Select time"
};

const esAppointments = {
  "title": "Citas",
  "calendar": "Calendario",
  "new_appointment": "Nueva Cita",
  "schedule": "Programar",
  "reschedule": "Reprogramar",
  "cancel": "Cancelar Cita",
  "service": "Servicio",
  "professional": "Profesional",
  "status_scheduled": "Programada",
  "status_confirmed": "Confirmada",
  "status_cancelled": "Cancelada",
  "status_completed": "Completada",
  "select_date": "Seleccionar fecha",
  "select_time": "Seleccionar hora"
};

const ptRecords = {
  "title": "Prontuários",
  "medical_record": "Prontuário Médico",
  "clinical_history": "Histórico Clínico",
  "vaccines": "Vacinas",
  "exams": "Exames",
  "prescriptions": "Receitas",
  "export_pdf": "Exportar PDF",
  "print_record": "Imprimir Prontuário",
  "documents": "Documentos e Anexos",
  "upload_exam": "Anexar Exame"
};

const enRecords = {
  "title": "Medical Records",
  "medical_record": "Medical Record",
  "clinical_history": "Clinical History",
  "vaccines": "Vaccines",
  "exams": "Exams",
  "prescriptions": "Prescriptions",
  "export_pdf": "Export PDF",
  "print_record": "Print Record",
  "documents": "Documents & Attachments",
  "upload_exam": "Upload Exam"
};

const esRecords = {
  "title": "Historiales",
  "medical_record": "Historial Médico",
  "clinical_history": "Historial Clínico",
  "vaccines": "Vacunas",
  "exams": "Exámenes",
  "prescriptions": "Recetas",
  "export_pdf": "Exportar PDF",
  "print_record": "Imprimir Historial",
  "documents": "Documentos y Adjuntos",
  "upload_exam": "Adjuntar Examen"
};

const ptProducts = {
  "title": "Produtos e Serviços",
  "new_product": "Novo Produto",
  "import_csv": "Importar via CSV",
  "barcode": "Código de Barras",
  "sku": "SKU",
  "category": "Categoria",
  "stock": "Estoque Atual",
  "min_stock": "Estoque Mínimo",
  "cost_price": "Preço de Custo",
  "sale_price": "Preço de Venda",
  "supplier": "Fornecedor",
  "type_product": "Produto Físico",
  "type_service": "Serviço"
};

const enProducts = {
  "title": "Products and Services",
  "new_product": "New Product",
  "import_csv": "Import via CSV",
  "barcode": "Barcode",
  "sku": "SKU",
  "category": "Category",
  "stock": "Current Stock",
  "min_stock": "Minimum Stock",
  "cost_price": "Cost Price",
  "sale_price": "Sale Price",
  "supplier": "Supplier",
  "type_product": "Physical Product",
  "type_service": "Service"
};

const esProducts = {
  "title": "Productos y Servicios",
  "new_product": "Nuevo Producto",
  "import_csv": "Importar vía CSV",
  "barcode": "Código de Barras",
  "sku": "SKU",
  "category": "Categoría",
  "stock": "Stock Actual",
  "min_stock": "Stock Mínimo",
  "cost_price": "Precio de Costo",
  "sale_price": "Precio de Venta",
  "supplier": "Proveedor",
  "type_product": "Producto Físico",
  "type_service": "Servicio"
};

const ptPricing = {
  "title": "Precificação",
  "pricing_engine": "Motor de Preços",
  "markup": "Margem de Lucro (Markup)",
  "fixed_costs": "Custos Fixos",
  "variable_costs": "Custos Variáveis",
  "taxes": "Impostos",
  "commissions": "Comissões",
  "simulate_price": "Simular Preço",
  "suggested_price": "Preço Sugerido",
  "profit_margin": "Margem de Lucro Líquido",
  "break_even": "Ponto de Equilíbrio"
};

const enPricing = {
  "title": "Pricing",
  "pricing_engine": "Pricing Engine",
  "markup": "Profit Margin (Markup)",
  "fixed_costs": "Fixed Costs",
  "variable_costs": "Variable Costs",
  "taxes": "Taxes",
  "commissions": "Commissions",
  "simulate_price": "Simulate Price",
  "suggested_price": "Suggested Price",
  "profit_margin": "Net Profit Margin",
  "break_even": "Break-even Point"
};

const esPricing = {
  "title": "Precios",
  "pricing_engine": "Motor de Precios",
  "markup": "Margen de Ganancia (Markup)",
  "fixed_costs": "Costos Fijos",
  "variable_costs": "Costos Variables",
  "taxes": "Impuestos",
  "commissions": "Comisiones",
  "simulate_price": "Simular Precio",
  "suggested_price": "Precio Sugerido",
  "profit_margin": "Margen de Ganancia Neta",
  "break_even": "Punto de Equilibrio"
};

const ptReconciliation = {
  "title": "Conciliação Bancária",
  "import_ofx": "Importar OFX",
  "bank_statement": "Extrato Bancário",
  "system_entries": "Lançamentos do Sistema",
  "status_matched": "Conciliado",
  "status_pending": "Pendente",
  "status_divergent": "Divergente",
  "match_found": "Correspondência Encontrada",
  "manual_match": "Conciliar Manualmente",
  "ignore_transaction": "Ignorar Transação",
  "reconcile_all": "Conciliar Selecionados"
};

const enReconciliation = {
  "title": "Bank Reconciliation",
  "import_ofx": "Import OFX",
  "bank_statement": "Bank Statement",
  "system_entries": "System Entries",
  "status_matched": "Reconciled",
  "status_pending": "Pending",
  "status_divergent": "Divergent",
  "match_found": "Match Found",
  "manual_match": "Manual Match",
  "ignore_transaction": "Ignore Transaction",
  "reconcile_all": "Reconcile Selected"
};

const esReconciliation = {
  "title": "Conciliación Bancaria",
  "import_ofx": "Importar OFX",
  "bank_statement": "Estado de Cuenta",
  "system_entries": "Registros del Sistema",
  "status_matched": "Conciliado",
  "status_pending": "Pendiente",
  "status_divergent": "Divergente",
  "match_found": "Coincidencia Encontrada",
  "manual_match": "Conciliar Manualmente",
  "ignore_transaction": "Ignorar Transacción",
  "reconcile_all": "Conciliar Seleccionados"
};

const ptSettings = {
  "title": "Configurações",
  "clinic_data": "Dados da Clínica",
  "integrations": "Integrações",
  "users_roles": "Usuários e Permissões",
  "billing": "Assinatura e Faturamento",
  "whatsapp_api": "API do WhatsApp",
  "payment_gateway": "Gateway de Pagamento",
  "logo": "Logotipo da Clínica",
  "business_hours": "Horário de Funcionamento",
  "save_settings": "Salvar Configurações"
};

const enSettings = {
  "title": "Settings",
  "clinic_data": "Clinic Data",
  "integrations": "Integrations",
  "users_roles": "Users and Roles",
  "billing": "Billing and Subscription",
  "whatsapp_api": "WhatsApp API",
  "payment_gateway": "Payment Gateway",
  "logo": "Clinic Logo",
  "business_hours": "Business Hours",
  "save_settings": "Save Settings"
};

const esSettings = {
  "title": "Configuración",
  "clinic_data": "Datos de la Clínica",
  "integrations": "Integraciones",
  "users_roles": "Usuarios y Permisos",
  "billing": "Facturación y Suscripción",
  "whatsapp_api": "API de WhatsApp",
  "payment_gateway": "Pasarela de Pago",
  "logo": "Logotipo de la Clínica",
  "business_hours": "Horario de Atención",
  "save_settings": "Guardar Configuración"
};

const ptAdmin = {
  "title": "Admin Console",
  "system_alerts": "Alertas do Sistema",
  "audit_log": "Log de Auditoria",
  "tenant_management": "Gestão de Instâncias (Tenants)",
  "active_users": "Usuários Ativos",
  "system_health": "Saúde do Sistema",
  "database_usage": "Uso do Banco de Dados",
  "storage_usage": "Uso de Armazenamento"
};

const enAdmin = {
  "title": "Admin Console",
  "system_alerts": "System Alerts",
  "audit_log": "Audit Log",
  "tenant_management": "Tenant Management",
  "active_users": "Active Users",
  "system_health": "System Health",
  "database_usage": "Database Usage",
  "storage_usage": "Storage Usage"
};

const esAdmin = {
  "title": "Consola Admin",
  "system_alerts": "Alertas del Sistema",
  "audit_log": "Registro de Auditoría",
  "tenant_management": "Gestión de Instancias",
  "active_users": "Usuarios Activos",
  "system_health": "Salud del Sistema",
  "database_usage": "Uso de Base de Datos",
  "storage_usage": "Uso de Almacenamiento"
};

const ptSetup = {
  "title": "Setup Inicial",
  "welcome_setup": "Bem-vindo ao ClinicOS!",
  "step_1": "Configurar Dados da Clínica",
  "step_2": "Importar Produtos e Serviços",
  "step_3": "Convidar Equipe",
  "finish_setup": "Concluir Setup",
  "demo_access": "Acesso Demo"
};

const enSetup = {
  "title": "Initial Setup",
  "welcome_setup": "Welcome to ClinicOS!",
  "step_1": "Configure Clinic Data",
  "step_2": "Import Products and Services",
  "step_3": "Invite Team",
  "finish_setup": "Finish Setup",
  "demo_access": "Demo Access"
};

const esSetup = {
  "title": "Configuración Inicial",
  "welcome_setup": "¡Bienvenido a ClinicOS!",
  "step_1": "Configurar Datos de la Clínica",
  "step_2": "Importar Productos y Servicios",
  "step_3": "Invitar Equipo",
  "finish_setup": "Finalizar Configuración",
  "demo_access": "Acceso Demo"
};

const map = {
  crm: { pt: ptCrm, en: enCrm, es: esCrm },
  appointments: { pt: ptAppointments, en: enAppointments, es: esAppointments },
  records: { pt: ptRecords, en: enRecords, es: esRecords },
  products: { pt: ptProducts, en: enProducts, es: esProducts },
  pricing: { pt: ptPricing, en: enPricing, es: esPricing },
  reconciliation: { pt: ptReconciliation, en: enReconciliation, es: esReconciliation },
  settings: { pt: ptSettings, en: enSettings, es: esSettings },
  admin: { pt: ptAdmin, en: enAdmin, es: esAdmin },
  setup: { pt: ptSetup, en: enSetup, es: esSetup },
};

Object.keys(map).forEach(key => {
  fs.writeFileSync(path.join(localesDir, 'pt-BR', `${key}.json`), JSON.stringify(map[key].pt, null, 2));
  fs.writeFileSync(path.join(localesDir, 'en', `${key}.json`), JSON.stringify(map[key].en, null, 2));
  fs.writeFileSync(path.join(localesDir, 'es', `${key}.json`), JSON.stringify(map[key].es, null, 2));
});
