import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import RFQListingPage from './pages/RFQListingPage';
import RFQDetailPage from './pages/RFQDetailPage';
import RFQCreateModal from './components/RFQCreateModal';
import { api } from './services/api';

export default function App() {
  const [currentView, setCurrentView] = useState('listing'); // 'listing' | 'detail'
  const [selectedRfqId, setSelectedRfqId] = useState(null);
  const [rfqs, setRfqs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch RFQs list
  async function fetchRfqs() {
    try {
      setIsLoading(true);
      const data = await api.getRfqs();
      setRfqs(data);
    } catch (err) {
      console.error('Failed to fetch RFQs:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchRfqs();
  }, []);

  function handleSelectRfq(id) {
    setSelectedRfqId(id);
    setCurrentView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleNavigateHome() {
    setCurrentView('listing');
    setSelectedRfqId(null);
    fetchRfqs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleCreated(newRfq) {
    await fetchRfqs();
    if (newRfq?.id) {
      handleSelectRfq(newRfq.id);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Navbar */}
      <Navbar
        currentView={currentView}
        onNavigateHome={handleNavigateHome}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentView === 'listing' ? (
          <RFQListingPage
            rfqs={rfqs}
            isLoading={isLoading}
            onSelectRfq={handleSelectRfq}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        ) : (
          <RFQDetailPage
            rfqId={selectedRfqId}
            onBack={handleNavigateHome}
          />
        )}
      </main>

      {/* RFQ Creation Modal */}
      <RFQCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleCreated}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 mt-12 text-center text-xs text-slate-500">
        <p>GoComet British Reverse Auction RFQ Platform • Built with FastAPI, PostgreSQL & React</p>
      </footer>
    </div>
  );
}
