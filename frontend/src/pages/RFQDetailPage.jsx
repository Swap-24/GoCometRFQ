import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldAlert, Zap, RefreshCw, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

import CountdownTimer from '../components/CountdownTimer';
import SupplierRankTable from '../components/SupplierRankTable';
import QuoteSubmissionForm from '../components/QuoteSubmissionForm';
import ActivityLogTimeline from '../components/ActivityLogTimeline';
import { api, createRfqWebSocket } from '../services/api';

export default function RFQDetailPage({ rfqId, onBack }) {
  const [rfq, setRfq] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastExtensionAlert, setLastExtensionAlert] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

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

    // WebSocket connection
    const ws = createRfqWebSocket(
      rfqId,
      (event) => {
        if (event.type === 'NEW_BID') {
          if (event.extension_info?.extended) {
            setLastExtensionAlert(event.extension_info);
            setTimeout(() => setLastExtensionAlert(null), 8000);
          }

          if (event.l1_supplier && (!rfq?.lowest_bid_carrier || event.l1_supplier !== rfq?.lowest_bid_carrier)) {
            confetti({
              particleCount: 40,
              spread: 50,
              origin: { y: 0.6 }
            });
          }

          loadData();
        }
      },
      (err) => console.warn('WebSocket warning:', err)
    );

    return () => ws.close();
  }, [rfqId]);

  async function handleQuoteSubmit(quoteData) {
    const res = await api.submitQuote(rfqId, quoteData);
    setActionSuccess(`Quote of $${res.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })} submitted successfully by ${res.carrier_name}.`);
    setTimeout(() => setActionSuccess(null), 5000);
    await loadData();
    return res;
  }

  if (isLoading) {
    return (
      <div className="p-16 text-center rounded-xl bg-white border border-gray-200">
        <div className="w-6 h-6 mx-auto border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin mb-2" />
        <p className="text-xs text-gray-500 font-medium">Loading auction details...</p>
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="p-10 text-center rounded-xl bg-red-50 border border-red-200">
        <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-gray-900 mb-1">Error Loading Auction</h4>
        <p className="text-xs text-red-700 mb-3">{error || 'RFQ not found'}</p>
        <button
          onClick={onBack}
          className="px-3.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs hover:bg-gray-800 transition-colors"
        >
          Return to Auctions
        </button>
      </div>
    );
  }

  const currentL1Price = rfq.lowest_bid_amount;

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/90">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
                {rfq.reference_id}
              </span>
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

              {rfq.extension_count > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 font-mono">
                  <Zap className="w-3 h-3 text-amber-600 fill-amber-600" />
                  <span>Extended {rfq.extension_count}x (+{rfq.extension_count * rfq.extension_duration_minutes}m)</span>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-gray-950 mt-1">
              {rfq.title}
            </h1>
            {rfq.description && (
              <p className="text-xs text-gray-500 mt-0.5">{rfq.description}</p>
            )}
          </div>
        </div>

        <button
          onClick={loadData}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-600 hover:text-gray-900 text-xs font-medium transition-colors shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Success Banner */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2 shadow-2xs font-medium"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extension Alert Banner */}
      <AnimatePresence>
        {lastExtensionAlert && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between gap-3 shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-amber-600 shrink-0 fill-amber-600" />
              <div className="text-xs">
                <span className="font-bold">British Auction Auto-Extended: </span>
                <span>{lastExtensionAlert.reason}</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-300 shrink-0">
              +{rfq.extension_duration_minutes}m
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countdown Timer */}
      <CountdownTimer
        currentCloseTime={rfq.current_bid_close_time}
        forcedCloseTime={rfq.forced_bid_close_time}
        startTime={rfq.bid_start_time}
        triggerWindowMinutes={rfq.trigger_window_minutes}
        extensionDurationMinutes={rfq.extension_duration_minutes}
        status={rfq.status}
      />

      {/* Configuration Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-white border border-gray-200/90 shadow-subtle">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
            Trigger Window (X)
          </span>
          <span className="text-sm font-extrabold font-mono text-gray-950">
            Last {rfq.trigger_window_minutes} Minutes
          </span>
          <p className="text-[11px] text-gray-500 mt-0.5">Monitors activity before close</p>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-gray-200/90 shadow-subtle">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
            Extension Added (Y)
          </span>
          <span className="text-sm font-extrabold font-mono text-gray-950">
            +{rfq.extension_duration_minutes} Minutes
          </span>
          <p className="text-[11px] text-gray-500 mt-0.5">Added per qualifying trigger</p>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-gray-200/90 shadow-subtle">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
            Trigger Mode
          </span>
          <span className="text-xs font-bold text-gray-950 font-mono block truncate">
            {rfq.extension_trigger_type}
          </span>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {rfq.extension_trigger_type === 'L1_RANK_CHANGE' ? 'Extends only on new L1' : 'Extends on rank shifts'}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-gray-200/90 shadow-subtle">
          <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider block">
            Forced Close Cap
          </span>
          <span className="text-xs font-bold text-red-700 font-mono block">
            {new Date(rfq.forced_bid_close_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <p className="text-[11px] text-gray-500 mt-0.5">Strict stop; cannot extend beyond</p>
        </div>
      </div>

      {/* Main Grid: Left = Leaderboard & Logs, Right = Form & Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <SupplierRankTable quotes={rfq.quotes} />
          <ActivityLogTimeline logs={rfq.activity_logs} />
        </div>

        {/* Right Column (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <QuoteSubmissionForm
            rfq={rfq}
            currentL1Price={currentL1Price}
            onSubmitQuote={handleQuoteSubmit}
          />

          {/* Rules Card */}
          <div className="rounded-xl border border-gray-200/90 bg-white p-4 text-xs space-y-2.5 shadow-subtle">
            <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              <span>British Reverse Auction Principles</span>
            </h4>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span>
                  <strong>Reverse Bidding:</strong> Lowest total quote (Freight + Origin + Destination) takes <strong>Rank L1</strong> and leads the auction.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                <span>
                  <strong>Anti-Sniping Extension:</strong> If qualifying bidding occurs in the last <strong>{rfq.trigger_window_minutes} minutes</strong>, the close time automatically pushes back by <strong>{rfq.extension_duration_minutes} minutes</strong>.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
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
