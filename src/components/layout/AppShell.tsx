import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { ActiveTab } from '../../App';
import { AppUser } from '../../services/dataService';

interface AppShellProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userProfile: AppUser | null;
  onLogout: () => void;
  children: ReactNode;
}

const AppShell = ({ activeTab, setActiveTab, userProfile, onLogout, children }: AppShellProps) => {
  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: '#FDFCFE' }}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userProfile={userProfile} 
        onLogout={onLogout} 
      />
      <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppShell;
