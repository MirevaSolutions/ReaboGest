import { useState } from 'react';
import Layout, { type PageKey } from '@/components/Layout';
import DashboardPage from '@/pages/DashboardPage';
import ClientsPage from '@/pages/ClientsPage';
import ClientDetailPage from '@/pages/ClientDetailPage';
import ReabonnementsPage from '@/pages/ReabonnementsPage';
import SoldePage from '@/pages/SoldePage';
import StatistiquesPage from '@/pages/StatistiquesPage';
import ParametresPage from '@/pages/ParametresPage';

function App() {
  const [page, setPage] = useState<PageKey>('clients');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const handleNavigate = (p: PageKey) => {
    setSelectedClientId(null);
    setPage(p);
  };

  const handleOpenClient = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const handleBackFromDetail = () => {
    setSelectedClientId(null);
  };

  const renderPage = () => {
    if (page === 'clients' && selectedClientId) {
      return <ClientDetailPage clientId={selectedClientId} onBack={handleBackFromDetail} />;
    }
    switch (page) {
      case 'dashboard':
        return <DashboardPage onOpenClient={handleOpenClient} />;
      case 'clients':
        return <ClientsPage onOpenClient={handleOpenClient} />;
      case 'reabonnements':
        return <ReabonnementsPage />;
      case 'solde':
        return <SoldePage />;
      case 'statistiques':
        return <StatistiquesPage />;
      case 'parametres':
        return <ParametresPage />;
      default:
        return <DashboardPage onOpenClient={handleOpenClient} />;
    }
  };

  return (
    <Layout current={page} onNavigate={handleNavigate}>
      <div key={page + (selectedClientId ?? '')} className="h-full">
        {renderPage()}
      </div>
    </Layout>
  );
}

export default App;
