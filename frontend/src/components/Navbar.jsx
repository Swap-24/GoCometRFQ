import React from 'react';
import { Ship, Plus, ArrowLeft } from 'lucide-react';

export default function Navbar({ onOpenCreateModal, onNavigateHome, currentView }) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-6">
            <button 
              onClick={onNavigateHome}
              className="flex items-center gap-3 text-left focus:outline-none group"
            >
              <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center text-white shadow-sm">
                <Ship className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-gray-950">
                    GoComet
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                    British Auction
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 font-medium">
                  Reverse Auction RFQ System
                </p>
              </div>
            </button>

            {currentView === 'detail' && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 pl-4 border-l border-gray-200">
                <button 
                  onClick={onNavigateHome}
                  className="flex items-center gap-1 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>All Auctions</span>
                </button>
                <span>/</span>
                <span className="text-gray-900 font-semibold">Live Room</span>
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 text-gray-600 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-gray-700">System Connected</span>
            </div>

            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create RFQ</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
