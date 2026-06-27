import { useState } from 'react';
import { AppUser } from '../../services/dataService';
// Import child components
import HospitalizationsList from './HospitalizationsList';
import NewHospitalizationModal from '../../components/medical/NewHospitalizationModal';
import ExecutionMap from './ExecutionMap';
import HospitalizationHistory from './HospitalizationHistory';
import HospitalizationSheet from './HospitalizationSheet';
import { List, Map, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const HospitalizationsModule = ({ userProfile }: { userProfile: AppUser | null }) => {
  const { t } = useTranslation(['medical', 'common']);
  const [activeTab, setActiveTab] = useState<'lista' | 'mapa' | 'historico'>('lista');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  if (selectedId) {
    return (
      <HospitalizationSheet 
        hospitalizationId={selectedId} 
        userProfile={userProfile} 
        onBack={() => setSelectedId(null)} 
      />
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* HEADER NAV */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('medical:hospitalization.title', 'Internação')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('medical:hospitalization.subtitle', 'Gestão de pacientes internados, triagem e execução')}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setActiveTab('lista')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'lista' ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <List className="w-4 h-4" /> {t('medical:hospitalization.tab_list', 'Lista')}
            </button>
            <button 
              onClick={() => setActiveTab('mapa')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'mapa' ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Map className="w-4 h-4" /> {t('medical:hospitalization.tab_map', 'Mapa de Execução')}
            </button>
            <button 
              onClick={() => setActiveTab('historico')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'historico' ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <History className="w-4 h-4" /> {t('medical:hospitalization.tab_history', 'Histórico')}
            </button>
          </div>

          <button onClick={() => setShowNewModal(true)} className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-teal-500/20 whitespace-nowrap">
            + {t('medical:hospitalization.admit_patient', 'Internar Paciente')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'lista' && <HospitalizationsList userProfile={userProfile} onOpenSheet={setSelectedId} />}
        {activeTab === 'mapa' && <ExecutionMap userProfile={userProfile} />}
        {activeTab === 'historico' && <HospitalizationHistory onOpenSheet={setSelectedId} />}
      </div>

      {showNewModal && (
        <NewHospitalizationModal 
          userProfile={userProfile}
          onCancel={() => setShowNewModal(false)} 
          onSuccess={(id) => {
            setShowNewModal(false);
            setSelectedId(id);
          }}
        />
      )}
    </div>
  );
};

export default HospitalizationsModule;
