import React, { useState } from 'react';
import { Search, Ship, Award, ShieldAlert, Zap, ArrowRight } from 'lucide-react';
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
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-4 sm:p-5 rounded-xl bg-white border border-gray-200/90 shadow-subtle hover:shadow-card-hover transition-all"
        >
          <div className="flex items-center justify-between text-gray-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total RFQs</span>
            <Ship className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-gray-950">
            {totalCount}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Created reverse auction RFQs</p>
        </motion.div>

        {/* Metric 2 */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.04 }}
          className="p-4 sm:p-5 rounded-xl bg-white border border-emerald-200/80 shadow-subtle hover:shadow-card-hover transition-all"
        >
          <div className="flex items-center justify-between text-emerald-800 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Live Bidding</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700">
            {activeCount}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Accepting active quotations</p>
        </motion.div>

        {/* Metric 3 */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.08 }}
          className="p-4 sm:p-5 rounded-xl bg-white border border-amber-200/80 shadow-subtle hover:shadow-card-hover transition-all"
        >
          <div className="flex items-center justify-between text-amber-800 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Auto-Extended</span>
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-800">
            {extendedCount}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Anti-sniping extensions granted</p>
        </motion.div>

        {/* Metric 4 */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.12 }}
          className="p-4 sm:p-5 rounded-xl bg-white border border-gray-200/90 shadow-subtle hover:shadow-card-hover transition-all"
        >
          <div className="flex items-center justify-between text-gray-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Quotes</span>
            <Award className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-gray-950">
            {totalBids}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Across all RFQs</p>
        </motion.div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl bg-white border border-gray-200/90 shadow-subtle flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {['ALL', 'ACTIVE', 'CLOSED', 'FORCE_CLOSED', 'UPCOMING'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                statusFilter === status
                  ? 'bg-gray-950 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-950'
              }`}
            >
              {status === 'ALL' ? 'All Auctions' : status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Reference ID or Route..."
            className="w-full pl-9 pr-3 py-1.5 rounded-md bg-white border border-gray-300 text-gray-900 placeholder-gray-400 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
          />
        </div>
      </div>

      {/* RFQ Listing */}
      {isLoading ? (
        <div className="p-16 text-center rounded-xl bg-white border border-gray-200">
          <div className="w-6 h-6 mx-auto border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin mb-2" />
          <p className="text-xs text-gray-500 font-medium">Loading auctions...</p>
        </div>
      ) : filteredRfqs.length === 0 ? (
        <div className="p-14 text-center rounded-xl bg-white border border-gray-200">
          <Ship className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-gray-900 mb-1">No Auctions Found</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-3">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Try adjusting your search criteria or status filter.'
              : 'Create a new British Reverse Auction to see the system in action.'}
          </p>
          <button
            onClick={onOpenCreateModal}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors"
          >
            Create New RFQ
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence>
            {filteredRfqs.map((rfq, index) => {
              const hasExtensions = rfq.extension_count > 0;

              return (
                <motion.div
                  key={rfq.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: index * 0.02 }}
                  onClick={() => onSelectRfq(rfq.id)}
                  className="p-4 sm:p-5 rounded-xl bg-white border border-gray-200/90 hover:border-gray-300 hover:-translate-y-0.5 hover:shadow-card-hover transition-all cursor-pointer group"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
                          {rfq.reference_id}
                        </span>

                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                          rfq.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : rfq.status === 'FORCE_CLOSED'
                            ? 'bg-red-50 text-red-800 border-red-300'
                            : rfq.status === 'CLOSED'
                            ? 'bg-gray-100 text-gray-700 border-gray-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {rfq.status.replace('_', ' ')}
                        </span>

                        {/* Extension Counter */}
                        {hasExtensions && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 font-mono">
                            <Zap className="w-3 h-3 text-amber-600 fill-amber-600" />
                            <span>+{rfq.extension_count * rfq.extension_duration_minutes}m ({rfq.extension_count}x extended)</span>
                          </span>
                        )}

                        <span className="text-[11px] text-gray-500 font-mono">
                          Rule: {rfq.extension_trigger_type} (X={rfq.trigger_window_minutes}m, Y={rfq.extension_duration_minutes}m)
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-gray-950 group-hover:text-blue-600 transition-colors">
                        {rfq.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span>Pickup: <strong className="text-gray-700">{new Date(rfq.pickup_service_date).toLocaleDateString()}</strong></span>
                        <span>•</span>
                        <span>Total Quotes: <strong className="text-gray-900 font-mono">{rfq.total_bids_count}</strong></span>
                      </div>
                    </div>

                    {/* Middle: Lowest Bid */}
                    <div className="px-3.5 py-2.5 rounded-lg bg-gray-50/80 border border-gray-200 flex items-center gap-3 self-start lg:self-auto">
                      <div className="w-7 h-7 rounded bg-white border border-gray-200 flex items-center justify-center text-emerald-600 shadow-2xs">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                          Current Lowest (L1)
                        </span>
                        {rfq.lowest_bid_amount !== null ? (
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-bold font-mono text-emerald-700">
                              ${rfq.lowest_bid_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-gray-500 font-medium">by {rfq.lowest_bid_carrier}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No quotes submitted</span>
                        )}
                      </div>
                    </div>

                    {/* Right: Countdown */}
                    <div className="flex items-center gap-3 justify-between lg:justify-end">
                      <div className="text-left lg:text-right">
                        <CountdownTimer
                          compact={true}
                          currentCloseTime={rfq.current_bid_close_time}
                          forcedCloseTime={rfq.forced_bid_close_time}
                          startTime={rfq.bid_start_time}
                          triggerWindowMinutes={rfq.trigger_window_minutes}
                          extensionDurationMinutes={rfq.extension_duration_minutes}
                          status={rfq.status}
                        />
                        <div className="text-[11px] text-gray-500 mt-1 flex items-center lg:justify-end gap-1 font-mono">
                          <ShieldAlert className="w-3 h-3 text-red-500" />
                          <span>Cap: {new Date(rfq.forced_bid_close_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="p-1.5 rounded-md text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all">
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
