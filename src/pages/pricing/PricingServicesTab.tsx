import { useEffect, useState } from 'react';
import { PricingConfig, subscribeServicePricingList, ServicePricingInput, PricingResult, saveServicePricing, calculateServicePrice } from '../../services/pricingService';
import { subscribeServices, ClinicService, saveService } from '../../services/dataService';
import { Settings2, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import ServicePricingModal from './ServicePricingModal';
import { useTranslation } from 'react-i18next';

interface Props {
  config: PricingConfig;
}

type PricingData = ServicePricingInput & { result: PricingResult };

const PricingServicesTab = ({ config }: Props) => {
  const { t } = useTranslation(['pricing', 'common']);
  const [services, setServices] = useState<ClinicService[]>([]);
  const [pricings, setPricings] = useState<PricingData[]>([]);
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState<ClinicService | null>(null);

  useEffect(() => {
    const unsub1 = subscribeServices(setServices);
    const unsub2 = subscribeServicePricingList(setPricings);
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleSavePricing = async (input: ServicePricingInput) => {
    const result = calculateServicePrice(input, config);
    const targetPrice = input.biologicalRisk !== 'low' ? result.maximumPrice : result.suggestedPrice;
    
    // Save pricing config
    await saveServicePricing({ ...input, result });
    
    // Update actual service price in catalog
    if (selectedService) {
      await saveService({
        ...selectedService,
        price: targetPrice
      });
    }
    
    setSelectedService(null);
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  const getStatus = (pricing?: PricingData) => {
    if (!pricing) return { label: 'Não Configurado', color: 'text-white/40', bg: 'bg-white/5', icon: null };
    
    const margin = pricing.result.contributionMargin;
    if (margin >= pricing.targetMargin) {
      return { label: 'Saudável', color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle };
    } else if (margin > 0) {
      return { label: 'Abaixo do Alvo', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: AlertTriangle };
    } else {
      return { label: 'Prejuízo', color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertTriangle };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
        <input
          type="text"
          placeholder={t('pricing:services.search_placeholder', 'Buscar serviço por nome ou categoria...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50"
        />
      </div>

      {/* Services List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map(service => {
          const pricing = pricings.find(p => p.serviceId === service.id);
          const status = getStatus(pricing);
          const StatusIcon = status.icon;

          return (
            <div key={service.id} className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col justify-between hover:bg-white/10 transition-colors">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-white text-lg leading-tight">{service.name}</h3>
                    <p className="text-sm text-purple-200/60">{service.duration} {service.durationUnit} • {service.category}</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${status.bg} ${status.color}`}>
                    {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
                    <span className="text-xs font-bold uppercase tracking-wider">{status.label}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Preço Atual:</span>
                    <span className="font-bold text-white">R$ {service.price.toFixed(2)}</span>
                  </div>
                  {pricing && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Preço Sugerido:</span>
                        <span className="text-primary font-medium">R$ {pricing.result.suggestedPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Margem:</span>
                        <span className={`font-medium ${pricing.result.contributionMargin < 0 ? 'text-red-400' : 'text-white'}`}>
                          {pricing.result.contributionMargin.toFixed(1)}%
                        </span>
                      </div>
                    </>
                  )}
                  {!pricing && (
                    <div className="text-sm text-white/40 italic pt-1">
                      Nenhuma precificação técnica calculada.
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={() => setSelectedService(service)}
                className="mt-5 w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-primary/20 text-white font-medium py-2.5 rounded-xl transition-colors border border-white/10 hover:border-primary/50 hover:text-primary"
              >
                <Settings2 className="w-4 h-4" />
                {t('pricing:services.configure', 'Configurar Precificação')}
              </button>
            </div>
          );
        })}

        {filteredServices.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-3xl text-white/50">
            Nenhum serviço encontrado.
          </div>
        )}
      </div>

      {selectedService && (
        <ServicePricingModal
          service={selectedService}
          config={config}
          initialData={pricings.find(p => p.serviceId === selectedService.id)}
          onSave={handleSavePricing}
          onClose={() => setSelectedService(null)}
        />
      )}
    </div>
  );
};

export default PricingServicesTab;
