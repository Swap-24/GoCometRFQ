import React, { useState, useEffect } from 'react';
import { Clock, Zap, AlertTriangle, ShieldAlert } from 'lucide-react';
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
  const [isInTriggerWindow, setIsInTriggerWindow] = useState(false);
  const [isPastForcedClose, setIsPastForcedClose] = useState(false);
  const [progressPercent, setProgressPercent] = useState(100);

  useEffect(() => {
    function calculate() {
      const now = new Date().getTime();
      const close = new Date(currentCloseTime).getTime();
      const forced = new Date(forcedCloseTime).getTime();
      const start = new Date(startTime).getTime();

      const diff = close - now;
      const forcedDiff = forced - now;

      if (forcedDiff <= 0) {
        setIsPastForcedClose(true);
      } else {
        setIsPastForcedClose(false);
      }

      if (diff <= 0) {
        setTimeLeft({ totalSeconds: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsInTriggerWindow(false);
        setProgressPercent(0);
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      setTimeLeft({ totalSeconds: totalSec, hours, minutes, seconds });

      // Inside trigger window if totalSec <= triggerWindowMinutes * 60
      const triggerSec = triggerWindowMinutes * 60;
      setIsInTriggerWindow(totalSec <= triggerSec && status === 'ACTIVE');

      // Progress bar calculation (elapsed percentage vs forced ceiling)
      const totalSpan = forced - start;
      const currentElapsed = now - start;
      if (totalSpan > 0) {
        const remainingRatio = Math.max(0, Math.min(1, (forced - now) / totalSpan));
        setProgressPercent(Math.round(remainingRatio * 100));
      }
    }

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [currentCloseTime, forcedCloseTime, startTime, triggerWindowMinutes, status]);

  const pad = (n) => String(n).padStart(2, '0');

  if (compact) {
    if (status === 'CLOSED' || status === 'FORCE_CLOSED' || timeLeft.totalSeconds <= 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 text-xs font-mono font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>Closed</span>
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all ${
        isInTriggerWindow 
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
          : 'bg-slate-800/80 text-sky-400 border border-slate-700'
      }`}>
        {isInTriggerWindow && <Zap className="w-3.5 h-3.5 text-amber-400" />}
        <Clock className={`w-3.5 h-3.5 ${isInTriggerWindow ? 'hidden' : 'inline'}`} />
        <span>{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}</span>
      </span>
    );
  }

  // Full Auction Detail Countdown Display
  return (
    <div className={`rounded-2xl p-6 transition-all duration-300 relative overflow-hidden border ${
      status === 'FORCE_CLOSED' || isPastForcedClose
        ? 'bg-rose-950/20 border-rose-800/40 text-rose-300'
        : status === 'CLOSED'
        ? 'bg-slate-900/60 border-slate-800 text-slate-400'
        : isInTriggerWindow
        ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-amber-950/20 border-amber-500/50 shadow-2xl shadow-amber-500/10'
        : 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-slate-800 shadow-xl'
    }`}>
      {/* Background glow when in trigger window */}
      {isInTriggerWindow && (
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Timer digits */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className={`w-4 h-4 ${isInTriggerWindow ? 'text-amber-400 animate-spin' : 'text-sky-400'}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {status === 'ACTIVE' ? 'Auction Time Remaining' : 'Auction Final Status'}
            </span>
          </div>

          {status === 'ACTIVE' && timeLeft.totalSeconds > 0 ? (
            <div className="flex items-baseline gap-2 font-mono">
              <div className="flex items-baseline">
                <span className={`text-4xl md:text-5xl font-black tracking-tight tabular-nums ${
                  isInTriggerWindow ? 'text-amber-300' : 'text-white'
                }`}>
                  {pad(timeLeft.hours)}
                </span>
                <span className="text-xs text-slate-500 ml-1 mr-2">h</span>
              </div>
              <span className="text-2xl text-slate-600 font-light">:</span>
              <div className="flex items-baseline">
                <span className={`text-4xl md:text-5xl font-black tracking-tight tabular-nums ${
                  isInTriggerWindow ? 'text-amber-300' : 'text-white'
                }`}>
                  {pad(timeLeft.minutes)}
                </span>
                <span className="text-xs text-slate-500 ml-1 mr-2">m</span>
              </div>
              <span className="text-2xl text-slate-600 font-light">:</span>
              <div className="flex items-baseline">
                <span className={`text-4xl md:text-5xl font-black tracking-tight tabular-nums ${
                  isInTriggerWindow ? 'text-amber-400' : 'text-sky-400'
                }`}>
                  {pad(timeLeft.seconds)}
                </span>
                <span className="text-xs text-slate-500 ml-1">s</span>
              </div>
            </div>
          ) : (
            <div className="text-3xl font-extrabold text-slate-300">
              {status === 'FORCE_CLOSED' ? 'Hard Forced Closed' : 'Auction Concluded'}
            </div>
          )}
        </div>

        {/* Right: Trigger window indicator */}
        <div className="flex flex-col items-start md:items-end gap-1.5">
          <AnimatePresence>
            {isInTriggerWindow && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-lg shadow-amber-500/10"
              >
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
                <span>Trigger Window Active ({triggerWindowMinutes}m)</span>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-xs text-slate-400 text-right">
            Closes at: <strong className="text-white font-mono">{new Date(currentCloseTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>
          </p>
          <p className="text-[11px] text-slate-500 text-right flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-400 inline" />
            Hard Ceiling: <span className="text-rose-400/90 font-mono font-medium">{new Date(forcedCloseTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </p>
        </div>
      </div>

      {/* Extension explanation banner when active in window */}
      {isInTriggerWindow && (
        <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center gap-2 text-xs text-amber-300/90">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Bids placed now trigger an automatic <strong>+{extensionDurationMinutes} min</strong> extension (capped at Forced Close Time).
          </span>
        </div>
      )}
    </div>
  );
}
