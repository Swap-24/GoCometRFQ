import React, { useState } from 'react';
import { X, Sparkles, Clock, ShieldAlert, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RFQCreateModal({ isOpen, onClose, onCreated }) {
  const [referenceId, setReferenceId] = useState(`RFQ-${Math.floor(1000 + Math.random() * 9000)}`);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Dates
  const [pickupDate, setPickupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 16);
  });

  const [bidStartTime, setBidStartTime] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 16);
  });

  const [bidCloseTime, setBidCloseTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 20); // 20 mins from now
    return d.toISOString().slice(0, 16);
  });

  const [forcedCloseTime, setForcedCloseTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 45); // 45 mins from now
    return d.toISOString().slice(0, 16);
  });

  // British Auction configurations
  const [isBritishAuction, setIsBritishAuction] = useState(true);
  const [triggerWindow, setTriggerWindow] = useState('10');
  const [extensionDuration, setExtensionDuration] = useState('5');
  const [triggerType, setTriggerType] = useState('L1_RANK_CHANGE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Apply Quick Demo Preset
  function applyPreset(type) {
    const now = new Date();
    const startStr = now.toISOString().slice(0, 16);

    if (type === 'demo') {
      const close = new Date(now.getTime() + 15 * 60 * 1000); // 15m
      const forced = new Date(now.getTime() + 30 * 60 * 1000); // 30m
      setTitle('Fast-Paced Demo: Singapore to Jebel Ali (2x 40ft)');
      setBidStartTime(startStr);
      setBidCloseTime(close.toISOString().slice(0, 16));
      setForcedCloseTime(forced.toISOString().slice(0, 16));
      setTriggerWindow('5');
      setExtensionDuration('3');
      setTriggerType('L1_RANK_CHANGE');
    } else if (type === 'standard') {
      const close = new Date(now.getTime() + 120 * 60 * 1000); // 2h
      const forced = new Date(now.getTime() + 240 * 60 * 1000); // 4h
      setTitle('Standard RFQ: Shanghai to Rotterdam (15x 40ft HC)');
      setBidStartTime(startStr);
      setBidCloseTime(close.toISOString().slice(0, 16));
      setForcedCloseTime(forced.toISOString().slice(0, 16));
      setTriggerWindow('10');
      setExtensionDuration('5');
      setTriggerType('ANY_RANK_CHANGE');
    }
  }

  // Live validation
  const startDate = new Date(bidStartTime);
  const closeDate = new Date(bidCloseTime);
  const forcedDate = new Date(forcedCloseTime);

  const isCloseValid = closeDate > startDate;
  const isForcedValid = forcedDate > closeDate;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!isCloseValid) {
      setError('Bid Close Time must be strictly later than Bid Start Time.');
      return;
    }
    if (!isForcedValid) {
      setError('Forced Bid Close Time must be strictly greater than Bid Close Time.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        reference_id: referenceId.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        pickup_service_date: new Date(pickupDate).toISOString(),
        bid_start_time: new Date(bidStartTime).toISOString(),
        initial_bid_close_time: new Date(bidCloseTime).toISOString(),
        forced_bid_close_time: new Date(forcedCloseTime).toISOString(),
        is_british_auction: isBritishAuction,
        trigger_window_minutes: parseInt(triggerWindow) || 10,
        extension_duration_minutes: parseInt(extensionDuration) || 5,
        extension_trigger_type: triggerType,
      };

      const result = await onCreated(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create RFQ');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-7 overflow-hidden z-10 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Create British Reverse Auction RFQ</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                New RFQ
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Configure parameters for dynamic time extensions and forced close caps
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Fill with Preset:</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => applyPreset('demo')}
              className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition-colors"
            >
              ⚡ Fast Demo (15m)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('standard')}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              📦 Standard (2 Hours)
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Reference ID & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reference ID
              </label>
              <input
                type="text"
                required
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                RFQ Title / Route
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Shanghai to Rotterdam 40ft HC"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Pickup Date & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pickup / Service Date
              </label>
              <input
                type="datetime-local"
                required
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Shipment Notes (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. High cube containers, cargo ready by port"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Auction Deadlines Section */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Auction Deadlines & Capping</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Bid Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={bidStartTime}
                  onChange={(e) => setBidStartTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
                  <span>Bid Close Time</span>
                  {!isCloseValid && <span className="text-[10px] text-rose-400 font-bold">Must be &gt; Start</span>}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={bidCloseTime}
                  onChange={(e) => setBidCloseTime(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border text-white text-xs font-mono focus:outline-none ${
                    isCloseValid ? 'border-slate-800 focus:border-sky-500' : 'border-rose-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
                  <span className="text-rose-300 font-semibold">Forced Close Time</span>
                  {!isForcedValid && <span className="text-[10px] text-rose-400 font-bold">Must be &gt; Close</span>}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={forcedCloseTime}
                  onChange={(e) => setForcedCloseTime(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border text-white text-xs font-mono focus:outline-none ${
                    isForcedValid ? 'border-rose-900/60 focus:border-rose-500 text-rose-200' : 'border-rose-500'
                  }`}
                />
              </div>
            </div>
            
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>
                Rule: Auction extensions will never exceed the <strong>Forced Bid Close Time</strong>.
              </span>
            </p>
          </div>

          {/* British Auction Config */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                British Reverse Auction Mechanics
              </h4>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isBritishAuction}
                  onChange={(e) => setIsBritishAuction(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Enable British Auction</span>
              </label>
            </div>

            {isBritishAuction && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Trigger Window (X Min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={triggerWindow}
                    onChange={(e) => setTriggerWindow(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500">Monitors last X mins</span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Extension Duration (Y Min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={extensionDuration}
                    onChange={(e) => setExtensionDuration(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500">Adds Y mins when triggered</span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Trigger Condition Rule
                  </label>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="L1_RANK_CHANGE">Lowest Bidder (L1) Change</option>
                    <option value="ANY_RANK_CHANGE">Any Supplier Rank Change</option>
                    <option value="BID_RECEIVED">Any Bid Received in Window</option>
                  </select>
                  <span className="text-[10px] text-slate-500">Event that causes extension</span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting || !isCloseValid || !isForcedValid}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-sky-500/25 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create British RFQ</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
