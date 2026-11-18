import React, { useState } from 'react';
import { FastForward, Zap, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SimulationToolbar({ rfq, currentL1Price, onSimulateBid }) {
  const [carrier, setCarrier] = useState('Hapag-Lloyd (Simulated)');
  const [secondsBeforeClose, setSecondsBeforeClose] = useState(120); // 2 min
  const [isSimulating, setIsSimulating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function handleRunSimulation(type) {
    setIsSimulating(true);
    setFeedback(null);

    let price = 1000;
    if (type === 'underbid_l1') {
      price = currentL1Price ? Math.max(100, currentL1Price - 50) : 950;
    } else if (type === 'higher_bid') {
      price = currentL1Price ? currentL1Price + 150 : 1500;
    }

    const freight = Math.max(50, price - 200);
    const origin = 100;
    const dest = 100;

    try {
      const res = await onSimulateBid({
        carrier_name: carrier,
        freight_charges: freight,
        origin_charges: origin,
        destination_charges: dest,
        transit_time_days: 20,
        seconds_before_close: secondsBeforeClose,
        notes: `Simulated test [${type}] placed 2m before deadline`
      });

      setFeedback({
        type: 'success',
        message: `Simulation executed! Quote of $${res.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })} processed successfully.`
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Simulation failed'
      });
    } finally {
      setIsSimulating(false);
    }
  }

  return (
    <div className="rounded-2xl border border-indigo-900/60 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-sky-950/30 p-5 backdrop-blur-sm shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <FastForward className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Interactive British Auction Testing Console</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                Evaluator Tool
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Simulate bids placed 2 minutes before deadline to test auto-extension in real-time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <span>Target Window:</span>
          <strong className="text-sky-300">T - 2m</strong>
        </div>
      </div>

      {feedback && (
        <div className={`mb-3 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
          feedback.type === 'success'
            ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300'
            : 'bg-rose-950/40 border border-rose-800/50 text-rose-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={isSimulating}
          onClick={() => handleRunSimulation('underbid_l1')}
          className="p-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-left transition-all group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Simulate L1 Underbid (Last 2 min)</span>
            </span>
            <span className="text-[10px] uppercase font-mono text-indigo-400 font-semibold group-hover:underline">
              Trigger +{rfq.extension_duration_minutes}m &rarr;
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Submits a bid lower than current L1 inside trigger window. Should trigger time extension!
          </p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={isSimulating}
          onClick={() => handleRunSimulation('higher_bid')}
          className="p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/60 text-left transition-all group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span>Simulate Non-L1 Bid (Last 2 min)</span>
            </span>
            <span className="text-[10px] uppercase font-mono text-slate-400 group-hover:underline">
              Test rule &rarr;
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Submits a higher bid. Only extends if rule is BID_RECEIVED (not if L1_RANK_CHANGE).
          </p>
        </motion.button>
      </div>
    </div>
  );
}
