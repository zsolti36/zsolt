import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface ManualControlsProps {
  onMove: (dx: number, dy: number) => void;
  disabled?: boolean;
}

export const ManualControls: React.FC<ManualControlsProps> = ({ onMove, disabled = false }) => {
  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-slate-900/60 border border-slate-800 rounded-2xl select-none">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
        Manual Navigation (WASD / Arrows)
      </span>
      <button
        disabled={disabled}
        onClick={() => onMove(0, -1)}
        className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 flex items-center justify-center border border-slate-700 shadow transition"
        title="Move Up"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
      <div className="flex gap-1.5">
        <button
          disabled={disabled}
          onClick={() => onMove(-1, 0)}
          className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 flex items-center justify-center border border-slate-700 shadow transition"
          title="Move Left"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          disabled={disabled}
          onClick={() => onMove(0, 1)}
          className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 flex items-center justify-center border border-slate-700 shadow transition"
          title="Move Down"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
        <button
          disabled={disabled}
          onClick={() => onMove(1, 0)}
          className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 flex items-center justify-center border border-slate-700 shadow transition"
          title="Move Right"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
