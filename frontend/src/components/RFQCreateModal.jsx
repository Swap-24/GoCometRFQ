import React, { useState } from 'react';
import { X, Clock, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

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
    d.setHours(d.getHours() + 2); // 2 hours from now
    return d.toISOString().slice(0, 16);
  });

  const [forcedCloseTime, setForcedCloseTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 4); // 4 hours from now
    return d.toISOString().slice(0, 16);
  });

  // British Auction configurations
  const [isBritishAuction, setIsBritishAuction] = useState(true);
  const [triggerWindow, setTriggerWindow] = useState('10');
  const [extensionDuration, setExtensionDuration] = useState('5');
  const [triggerType, setTriggerType] = useState('L1_RANK_CHANGE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

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

      await onCreated(payload);
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
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl rounded-xl bg-white border border-gray-200 shadow-xl p-6 overflow-hidden z-10 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gray-200">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Create British Reverse Auction RFQ
            </h3>
            <p className="text-xs text-gray-500">
              Set bidding schedule and anti-sniping extension parameters
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Reference & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reference ID
              </label>
              <input
                type="text"
                required
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md bg-white border border-gray-300 text-gray-900 font-mono text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                RFQ Title / Route
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Shanghai to Rotterdam 40ft HC"
                className="w-full px-3 py-1.5 rounded-md bg-white border border-gray-300 text-gray-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Pickup & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Pickup Date
              </label>
              <input
                type="datetime-local"
                required
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md bg-white border border-gray-300 text-gray-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cargo specs, port terminal details..."
                className="w-full px-3 py-1.5 rounded-md bg-white border border-gray-300 text-gray-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Timing Section */}
          <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-2.5">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Auction Deadlines</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Bid Start Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={bidStartTime}
                  onChange={(e) => setBidStartTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-white border border-gray-300 text-gray-900 text-xs font-mono focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1 flex items-center justify-between">
                  <span>Bid Close Time</span>
                  {!isCloseValid && <span className="text-[10px] text-red-600 font-bold">Must be &gt; Start</span>}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={bidCloseTime}
                  onChange={(e) => setBidCloseTime(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded bg-white text-gray-900 text-xs font-mono focus:outline-none ${
                    isCloseValid ? 'border border-gray-300 focus:border-blue-600' : 'border border-red-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-red-700 font-semibold mb-1 flex items-center justify-between">
                  <span>Forced Close Ceiling</span>
                  {!isForcedValid && <span className="text-[10px] text-red-600 font-bold">Must be &gt; Close</span>}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={forcedCloseTime}
                  onChange={(e) => setForcedCloseTime(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded bg-white text-gray-900 text-xs font-mono focus:outline-none ${
                    isForcedValid ? 'border border-red-300 focus:border-red-500' : 'border border-red-500'
                  }`}
                />
              </div>
            </div>

            <p className="text-[11px] text-gray-500 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>
                Rule: Auction extensions will never exceed the <strong>Forced Bid Close Time</strong>.
              </span>
            </p>
          </div>

          {/* British Config */}
          <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Extension Configuration
              </h4>
              <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBritishAuction}
                  onChange={(e) => setIsBritishAuction(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-0"
                />
                <span>Enable British Auction</span>
              </label>
            </div>

            {isBritishAuction && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Trigger Window (X Min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={triggerWindow}
                    onChange={(e) => setTriggerWindow(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-gray-300 text-gray-900 text-xs font-mono focus:outline-none focus:border-blue-600"
                  />
                  <span className="text-[10px] text-gray-500">Monitors last X mins</span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Extension Duration (Y Min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={extensionDuration}
                    onChange={(e) => setExtensionDuration(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-gray-300 text-gray-900 text-xs font-mono focus:outline-none focus:border-blue-600"
                  />
                  <span className="text-[10px] text-gray-500">Adds Y mins when triggered</span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Extension Trigger Rule
                  </label>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-gray-300 text-gray-900 text-xs focus:outline-none focus:border-blue-600"
                  >
                    <option value="L1_RANK_CHANGE">Lowest Bidder (L1) Change</option>
                    <option value="ANY_RANK_CHANGE">Any Supplier Rank Change</option>
                    <option value="BID_RECEIVED">Any Bid Received in Window</option>
                  </select>
                  <span className="text-[10px] text-gray-500">Trigger condition</span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isCloseValid || !isForcedValid}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Create RFQ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
