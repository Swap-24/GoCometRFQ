import React, { useState } from 'react';
import { FastForward, Zap, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';

export default function SimulationToolbar({ rfq, currentL1Price, onSimulateBid }) {
  const [carrier, setCarrier] = useState('Hapag-Lloyd (Test)');
  const [secondsBeforeClose, setSecondsBeforeClose] = useState(120); // 2m
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
        message: `Simulated quote of $${res.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })} placed at T-2m.`
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
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <FastForward className="w-4 h-4 text-blue-600" />
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Evaluator Test Console (Simulation)
            </h4>
            <p className="text-[11px] text-gray-500">
              Test auto-extension behavior by placing bids inside the trigger window (T - 2m)
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 self-start sm:self-auto">
          Simulated Time: Close - 120s
        </span>
      </div>

      {feedback && (
        <div className={`mb-3 p-2 rounded text-xs flex items-center gap-1.5 ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={isSimulating}
          onClick={() => handleRunSimulation('underbid_l1')}
          className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-left transition-colors flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-semibold text-gray-900 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Simulate L1 Underbid (Last 2m)</span>
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Places new L1 bid inside window. Tests +{rfq.extension_duration_minutes}m extension.
            </p>
          </div>
          <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform ml-2">
            &rarr;
          </span>
        </button>

        <button
          type="button"
          disabled={isSimulating}
          onClick={() => handleRunSimulation('higher_bid')}
          className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-left transition-colors flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-semibold text-gray-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-gray-500" />
              <span>Simulate Non-L1 Bid (Last 2m)</span>
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Places higher quote. Extends if rule is BID_RECEIVED (not if L1_RANK_CHANGE).
            </p>
          </div>
          <span className="text-xs font-bold text-gray-600 group-hover:translate-x-0.5 transition-transform ml-2">
            &rarr;
          </span>
        </button>
      </div>
    </div>
  );
}
