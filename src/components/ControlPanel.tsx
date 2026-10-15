import React from 'react';
import { AlgorithmType, GameMode, GameSettings, ExitPoint } from '../types/maze';
import {
  Sparkles,
  Zap,
  Gauge,
  Sliders,
  Eye,
  EyeOff,
  Compass,
  Trophy,
  User,
  Bot,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Target,
} from 'lucide-react';

interface ControlPanelProps {
  settings: GameSettings;
  onChangeSettings: (newSettings: Partial<GameSettings>) => void;
  onGenerateNewMaze: () => void;
  onInstantSolve: () => void;
  exits: ExitPoint[];
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  settings,
  onChangeSettings,
  onGenerateNewMaze,
  onInstantSolve,
  exits,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col gap-4">
      {/* Primary Algorithm & Mode Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Algorithm Picker */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            Pathfinding Logic
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onChangeSettings({ algorithm: 'bfs' })}
              className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                settings.algorithm === 'bfs'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Breadth-First Search: Finds shortest path layer by layer"
            >
              BFS
            </button>
            <button
              onClick={() => onChangeSettings({ algorithm: 'dfs' })}
              className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                settings.algorithm === 'dfs'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Depth-First Search: Explores deeply along paths before backtracking"
            >
              DFS
            </button>
            <button
              onClick={() => onChangeSettings({ algorithm: 'astar' })}
              className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                settings.algorithm === 'astar'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="A* Heuristic: Directs search toward closest exit"
            >
              A*
            </button>
          </div>
        </div>

        {/* Game Mode */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Game Mode
          </label>
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onChangeSettings({ gameMode: 'human_solo' })}
              className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                settings.gameMode === 'human_solo'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Play as Human with Keyboard Arrows / WASD"
            >
              <User className="w-3.5 h-3.5" />
              <span>Solo Human</span>
            </button>
            <button
              onClick={() => onChangeSettings({ gameMode: 'human_vs_ai' })}
              className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                settings.gameMode === 'human_vs_ai'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Race against AI Agent in real-time"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-300" />
              <span>Human vs AI</span>
            </button>
            <button
              onClick={() => onChangeSettings({ gameMode: 'ai_only' })}
              className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                settings.gameMode === 'ai_only'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Solo AI</span>
            </button>
            <button
              onClick={() => onChangeSettings({ gameMode: 'race_bfs_dfs' })}
              className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                settings.gameMode === 'race_bfs_dfs'
                  ? 'bg-gradient-to-r from-cyan-600 to-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="BFS vs DFS side-by-side battle"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>BFS vs DFS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Starting Point In Maze Selector */}
      <div className="pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            Maze Starting Point
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {settings.startPreset === 'custom' ? 'Custom Cell' : settings.startPreset.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'center', label: 'Center' },
            { id: 'top_left', label: 'Top-Left' },
            { id: 'top_right', label: 'Top-Right' },
            { id: 'bottom_left', label: 'Btm-Left' },
            { id: 'bottom_right', label: 'Btm-Right' },
            { id: 'random', label: '🎲 Random' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeSettings({ startPreset: item.id as any })}
              className={`py-1 px-1.5 text-[11px] font-semibold rounded-lg transition-all truncate text-center ${
                settings.startPreset === item.id
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title={`Start from ${item.label} location in maze`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mt-1 italic">
          Tip: You can also click or tap any passage square on the canvas to set a custom start position!
        </p>
      </div>

      {/* Speed & Size Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
        {/* Speed */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              Step Speed
            </span>
            <span className="font-mono text-cyan-300">
              {settings.speedMs <= 5 ? 'TURBO' : `${settings.speedMs}ms`}
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="120"
            step="2"
            // invert so right = faster
            value={122 - settings.speedMs}
            onChange={(e) => onChangeSettings({ speedMs: 122 - Number(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Maze Dimensions */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              Maze Size
            </span>
            <span className="font-mono text-emerald-300">
              {settings.gridSize}x{settings.gridSize}
            </span>
          </div>
          <div className="flex gap-1">
            {[17, 25, 33, 41].map((sz) => (
              <button
                key={sz}
                onClick={() => onChangeSettings({ gridSize: sz })}
                className={`flex-1 py-1 text-[11px] font-mono rounded border transition ${
                  settings.gridSize === sz
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* Exit Count & Loops */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Exits Count
            </span>
            <span className="font-mono text-amber-300">{settings.exitCount} Exits</span>
          </div>
          <div className="flex gap-1">
            {[2, 3, 4, 5, 6].map((count) => (
              <button
                key={count}
                onClick={() => onChangeSettings({ exitCount: count })}
                className={`flex-1 py-1 text-[11px] font-mono rounded border transition ${
                  settings.exitCount === count
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Moving Obstacles / Dynamic Hazards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              Moving Hazards
            </span>
            <span className="font-mono text-rose-400">
              {settings.obstacleCount === 0 ? 'Disabled' : `${settings.obstacleCount} Patrols`}
            </span>
          </div>
          <div className="flex gap-1">
            {[0, 2, 4, 6, 8].map((count) => (
              <button
                key={count}
                onClick={() => onChangeSettings({ obstacleCount: count })}
                className={`flex-1 py-1 text-[11px] font-mono rounded border transition ${
                  settings.obstacleCount === count
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {count === 0 ? 'Off' : `${count}`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="text-slate-400">Hazard Patrol Speed</span>
            <span className="font-mono text-rose-300 capitalize">{settings.obstacleSpeed}</span>
          </div>
          <div className="flex gap-1">
            {(['slow', 'normal', 'fast'] as const).map((spd) => (
              <button
                key={spd}
                disabled={settings.obstacleCount === 0}
                onClick={() => onChangeSettings({ obstacleSpeed: spd })}
                className={`flex-1 py-1 text-[11px] font-mono rounded border transition capitalize disabled:opacity-40 disabled:cursor-not-allowed ${
                  settings.obstacleSpeed === spd && settings.obstacleCount > 0
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {spd}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Multiple Exit Badges & Quick Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-cyan-400" /> Exits:
          </span>
          {exits.map((exit) => (
            <div
              key={exit.id}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-950/80 border border-slate-800"
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: exit.color }}
              />
              <span className="text-slate-300">{exit.name}</span>
              {exit.distanceFromStart && (
                <span className="text-slate-500">({exit.distanceFromStart} steps)</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Fog of War toggle */}
          <button
            onClick={() => onChangeSettings({ fogOfWar: !settings.fogOfWar })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              settings.fogOfWar
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle Fog of War (simulates limited agent sensor radius)"
          >
            {settings.fogOfWar ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Fog of War</span>
          </button>

          {/* Instant Solve */}
          <button
            onClick={onInstantSolve}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Calculate and display final optimal path immediately"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>Instant Path</span>
          </button>

          {/* New Maze Button */}
          <button
            onClick={onGenerateNewMaze}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/30 transition active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Maze</span>
          </button>
        </div>
      </div>
    </div>
  );
};
