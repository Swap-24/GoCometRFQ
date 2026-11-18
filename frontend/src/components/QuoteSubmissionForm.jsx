import React, { useState } from 'react';
import { Send, Calculator, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const POPULAR_CARRIERS = ['Maersk Line', 'MSC', 'CMA CGM', 'Hapag-Lloyd', 'ONE', 'Evergreen'];

export default function QuoteSubmissionForm({ rfq, currentL1Price, onSubmitQuote }) {
  const [carrierName, setCarrierName] = useState('');
  const [freightCharges, setFreightCharges] = useState('');
  const [originCharges, setOriginCharges] = useState('');
  const [destinationCharges, setDestinationCharges] = useState('');
  const [transitDays, setTransitDays] = useState('24');
  const [validityDays, setValidityDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Compute total
  const f = parseFloat(freightCharges) || 0;
  const o = parseFloat(originCharges) || 0;
  const d = parseFloat(destinationCharges) || 0;
  const totalPrice = Math.round((f + o + d) * 100) / 100;

  // Rank projection
  const willBeL1 = currentL1Price === null || totalPrice < currentL1Price;
  const isAuctionActive = rfq?.status === 'ACTIVE';

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!carrierName.trim()) {
      setError('Please provide a Carrier / Supplier name.');
      return;
    }
    if (totalPrice <= 0) {
      setError('Total quote must be greater than $0.');
      return;
    }

    const validity = new Date();
    validity.setDate(validity.getDate() + (parseInt(validityDays) || 30));

    setIsSubmitting(true);
    try {
      await onSubmitQuote({
        carrier_name: carrierName.trim(),
        freight_charges: f,
        origin_charges: o,
        destination_charges: d,
        transit_time_days: parseInt(transitDays) || 24,
        validity_date: validity.toISOString(),
        notes: notes.trim() || undefined,
      });

      // Clear or partially reset form for rapid continuous bidding
      setNotes('');
    } catch (err) {
      setError(err.message || 'Failed to submit quote');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Quick underbid helper
  function applyUnderbid() {
    if (currentL1Price) {
      const target = Math.max(100, Math.floor(currentL1Price - 50));
      const newF = Math.max(50, target - 200);
      setFreightCharges(String(newF));
      setOriginCharges('100');
      setDestinationCharges('100');
    } else {
      setFreightCharges('1200');
      setOriginCharges('150');
      setDestinationCharges('150');
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 backdrop-blur-sm shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-sky-400" />
            <span>Supplier Quote Submission</span>
          </h3>
          <p className="text-xs text-slate-400">
            Submit a competitive quotation to underbid competitors
          </p>
        </div>

        {currentL1Price && (
          <button
            type="button"
            onClick={applyUnderbid}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-1"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Auto Underbid L1</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Carrier name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Carrier / Supplier Company
          </label>
          <input
            type="text"
            required
            value={carrierName}
            onChange={(e) => setCarrierName(e.target.value)}
            placeholder="e.g. Maersk Line, MSC, CMA CGM"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-sky-500 transition-colors font-medium"
          />
          {/* Quick Carrier Pills */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {POPULAR_CARRIERS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCarrierName(c)}
                className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${
                  carrierName === c
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Charge breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Freight Rate ($)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={freightCharges}
              onChange={(e) => setFreightCharges(e.target.value)}
              placeholder="e.g. 1200"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Origin Charges ($)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={originCharges}
              onChange={(e) => setOriginCharges(e.target.value)}
              placeholder="e.g. 150"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Dest. Charges ($)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={destinationCharges}
              onChange={(e) => setDestinationCharges(e.target.value)}
              placeholder="e.g. 150"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Transit & Validity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Transit Time (Days)
            </label>
            <input
              type="number"
              min="1"
              required
              value={transitDays}
              onChange={(e) => setTransitDays(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Quote Validity (Days)
            </label>
            <input
              type="number"
              min="1"
              required
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Total landed price preview & Rank projected badge */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">
              Total Landed Quote
            </span>
            <span className="text-xl font-mono font-black text-white">
              ${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            {totalPrice > 0 ? (
              willBeL1 ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-sm shadow-emerald-500/10">
                  <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  <span>Projected Rank: L1</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium">
                  <span>Non-L1 Bid (+${(totalPrice - currentL1Price).toFixed(2)})</span>
                </div>
              )
            ) : (
              <span className="text-xs text-slate-500">Enter charges</span>
            )}
          </div>
        </div>

        {/* Submit button */}
        <motion.button
          whileHover={{ scale: isAuctionActive ? 1.02 : 1 }}
          whileTap={{ scale: isAuctionActive ? 0.98 : 1 }}
          type="submit"
          disabled={isSubmitting || !isAuctionActive}
          className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
            !isAuctionActive
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              : willBeL1
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/20'
              : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-500/20'
          }`}
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>
                {!isAuctionActive ? 'Auction Closed for Bidding' : 'Submit Official Quote'}
              </span>
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
}
