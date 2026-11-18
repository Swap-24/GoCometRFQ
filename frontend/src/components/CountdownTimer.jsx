import React, { useState, useEffect } from 'react';
import { Clock, Zap, ShieldAlert, AlertCircle, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CountdownTimer({ 
  currentCloseTime, 
  forcedCloseTime, 
  startTime,
  triggerWindowMinutes = 10,
  extensionDurationMinutes = 5,
  status = 'ACTIVE',
  compact = false 
}) {
  const [timeLeft, setTimeLeft] = useState({ totalSeconds: 0, hours: 0, minutes: 0, seconds: 0 });
  const [startsIn, setStartsIn] = useState({ totalSeconds: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isInTriggerWindow, setIsInTriggerWindow] = useState(false);
  const [isPastForcedClose, setIsPastForcedClose] = useState(false);

  useEffect(() => {
    function calculate() {
      const now = new Date().getTime();
      const close = new Date(currentCloseTime).getTime();
      const forced = new Date(forcedCloseTime).getTime();
      const start = new Date(startTime).getTime();

      const diff = close - now;
      const startDiff = start - now;
      const forcedDiff = forced - now;

      // Handle upcoming
      if (startDiff > 0) {
        const totalStartSec = Math.floor(startDiff / 1000);
        setStartsIn({
          totalSeconds: totalStartSec,
          hours: Math.floor(totalStartSec / 3600),
          minutes: Math.floor((totalStartSec % 3600) / 60),
          seconds: totalStartSec % 60,
        });
      } else {
        setStartsIn({ totalSeconds: 0, hours: 0, minutes: 0, seconds: 0 });
      }

      if (forcedDiff <= 0) {
        setIsPastForcedClose(true);
      } else {
        setIsPastForcedClose(false);
      }

      if (diff <= 0) {
        setTimeLeft({ totalSeconds: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsInTriggerWindow(false);
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      setTimeLeft({ totalSeconds: totalSec, hours, minutes, seconds });

      const triggerSec = triggerWindowMinutes * 60;
      setIsInTriggerWindow(totalSec <= triggerSec && status === 'ACTIVE');
    }

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [currentCloseTime, forcedCloseTime, startTime, triggerWindowMinutes, status]);

  const pad = (n) => String(n).padStart(2, '0');

  // Compact badge for listing cards
  if (compact) {
    if (status === 'UPCOMING' && startsIn.totalSeconds > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 text-amber-800 text-xs font-mono font-medium border border-amber-200">
          <PlayCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Opens in {pad(startsIn.hours)}:{pad(startsIn.minutes)}:{pad(startsIn.seconds)}</span>
        </span>
      );
    }
    if (status === 'CLOSED' || status === 'FORCE_CLOSED' || timeLeft.totalSeconds <= 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-100 text-gray-600 text-xs font-mono font-medium border border-gray-200">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>Closed</span>
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
        isInTriggerWindow 
          ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-2 ring-amber-200/50'
          : 'bg-gray-100 text-gray-900 border border-gray-200'
      }`}>
        {isInTriggerWindow ? (
          <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600 animate-pulse" />
        ) : (
          <Clock className="w-3.5 h-3.5 text-gray-500" />
        )}
        <span>{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}</span>
      </span>
    );
  }

  // Full Auction Detail Countdown Display
  const isAuctionClosed = status === 'CLOSED' || status === 'FORCE_CLOSED' || (status === 'ACTIVE' && timeLeft.totalSeconds <= 0);

  return (
    <div className={`rounded-xl border p-5 transition-all shadow-subtle ${
      status === 'FORCE_CLOSED' || isPastForcedClose
        ? 'bg-red-50/60 border-red-200'
        : isAuctionClosed
        ? 'bg-gray-50/80 border-gray-200'
        : isInTriggerWindow
        ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-200/50'
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Digits */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              {status === 'UPCOMING' && startsIn.totalSeconds > 0
                ? 'Auction Starts In'
                : status === 'ACTIVE' && timeLeft.totalSeconds > 0
                ? 'Time Remaining'
                : 'Auction Concluded'}
            </span>
            <AnimatePresence>
              {isInTriggerWindow && (
                <motion.span 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 border border-amber-300 shadow-2xs"
                >
                  <Zap className="w-3 h-3 text-amber-700 fill-amber-700 animate-bounce" />
                  <span>Extension Trigger Window Active ({triggerWindowMinutes}m)</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {status === 'UPCOMING' && startsIn.totalSeconds > 0 ? (
            <div className="flex items-baseline gap-1.5 font-mono text-amber-800">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
                {pad(startsIn.hours)}
              </span>
              <span className="text-xs text-gray-400 font-sans mr-2">h</span>
              <span className="text-2xl font-light text-gray-300">:</span>
              <span className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
                {pad(startsIn.minutes)}
              </span>
              <span className="text-xs text-gray-400 font-sans mr-2">m</span>
              <span className="text-2xl font-light text-gray-300">:</span>
              <span className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
                {pad(startsIn.seconds)}
              </span>
              <span className="text-xs text-gray-400 font-sans">s</span>
            </div>
          ) : status === 'ACTIVE' && timeLeft.totalSeconds > 0 ? (
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 tabular-nums">
                {pad(timeLeft.hours)}
              </span>
              <span className="text-xs text-gray-400 font-sans mr-2">h</span>

              <span className="text-2xl font-light text-gray-300">:</span>

              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 tabular-nums">
                {pad(timeLeft.minutes)}
              </span>
              <span className="text-xs text-gray-400 font-sans mr-2">m</span>

              <span className="text-2xl font-light text-gray-300">:</span>

              <span className={`text-3xl sm:text-4xl font-bold tracking-tight tabular-nums transition-colors ${
                isInTriggerWindow ? 'text-amber-700' : 'text-blue-600'
              }`}>
                {pad(timeLeft.seconds)}
              </span>
              <span className="text-xs text-gray-400 font-sans">s</span>
            </div>
          ) : (
            <div className="text-2xl font-bold text-gray-800">
              {status === 'FORCE_CLOSED' ? 'Hard Forced Closed' : 'Auction Concluded'}
            </div>
          )}
        </div>

        {/* Right: Deadlines info */}
        <div className="flex flex-col sm:items-end text-xs text-gray-600 space-y-1">
          <div>
            <span className="text-gray-500">Scheduled Close: </span>
            <strong className="text-gray-900 font-mono">
              {new Date(currentCloseTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </strong>
          </div>
          <div className="flex items-center sm:justify-end gap-1 text-red-700 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            <span>Forced Close Ceiling: </span>
            <span className="font-mono">{new Date(forcedCloseTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {isInTriggerWindow && (
        <motion.div 
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3.5 pt-3 border-t border-amber-200/80 text-xs text-amber-950 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Bids placed inside this {triggerWindowMinutes}-minute window will automatically extend the auction by <strong>+{extensionDurationMinutes} minutes</strong> (clamped at Forced Close ceiling).
          </span>
        </motion.div>
      )}
    </div>
  );
}
