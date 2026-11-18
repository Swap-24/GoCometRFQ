import React from 'react';
import { Award, TrendingDown, Clock, ShieldCheck, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SupplierRankTable({ quotes = [] }) {
  if (!quotes || quotes.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
          <DollarSign className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-white mb-1">No Quotes Submitted Yet</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Be the first carrier to submit a quotation and take the leading L1 rank!
        </p>
      </div>
    );
  }

  const l1Price = quotes[0]?.total_price || 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm overflow-hidden shadow-xl">
      <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span>Supplier Leaderboard & Quotes</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {quotes.length} Quotes
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Ranked by lowest total landed quote (Reverse Auction L1 Model)
          </p>
        </div>
        
        {quotes.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Current Best (L1):</span>
            <span className="font-mono font-extrabold text-emerald-400 text-sm">
              ${l1Price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Carrier / Supplier</th>
              <th className="py-3 px-4 text-right">Freight Fee</th>
              <th className="py-3 px-4 text-right">Origin Fee</th>
              <th className="py-3 px-4 text-right">Dest Fee</th>
              <th className="py-3 px-4 text-right">Total Quote</th>
              <th className="py-3 px-4 text-center">Delta vs L1</th>
              <th className="py-3 px-4 text-center">Transit</th>
              <th className="py-3 px-4 text-right">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-xs">
            <AnimatePresence>
              {quotes.map((q, idx) => {
                const rank = q.current_rank || idx + 1;
                const isL1 = rank === 1;
                const delta = q.total_price - l1Price;

                return (
                  <motion.tr
                    key={q.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    className={`transition-colors ${
                      isL1 
                        ? 'bg-emerald-950/20 hover:bg-emerald-950/30' 
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="py-3.5 px-4">
                      {isL1 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-xs border border-emerald-500/40 shadow-sm shadow-emerald-500/10">
                          <Award className="w-3.5 h-3.5 text-emerald-400" />
                          <span>L1 LEADER</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 text-slate-300 font-bold font-mono">
                          L{rank}
                        </span>
                      )}
                    </td>

                    {/* Carrier Name */}
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span>{q.carrier_name}</span>
                        {isL1 && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            Lowest Bid
                          </span>
                        )}
                      </div>
                      {q.notes && (
                        <span className="text-[11px] text-slate-500 font-normal block truncate max-w-xs">
                          {q.notes}
                        </span>
                      )}
                    </td>

                    {/* Freight */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      ${q.freight_charges.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Origin */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                      ${q.origin_charges.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Destination */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                      ${q.destination_charges.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Total Price */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      <span className={`text-sm font-extrabold ${
                        isL1 ? 'text-emerald-400 font-black' : 'text-white'
                      }`}>
                        ${q.total_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Delta */}
                    <td className="py-3.5 px-4 text-center font-mono text-xs">
                      {isL1 ? (
                        <span className="text-emerald-400 font-bold">Lowest</span>
                      ) : (
                        <span className="text-rose-400">
                          +${delta.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>

                    {/* Transit Days */}
                    <td className="py-3.5 px-4 text-center text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{q.transit_time_days}d</span>
                      </span>
                    </td>

                    {/* Submitted Timestamp */}
                    <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                      {new Date(q.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
