import React from 'react';
import { Ship, Plus, Activity, Layers, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Navbar({ onOpenCreateModal, onNavigateHome, currentView }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div 
            onClick={onNavigateHome}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-emerald-400 p-[2px] shadow-lg shadow-sky-500/20 group-hover:shadow-sky-500/40 transition-all">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Ship className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-sky-300 transition-colors">
                  GoComet
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  British RFQ
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Dynamic Reverse Auction Engine
              </p>
            </div>
          </div>

          {/* Center Info / Breadcrumbs */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <span 
              onClick={onNavigateHome} 
              className={`cursor-pointer hover:text-white transition-colors ${currentView === 'listing' ? 'text-white font-medium' : ''}`}
            >
              Auctions
            </span>
            {currentView === 'detail' && (
              <>
                <span>/</span>
                <span className="text-sky-400 font-medium">Live Auction Room</span>
              </>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>FastAPI & PostgreSQL Live</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create RFQ</span>
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  );
}
