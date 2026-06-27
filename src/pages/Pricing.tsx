import { useState, useEffect } from 'react';
import { AppUser } from '../services/dataService';
import { Calculator, Settings, Stethoscope, LineChart } from 'lucide-react';
import { PricingConfig, subscribePricingConfig } from '../services/pricingService';
import PricingSetupTab from './pricing/PricingSetupTab';
import PricingServicesTab from './pricing/PricingServicesTab';
import PricingDashboardTab from './pricing/PricingDashboardTab';
import { useTranslation } from 'react-i18next';

interface PricingProps {
  userProfile?: AppUser | null;
}

type PricingTab = 'setup' | 'services' | 'dashboard';

const Pricing = ({}: PricingProps) => {
  const { t } = useTranslation(['pricing', 'common']);
  const [activeTab, setActiveTab] = useState<PricingTab>('dashboard');
  const [config, setConfig] = useState<PricingConfig | null>(null);

  useEffect(() => {
    const unsub = subscribePricingConfig((data) => {
      setConfig(data);
    });
    return () => unsub();
  }, []);

  if (!config) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: t('pricing:tab_dashboard', 'Dashboard'), icon: LineChart },
    { id: 'services', label: t('pricing:tab_services', 'Services Pricing'), icon: Stethoscope },
    { id: 'setup', label: t('pricing:tab_setup', 'Financial Setup'), icon: Settings },
  ] as const;

  return (
    <div className="h-full bg-base overflow-y-auto">
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-white">{t('pricing:title', 'Precificação Técnica')}</h1>
          </div>
          <p className="text-purple-200">
            {t('pricing:subtitle', 'Gerencie custos, margens e garanta a saúde financeira da sua clínica.')}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-white/5 backdrop-blur-md rounded-2xl w-fit">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                activeTab === id
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-purple-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-6">
          {activeTab === 'dashboard' && <PricingDashboardTab config={config} />}
          {activeTab === 'services' && <PricingServicesTab config={config} />}
          {activeTab === 'setup' && <PricingSetupTab config={config} />}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
