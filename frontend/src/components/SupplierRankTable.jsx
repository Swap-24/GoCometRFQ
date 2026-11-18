import React from 'react';
import { Award, Clock, DollarSign } from 'lucide-react';

export default function SupplierRankTable({ quotes = [] }) {
  if (!quotes || quotes.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
        <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-2.5">
          <DollarSign className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">No Quotations Yet</h4>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Submit the first quotation below to establish the baseline L1 rate.
        </p>
      </div>
    );
  }

  const l1Price = quotes[0]?.total_price || 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="p-4 sm:px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-white">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span>Supplier Quotations & Rankings</span>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
              {quotes.length} {quotes.length === 1 ? 'Quote' : 'Quotes'}
            </span>
          </h3>
          <p className="text-xs text-gray-500">
            Ranked by lowest total landed quote (Reverse Auction model)
          </p>
        </div>
        
        {quotes.length > 0 && (
          <div className="text-right">
            <span className="text-[11px] text-gray-500 block uppercase font-medium">Leading L1 Quote</span>
            <span className="font-mono font-bold text-emerald-700 text-sm">
              ${l1Price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              <th className="py-2.5 px-4">Rank</th>
              <th className="py-2.5 px-4">Carrier / Supplier</th>
              <th className="py-2.5 px-4 text-right">Freight Rate</th>
              <th className="py-2.5 px-4 text-right">Origin Fee</th>
              <th className="py-2.5 px-4 text-right">Dest Fee</th>
              <th className="py-2.5 px-4 text-right">Total Quote</th>
              <th className="py-2.5 px-4 text-center">Delta vs L1</th>
              <th className="py-2.5 px-4 text-center">Transit</th>
              <th className="py-2.5 px-4 text-right">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {quotes.map((q, idx) => {
              const rank = q.current_rank || idx + 1;
              const isL1 = rank === 1;
              const delta = q.total_price - l1Price;

              return (
                <tr
                  key={q.id}
                  className={`transition-colors ${
                    isL1 
                      ? 'bg-emerald-50/40 hover:bg-emerald-50/70' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Rank Badge */}
                  <td className="py-3 px-4">
                    {isL1 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-xs bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <Award className="w-3 h-3 text-emerald-700" />
                        <span>L1 (Best)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-100 text-gray-700 font-bold font-mono text-xs">
                        L{rank}
                      </span>
                    )}
                  </td>

                  {/* Carrier Name */}
                  <td className="py-3 px-4 font-semibold text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{q.carrier_name}</span>
                      {isL1 && (
                        <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Lowest
                        </span>
                      )}
                    </div>
                    {q.notes && (
                      <span className="text-[11px] text-gray-500 font-normal block truncate max-w-xs mt-0.5">
                        {q.notes}
                      </span>
                    )}
                  </td>

                  {/* Freight */}
                  <td className="py-3 px-4 text-right font-mono text-gray-700">
                    ${q.freight_charges.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>

                  {/* Origin */}
                  <td className="py-3 px-4 text-right font-mono text-gray-500">
                    ${q.origin_charges.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>

                  {/* Destination */}
                  <td className="py-3 px-4 text-right font-mono text-gray-500">
                    ${q.destination_charges.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>

                  {/* Total Price */}
                  <td className="py-3 px-4 text-right font-mono">
                    <span className={`text-sm font-bold ${
                      isL1 ? 'text-emerald-700 font-black' : 'text-gray-900'
                    }`}>
                      ${q.total_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* Delta */}
                  <td className="py-3 px-4 text-center font-mono text-xs">
                    {isL1 ? (
                      <span className="text-emerald-700 font-semibold">—</span>
                    ) : (
                      <span className="text-red-600 font-medium">
                        +${delta.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>

                  {/* Transit Days */}
                  <td className="py-3 px-4 text-center text-gray-700">
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{q.transit_time_days}d</span>
                    </span>
                  </td>

                  {/* Submitted Timestamp */}
                  <td className="py-3 px-4 text-right text-gray-500 font-mono text-[11px]">
                    {new Date(q.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
