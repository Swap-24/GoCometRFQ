import React, { useState } from 'react';
import { Send, Calculator, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';

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
  const [successMessage, setSuccessMessage] = useState(null);

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

      setSuccessMessage(`Quote of $${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} submitted successfully for ${carrierName.trim()}!`);
      setNotes('');
      setTimeout(() => setSuccessMessage(null), 4000);
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-blue-600" />
            <span>Submit Supplier Quote</span>
          </h3>
          <p className="text-xs text-gray-500">
            Enter line-item charges for this RFQ
          </p>
        </div>

        {currentL1Price && (
          <button
            type="button"
            onClick={applyUnderbid}
            className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors flex items-center gap-1"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Underbid L1</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Carrier name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Carrier / Supplier Company
          </label>
          <input
            type="text"
            required
            value={carrierName}
            onChange={(e) => setCarrierName(e.target.value)}
            placeholder="e.g. Maersk Line, MSC, CMA CGM"
            className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
          />
          {/* Quick Carrier Pills */}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {POPULAR_CARRIERS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCarrierName(c)}
                className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                  carrierName === c
                    ? 'bg-blue-100 text-blue-800 border border-blue-300 font-semibold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Charge breakdown */}
        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
              Freight ($)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={freightCharges}
              onChange={(e) => setFreightCharges(e.target.value)}
              placeholder="1200"
              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 text-xs font-mono focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
              Origin ($)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={originCharges}
              onChange={(e) => setOriginCharges(e.target.value)}
              placeholder="150"
              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 text-xs font-mono focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
              Dest ($)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={destinationCharges}
              onChange={(e) => setDestinationCharges(e.target.value)}
              placeholder="150"
              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 text-xs font-mono focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Transit & Validity */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
              Transit Time (Days)
            </label>
            <input
              type="number"
              min="1"
              required
              value={transitDays}
              onChange={(e) => setTransitDays(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-900 text-xs font-mono focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
              Validity (Days)
            </label>
            <input
              type="number"
              min="1"
              required
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-900 text-xs font-mono focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Total landed price preview & Rank projected badge */}
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
              Calculated Total Quote
            </span>
            <span className="text-lg font-mono font-bold text-gray-900">
              ${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            {totalPrice > 0 ? (
              willBeL1 ? (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
                  <Zap className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Projected L1 Leader</span>
                </div>
              ) : (
                <div className="text-xs text-gray-600 bg-gray-200 px-2 py-0.5 rounded font-medium">
                  Higher than L1 (+${(totalPrice - currentL1Price).toFixed(2)})
                </div>
              )
            ) : (
              <span className="text-xs text-gray-400">Enter charges</span>
            )}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting || !isAuctionActive}
          className={`w-full py-2.5 rounded-lg font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-sm ${
            !isAuctionActive
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : willBeL1
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>
                {!isAuctionActive ? 'Auction Closed' : 'Submit Quotation'}
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
