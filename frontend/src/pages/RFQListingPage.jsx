import React, { useState } from 'react';
import { Search, Ship, Clock, Award, ShieldAlert, Zap, ArrowRight, Filter, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CountdownTimer from '../components/CountdownTimer';

export default function RFQListingPage({ rfqs = [], isLoading, onSelectRfq, onOpenCreateModal }) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtered RFQs
  const filteredRfqs = rfqs.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesSearch = 
      searchTerm.trim() === '' ||
      r.reference_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate Metrics
  const totalCount = rfqs.length;
  const activeCount = rfqs.filter((r) => r.status === 'ACTIVE').length;
  const extendedCount = rfqs.filter((r) => r.extension_count > 0).length;
  const totalBids = rfqs.reduce((acc, r) => acc + (r.total_bids_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total RFQs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total RFQs</span>
            <Ship className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white">
            {totalCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total reverse auctions created</p>
        </motion.div>

        {/* Metric 2: Active Auctions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/30 shadow-xl backdrop-blur-sm"
        >
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Live Bidding</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
            {activeCount}
          </div>
          <p className="text-[11px] text-emerald-300/70 mt-1">Auctions accepting supplier bids</p>
        </motion.div>

        {/* Metric 3: Extended Auctions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 to-slate-900 border border-amber-500/30 shadow-xl backdrop-blur-sm"
        >
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Auto-Extended</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
            {extendedCount}
          </div>
          <p className="text-[11px] text-amber-300/70 mt-1">Auctions with snip-prevention extensions</p>
        </motion.div>

        {/* Metric 4: Total Bids Received */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Quotes</span>
            <Award className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-300">
            {totalBids}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total quotes submitted across all RFQs</p>
        </motion.div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {['ALL', 'ACTIVE', 'CLOSED', 'FORCE_CLOSED', 'UPCOMING'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === status
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {status === 'ALL' ? 'All Auctions' : status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Reference ID or Title..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>
      </div>

      {/* RFQ Listing Table / Cards */}
      {isLoading ? (
        <div className="p-16 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="w-8 h-8 mx-auto border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-medium">Loading British Reverse Auctions...</p>
        </div>
      ) : filteredRfqs.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
          <Ship className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-white mb-1">No Auctions Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Try adjusting your search terms or status filters.'
              : 'Create your first British Reverse Auction to see automatic extension rules in action!'}
          </p>
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition-colors"
          >
            Create New RFQ
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          <AnimatePresence>
            {filteredRfqs.map((rfq, idx) => {
              const hasExtensions = rfq.extension_count > 0;
              const isActive = rfq.status === 'ACTIVE';

              return (
                <motion.div
                  key={rfq.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  onClick={() => onSelectRfq(rfq.id)}
                  className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 shadow-lg hover:shadow-2xl transition-all cursor-pointer group"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Identity & Route */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-800 text-sky-400 border border-slate-700">
                          {rfq.reference_id}
                        </span>

                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                          rfq.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : rfq.status === 'FORCE_CLOSED'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : rfq.status === 'CLOSED'
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          {rfq.status.replace('_', ' ')}
                        </span>

                        {/* Extension Count Badge */}
                        {hasExtensions && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span>+{rfq.extension_count * rfq.extension_duration_minutes}m ({rfq.extension_count}x extended)</span>
                          </span>
                        )}

                        <span className="text-[11px] text-slate-500 font-mono">
                          Trigger: {rfq.extension_trigger_type} (X={rfq.trigger_window_minutes}m, Y={rfq.extension_duration_minutes}m)
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                        {rfq.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        <span>Pickup: <strong className="text-slate-300">{new Date(rfq.pickup_service_date).toLocaleDateString()}</strong></span>
                        <span>•</span>
                        <span>Total Quotes: <strong className="text-white font-mono">{rfq.total_bids_count}</strong></span>
                      </div>
                    </div>

                    {/* Middle: L1 Lowest Quote Card */}
                    <div className="px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                          Current Lowest Bid (L1)
                        </span>
                        {rfq.lowest_bid_amount !== null ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-extrabold font-mono text-emerald-400">
                              ${rfq.lowest_bid_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-slate-400">by {rfq.lowest_bid_carrier}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">No bids submitted</span>
                        )}
                      </div>
                    </div>

                    {/* Right: Countdown & Forced Close Cap */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <CountdownTimer
                          compact={true}
                          currentCloseTime={rfq.current_bid_close_time}
                          forcedCloseTime={rfq.forced_bid_close_time}
                          startTime={rfq.bid_start_time}
                          triggerWindowMinutes={rfq.trigger_window_minutes}
                          extensionDurationMinutes={rfq.extension_duration_minutes}
                          status={rfq.status}
                        />
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-end gap-1 font-mono">
                          <ShieldAlert className="w-3 h-3 text-rose-400" />
                          <span>Cap: {new Date(rfq.forced_bid_close_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-800/50 group-hover:bg-sky-500 group-hover:text-white text-slate-400 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
