import React from 'react';
import { History, Zap, CheckCircle2, Flag, AlertOctagon, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ActivityLogTimeline({ logs = [] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-500 text-xs">
        No auction activity recorded yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 backdrop-blur-sm shadow-xl">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <span>Auction Audit & Extension Log</span>
          </h3>
          <p className="text-xs text-slate-400">
            Immutable timeline of quote submissions and dynamic time extensions
          </p>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          {logs.length} Events
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-[2px] before:bg-slate-800">
        <AnimatePresence>
          {logs.map((log, idx) => {
            const isExtension = log.event_type === 'TIME_EXTENSION';
            const isBid = log.event_type === 'BID_SUBMITTED';
            const isCreated = log.event_type === 'AUCTION_CREATED';
            const isClosed = log.event_type === 'AUCTION_CLOSED' || log.event_type === 'AUCTION_FORCE_CLOSED';

            return (
              <motion.div
                key={log.id || idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.02 }}
                className="relative group"
              >
                {/* Node icon */}
                <div className={`absolute -left-[30px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center border transition-transform group-hover:scale-110 ${
                  isExtension
                    ? 'bg-amber-950 border-amber-500 text-amber-400 shadow-md shadow-amber-500/20'
                    : isBid
                    ? 'bg-sky-950 border-sky-500 text-sky-400'
                    : isCreated
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                    : 'bg-rose-950 border-rose-500 text-rose-400'
                }`}>
                  {isExtension ? (
                    <Zap className="w-3.5 h-3.5 fill-amber-400" />
                  ) : isBid ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isCreated ? (
                    <Flag className="w-3.5 h-3.5" />
                  ) : (
                    <AlertOctagon className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Content Box */}
                <div className={`p-3.5 rounded-xl border text-xs transition-all ${
                  isExtension
                    ? 'bg-gradient-to-r from-amber-950/30 to-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`font-bold tracking-tight text-xs flex items-center gap-1.5 ${
                      isExtension
                        ? 'text-amber-300'
                        : isBid
                        ? 'text-sky-300'
                        : isCreated
                        ? 'text-emerald-300'
                        : 'text-rose-300'
                    }`}>
                      <span>{log.message}</span>
                    </span>

                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  {/* Extension details if applicable */}
                  {isExtension && log.previous_close_time && log.new_close_time && (
                    <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 font-mono text-[11px] text-amber-200">
                      <span>Old Close: {new Date(log.previous_close_time).toLocaleTimeString()}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                      <strong className="text-amber-300 font-bold">New Close: {new Date(log.new_close_time).toLocaleTimeString()}</strong>
                    </div>
                  )}

                  {/* Reason */}
                  {log.reason && (
                    <div className="mt-2 text-slate-300 font-sans text-xs bg-slate-900/90 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 font-semibold mr-1.5">Reason:</span>
                      <span>{log.reason}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
