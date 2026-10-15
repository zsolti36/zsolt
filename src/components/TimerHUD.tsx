import React from 'react';
import { GameStatus } from '../types/maze';
import { Play, Pause, RotateCcw, Volume2, VolumeX, AlertTriangle, ShieldCheck, Flame } from 'lucide-react';

interface TimerHUDProps {
  timeLeftSeconds: number;
  totalDurationSeconds: number;
  gameStatus: GameStatus;
  soundEnabled: boolean;
  onTogglePlayPause: () => void;
  onReset: () => void;
  onToggleSound: () => void;
  onSelectDuration: (seconds: number) => void;
}

export const TimerHUD: React.FC<TimerHUDProps> = ({
  timeLeftSeconds,
  totalDurationSeconds,
  gameStatus,
  soundEnabled,
  onTogglePlayPause,
  onReset,
  onToggleSound,
  onSelectDuration,
}) => {
  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progressPercent = Math.max(0, Math.min(100, (timeLeftSeconds / totalDurationSeconds) * 100));

  // Determine alert level
  const isCritical = timeLeftSeconds <= 30 && timeLeftSeconds > 0;
  const isWarning = timeLeftSeconds <= 60 && timeLeftSeconds > 30;

  // SVG circular ring properties
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  let ringColor = 'stroke-cyan-500';
  let badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
  let badgeText = 'AGENT PATROLLING';

  if (gameStatus === 'escaped') {
    ringColor = 'stroke-emerald-400';
    badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    badgeText = 'ESCAPE SUCCESSFUL!';
  } else if (gameStatus === 'timeout') {
    ringColor = 'stroke-rose-600';
    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
    badgeText = 'TIME UP - MAZE SEALED';
  } else if (gameStatus === 'paused') {
    badgeColor = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    badgeText = 'PAUSED';
  } else if (isCritical) {
    ringColor = 'stroke-rose-500';
    badgeColor = 'bg-rose-500/15 text-rose-400 border-rose-500/40 animate-pulse';
    badgeText = 'CRITICAL COUNTDOWN';
  } else if (isWarning) {
    ringColor = 'stroke-amber-400';
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
      {/* Timer Circle & Digits */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            {/* Background Track */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="stroke-slate-800"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Dynamic Progress Ring */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              className={`transition-all duration-300 ${ringColor}`}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {isCritical ? (
              <Flame className="w-4 h-4 text-rose-500 animate-bounce mb-0.5" />
            ) : null}
            <span
              className={`font-mono text-xs font-semibold ${
                isCritical ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              TIMER
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`font-mono text-3xl font-extrabold tracking-tight ${
                isCritical
                  ? 'text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                  : isWarning
                  ? 'text-amber-400'
                  : 'text-slate-100'
              }`}
            >
              {formattedTime}
            </span>
            <span className="text-xs font-mono text-slate-500">/ 05:00</span>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${badgeColor}`}
            >
              {gameStatus === 'escaped' && <ShieldCheck className="w-3.5 h-3.5" />}
              {gameStatus === 'timeout' && <AlertTriangle className="w-3.5 h-3.5" />}
              <span>{badgeText}</span>
            </div>

            {/* Quick Timer presets */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950/60 rounded-lg p-0.5 border border-slate-800">
              {[
                { label: '1m', sec: 60 },
                { label: '3m', sec: 180 },
                { label: '5m', sec: 300 },
                { label: '10m', sec: 600 },
              ].map((preset) => (
                <button
                  key={preset.sec}
                  onClick={() => onSelectDuration(preset.sec)}
                  className={`px-2 py-0.5 rounded transition ${
                    totalDurationSeconds === preset.sec
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'hover:text-slate-200'
                  }`}
                  title={`Set countdown to ${preset.label}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onTogglePlayPause}
          disabled={gameStatus === 'escaped' || gameStatus === 'timeout'}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
            gameStatus === 'running'
              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/40'
          }`}
        >
          {gameStatus === 'running' ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause AI</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Start Escape</span>
            </>
          )}
        </button>

        <button
          onClick={onReset}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition shadow active:scale-95"
          title="Reset maze & agent to start position"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleSound}
          className={`p-2.5 rounded-xl border transition shadow active:scale-95 ${
            soundEnabled
              ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700/60'
              : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
          }`}
          title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
