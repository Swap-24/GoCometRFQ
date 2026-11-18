import React from 'react';
import { History, Zap, CheckCircle2, Flag, AlertOctagon, ArrowRight } from 'lucide-react';

export default function ActivityLogTimeline({ logs = [] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 text-xs">
        No auction activity recorded yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <History className="w-4 h-4 text-gray-600" />
            <span>Auction Activity & Extension Log</span>
          </h3>
          <p className="text-xs text-gray-500">
            Audit trail of quotations and dynamic time extensions
          </p>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
          {logs.length} Events
        </span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-gray-200">
        {logs.map((log, idx) => {
          const isExtension = log.event_type === 'TIME_EXTENSION';
          const isBid = log.event_type === 'BID_SUBMITTED';
          const isCreated = log.event_type === 'AUCTION_CREATED';

          return (
            <div key={log.id || idx} className="relative group">
              {/* Dot Icon */}
              <div className={`absolute -left-[27px] top-1 w-4 h-4 rounded-full flex items-center justify-center border ${
                isExtension
                  ? 'bg-amber-100 border-amber-400 text-amber-700'
                  : isBid
                  ? 'bg-blue-100 border-blue-400 text-blue-700'
                  : isCreated
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                  : 'bg-gray-100 border-gray-400 text-gray-600'
              }`}>
                {isExtension ? (
                  <Zap className="w-2.5 h-2.5 fill-amber-600 text-amber-600" />
                ) : isBid ? (
                  <CheckCircle2 className="w-2.5 h-2.5" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                )}
              </div>

              {/* Content Box */}
              <div className={`p-3 rounded-lg border text-xs ${
                isExtension
                  ? 'bg-amber-50/60 border-amber-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`font-semibold text-xs ${
                    isExtension
                      ? 'text-amber-900 font-bold'
                      : isBid
                      ? 'text-gray-900 font-semibold'
                      : 'text-gray-700 font-medium'
                  }`}>
                    {log.message}
                  </span>

                  <span className="text-[11px] text-gray-400 font-mono shrink-0">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                {/* Extension time shift if present */}
                {isExtension && log.previous_close_time && log.new_close_time && (
                  <div className="mt-1.5 flex items-center gap-1.5 p-1.5 rounded bg-white border border-amber-200 font-mono text-[11px] text-amber-900">
                    <span>Previous: {new Date(log.previous_close_time).toLocaleTimeString()}</span>
                    <ArrowRight className="w-3 h-3 text-amber-600" />
                    <strong className="font-bold text-amber-800">New Deadline: {new Date(log.new_close_time).toLocaleTimeString()}</strong>
                  </div>
                )}

                {/* Reason */}
                {log.reason && (
                  <div className="mt-1.5 text-gray-600 text-[11px] bg-gray-50/70 p-1.5 rounded border border-gray-100">
                    <span className="font-semibold text-gray-700 mr-1">Reason:</span>
                    <span>{log.reason}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
