import { useState } from 'react';
import { AppUser } from '../../services/dataService';
import SurgeriesList from './SurgeriesList';
import SurgerySheet from './SurgerySheet';
import NewSurgeryModal from '../../components/medical/NewSurgeryModal';
import { Scissors, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  userProfile: AppUser | null;
}

const SurgeriesModule = ({ userProfile }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  if (selectedId) {
    return (
      <SurgerySheet
        surgeryId={selectedId}
        userProfile={userProfile}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col space-y-5">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Scissors className="w-6 h-6 text-teal-400" />
            {t('medical:surgeries.title', 'Cirurgias')}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{t('medical:surgeries.subtitle', 'Gestão de procedimentos cirúrgicos e protocolos anestésicos')}</p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="bg-teal-500 hover:bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-teal-500/20 flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-5 h-5" /> {t('medical:surgeries.new_surgery', 'Nova Cirurgia')}
        </button>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-hidden min-h-0">
        <SurgeriesList userProfile={userProfile} onOpenSheet={setSelectedId} />
      </div>

      {/* MODAL */}
      {showNewModal && (
        <NewSurgeryModal
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

export default SurgeriesModule;
