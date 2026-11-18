import React, { useState, useEffect } from 'react';
import { ArrowLeft, Ship, ShieldAlert, Award, Clock, Zap, RefreshCw, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

import CountdownTimer from '../components/CountdownTimer';
import SupplierRankTable from '../components/SupplierRankTable';
import QuoteSubmissionForm from '../components/QuoteSubmissionForm';
import ActivityLogTimeline from '../components/ActivityLogTimeline';
import SimulationToolbar from '../components/SimulationToolbar';
import { api, createRfqWebSocket } from '../services/api';

export default function RFQDetailPage({ rfqId, onBack }) {
  const [rfq, setRfq] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastExtensionAlert, setLastExtensionAlert] = useState(null);

  // Load RFQ Data
  async function loadData() {
    try {
      const data = await api.getRfq(rfqId);
      setRfq(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load RFQ details');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    // Setup WebSocket connection
    const ws = createRfqWebSocket(
      rfqId,
      (event) => {
        if (event.type === 'NEW_BID') {
          // If auction extended, show alert
          if (event.extension_info?.extended) {
            setLastExtensionAlert(event.extension_info);
            setTimeout(() => setLastExtensionAlert(null), 8000);
          }

          // If L1 leader changed, fire confetti celebration!
          if (event.l1_supplier && (!rfq?.lowest_bid_carrier || event.l1_supplier !== rfq?.lowest_bid_carrier)) {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.7 }
            });
          }

          // Refresh full state
          loadData();
        }
      },
      (err) => console.warn('WebSocket warning:', err)
    );

    return () => ws.close();
  }, [rfqId]);

  // Handle quote submission
  async function handleQuoteSubmit(quoteData) {
    const res = await api.submitQuote(rfqId, quoteData);
    await loadData();
    return res;
  }

  // Handle simulated bid
  async function handleSimulateBid(simData) {
    const res = await api.simulateBid(rfqId, simData);
    await loadData();
    return res;
  }

  if (isLoading) {
    return (
      <div className="p-20 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
        <div className="w-8 h-8 mx-auto border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium">Loading Auction Room...</p>
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="p-12 text-center rounded-2xl bg-rose-950/20 border border-rose-800/40">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h4 className="text-base font-bold text-white mb-2">Error Loading Auction</h4>
        <p className="text-xs text-rose-300 mb-4">{error || 'RFQ not found'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs hover:bg-slate-700"
        >
          Return to Auctions
        </button>
      </div>
    );
  }

  const currentL1Price = rfq.lowest_bid_amount;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-800 text-sky-400 border border-slate-700">
                {rfq.reference_id}
              </span>
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

              {rfq.extension_count > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>Extended {rfq.extension_count}x (+{rfq.extension_count * rfq.extension_duration_minutes}m)</span>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              {rfq.title}
            </h1>
            {rfq.description && (
              <p className="text-xs text-slate-400 mt-0.5">{rfq.description}</p>
            )}
          </div>
        </div>

        <button
          onClick={loadData}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-medium transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Live Extension Toast Banner */}
      <AnimatePresence>
        {lastExtensionAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 border border-amber-500/40 text-amber-300 flex items-center justify-between gap-4 shadow-2xl shadow-amber-500/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Zap className="w-5 h-5 fill-amber-400 animate-bounce" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  ⚡ British Auction Auto-Extended!
                </h4>
                <p className="text-xs text-slate-200 mt-0.5">
                  {lastExtensionAlert.reason}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30">
              +{rfq.extension_duration_minutes}m Added
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Countdown Timer */}
      <CountdownTimer
        currentCloseTime={rfq.current_bid_close_time}
        forcedCloseTime={rfq.forced_bid_close_time}
        startTime={rfq.bid_start_time}
        triggerWindowMinutes={rfq.trigger_window_minutes}
        extensionDurationMinutes={rfq.extension_duration_minutes}
        status={rfq.status}
      />

      {/* British Auction Config Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Trigger Window (X)
          </span>
          <span className="text-base font-extrabold font-mono text-white">
            Last {rfq.trigger_window_minutes} Mins
          </span>
          <p className="text-[10px] text-slate-500">Monitors activity before close</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Extension (Y)
          </span>
          <span className="text-base font-extrabold font-mono text-white">
            +{rfq.extension_duration_minutes} Mins
          </span>
          <p className="text-[10px] text-slate-500">Added per qualifying trigger</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Extension Rule
          </span>
          <span className="text-xs font-extrabold text-indigo-400 font-mono block truncate">
            {rfq.extension_trigger_type}
          </span>
          <p className="text-[10px] text-slate-500">
            {rfq.extension_trigger_type === 'L1_RANK_CHANGE' ? 'Extends only on new L1' : 'Extends on rank shifts'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider block">
            Forced Close Cap
          </span>
          <span className="text-xs font-extrabold text-rose-300 font-mono block">
            {new Date(rfq.forced_bid_close_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <p className="text-[10px] text-slate-500">Hard stop; no extensions beyond</p>
        </div>
      </div>

      {/* Evaluator Simulation Console Toolbar */}
      <SimulationToolbar
        rfq={rfq}
        currentL1Price={currentL1Price}
        onSimulateBid={handleSimulateBid}
      />

      {/* Main Grid: Left = Leaderboard & Logs, Right = Quote Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <SupplierRankTable quotes={rfq.quotes} />
          <ActivityLogTimeline logs={rfq.activity_logs} />
        </div>

        {/* Right Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <QuoteSubmissionForm
            rfq={rfq}
            currentL1Price={currentL1Price}
            onSubmitQuote={handleQuoteSubmit}
          />

          {/* Reverse Auction Rules Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-xs space-y-3">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Info className="w-4 h-4 text-sky-400" />
              <span>How this British Auction Works</span>
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Reverse Bidding:</strong> Lowest total quote (Freight + Origin + Destination) takes <strong>Rank L1</strong> and leads the auction.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Anti-Sniping Extension:</strong> If qualifying bidding occurs in the last <strong>{rfq.trigger_window_minutes} minutes</strong>, the close time automatically pushes back by <strong>{rfq.extension_duration_minutes} minutes</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Forced Close Guarantee:</strong> Extensions are strictly capped at <strong>{new Date(rfq.forced_bid_close_time).toLocaleTimeString()}</strong>. Bidding terminates then without exception.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
