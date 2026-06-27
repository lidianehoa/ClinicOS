import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// PT-BR
import ptCommon from './locales/pt-BR/common.json';
import ptAuth from './locales/pt-BR/auth.json';
import ptDashboard from './locales/pt-BR/dashboard.json';
import ptMonitoring from './locales/pt-BR/monitoring.json';
import ptCashier from './locales/pt-BR/cashier.json';
import ptCrm from './locales/pt-BR/crm.json';
import ptAppointments from './locales/pt-BR/appointments.json';
import ptRecords from './locales/pt-BR/records.json';
import ptProducts from './locales/pt-BR/products.json';
import ptPricing from './locales/pt-BR/pricing.json';
import ptReconciliation from './locales/pt-BR/reconciliation.json';
import ptSettings from './locales/pt-BR/settings.json';
import ptMedical from './locales/pt-BR/medical.json';
import ptAdmin from './locales/pt-BR/admin.json';
import ptSetup from './locales/pt-BR/setup.json';

// EN
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import enMonitoring from './locales/en/monitoring.json';
import enCashier from './locales/en/cashier.json';
import enCrm from './locales/en/crm.json';
import enAppointments from './locales/en/appointments.json';
import enRecords from './locales/en/records.json';
import enProducts from './locales/en/products.json';
import enPricing from './locales/en/pricing.json';
import enReconciliation from './locales/en/reconciliation.json';
import enSettings from './locales/en/settings.json';
import enMedical from './locales/en/medical.json';
import enAdmin from './locales/en/admin.json';
import enSetup from './locales/en/setup.json';

// ES
import esCommon from './locales/es/common.json';
import esAuth from './locales/es/auth.json';
import esDashboard from './locales/es/dashboard.json';
import esMonitoring from './locales/es/monitoring.json';
import esCashier from './locales/es/cashier.json';
import esCrm from './locales/es/crm.json';
import esAppointments from './locales/es/appointments.json';
import esRecords from './locales/es/records.json';
import esProducts from './locales/es/products.json';
import esPricing from './locales/es/pricing.json';
import esReconciliation from './locales/es/reconciliation.json';
import esSettings from './locales/es/settings.json';
import esMedical from './locales/es/medical.json';
import esAdmin from './locales/es/admin.json';
import esSetup from './locales/es/setup.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': {
        common: ptCommon,
        auth: ptAuth,
        dashboard: ptDashboard,
        monitoring: ptMonitoring,
        cashier: ptCashier,
        crm: ptCrm,
        appointments: ptAppointments,
        records: ptRecords,
        products: ptProducts,
        pricing: ptPricing,
        reconciliation: ptReconciliation,
        settings: ptSettings,
        medical: ptMedical,
        admin: ptAdmin,
        setup: ptSetup,
      },
      en: {
        common: enCommon,
        auth: enAuth,
        dashboard: enDashboard,
        monitoring: enMonitoring,
        cashier: enCashier,
        crm: enCrm,
        appointments: enAppointments,
        records: enRecords,
        products: enProducts,
        pricing: enPricing,
        reconciliation: enReconciliation,
        settings: enSettings,
        medical: enMedical,
        admin: enAdmin,
        setup: enSetup,
      },
      es: {
        common: esCommon,
        auth: esAuth,
        dashboard: esDashboard,
        monitoring: esMonitoring,
        cashier: esCashier,
        crm: esCrm,
        appointments: esAppointments,
        records: esRecords,
        products: esProducts,
        pricing: esPricing,
        reconciliation: esReconciliation,
        settings: esSettings,
        medical: esMedical,
        admin: esAdmin,
        setup: esSetup,
      },
    },
    defaultNS: 'common',
    fallbackLng: 'pt-BR',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'clinicos_language',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
export type SupportedLanguage = 'pt-BR' | 'en' | 'es';
