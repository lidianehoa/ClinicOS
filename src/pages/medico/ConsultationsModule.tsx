import { useState } from 'react';
import ConsultationsList from './ConsultationsList';
import ConsultationSheet from './ConsultationSheet';
import { AppUser } from '../../services/dataService';

const ConsultationsModule = ({ userProfile }: { userProfile: AppUser | null }) => {
  // useTranslation is used in child components
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return (
      <ConsultationSheet 
        consultationId={selectedId} 
        userProfile={userProfile} 
        onBack={() => setSelectedId(null)} 
      />
    );
  }

  return <ConsultationsList userProfile={userProfile} onOpen={setSelectedId} />;
};

export default ConsultationsModule;
