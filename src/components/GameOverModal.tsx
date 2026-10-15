import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameStatus, ExitPoint } from '../types/maze';
import { Trophy, AlertOctagon, RotateCcw, ArrowRight, Clock, Footprints, Compass } from 'lucide-react';

interface GameOverModalProps {
  status: GameStatus;
  escapedExit: ExitPoint | null;
  timeTakenSeconds: number;
  totalNodesExplored: number;
  pathLength: number;
  algorithmName: string;
  victorName?: string;
  onPlayAgain: () => void;
  onNewMaze: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  status,
  escapedExit,
  timeTakenSeconds,
  totalNodesExplored,
  pathLength,
  algorithmName,
  victorName,
  onPlayAgain,
  onNewMaze,
}) => {
  const isVictory = status === 'escaped';
  const isTimeout = status === 'timeout';

  useEffect(() => {
    if (isVictory) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6'],
        });
      } catch {
        // ignore
      }
    }
  }, [isVictory]);

  if (!isVictory && !isTimeout) return null;

  const minutes = Math.floor(timeTakenSeconds / 60);
  const seconds = timeTakenSeconds % 60;
  const timeFormatted = `${minutes}m ${seconds}s`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
        {/* Glow Header Accent */}
        <div
          className={`absolute -top-24 w-48 h-48 rounded-full blur-3xl opacity-30 ${
            isVictory ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        />

        {/* Icon */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border ${
            isVictory
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
          }`}
        >
          {isVictory ? <Trophy className="w-8 h-8" /> : <AlertOctagon className="w-8 h-8" />}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black text-slate-100 mb-1">
          {isVictory ? `${victorName || 'Escape'} Escaped!` : '5-Minute Timer Expired!'}
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {isVictory
            ? victorName?.includes('Human') || victorName?.includes('You')
              ? 'You successfully navigated square-by-square and escaped through the exit portal!'
              : `AI agent navigated out using ${algorithmName} logic.`
            : 'The 5-minute countdown hit zero before reaching an exit portal.'}
        </p>

        {/* Result Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-2.5 mb-6 text-left">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" /> Time Elapsed
            </span>
            <span className="text-base font-mono font-bold text-slate-200">
              {timeFormatted}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <Compass className="w-3.5 h-3.5 text-amber-400" /> Algorithm
            </span>
            <span className="text-base font-mono font-bold text-slate-200">
              {algorithmName}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <Footprints className="w-3.5 h-3.5 text-emerald-400" /> Path Length
            </span>
            <span className="text-base font-mono font-bold text-slate-200">
              {pathLength > 0 ? `${pathLength} steps` : 'N/A'}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              Nodes Explored
            </span>
            <span className="text-base font-mono font-bold text-slate-200">
              {totalNodesExplored}
            </span>
          </div>
        </div>

        {/* Target Exit Banner if escaped */}
        {escapedExit && (
          <div
            className="w-full py-2.5 px-4 rounded-xl border mb-6 flex items-center justify-between text-xs font-mono"
            style={{
              backgroundColor: `${escapedExit.color}15`,
              borderColor: `${escapedExit.color}40`,
            }}
          >
            <span className="text-slate-300">Escaped through:</span>
            <span className="font-bold flex items-center gap-1.5" style={{ color: escapedExit.color }}>
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: escapedExit.color }}
              />
              {escapedExit.name}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full flex items-center gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Maze</span>
          </button>
          <button
            onClick={onNewMaze}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/40 transition active:scale-95"
          >
            <span>Next Maze</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
