import React from 'react';
import { GameMode, AlgorithmType } from '../types/maze';
import { PathfindingState } from '../utils/pathfinders';
import { Activity, Layers, CornerDownRight, HelpCircle, Trophy } from 'lucide-react';

interface AlgorithmInspectorProps {
  agentState1?: PathfindingState | null;
  agentState2?: PathfindingState | null;
  gameMode: GameMode;
  totalMazePassages: number;
}

export const AlgorithmInspector: React.FC<AlgorithmInspectorProps> = ({
  agentState1,
  agentState2,
  gameMode,
  totalMazePassages,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Algorithm Telemetry & Logic</span>
        </h3>
        <span className="text-xs font-mono text-slate-500">
          Passages in maze: {totalMazePassages}
        </span>
      </div>

      {/* When in Race Mode: Side by Side Cards */}
      {gameMode === 'race_bfs_dfs' && agentState1 && agentState2 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AgentTelemetryCard
            agent={agentState1}
            label="Agent 1 (BFS)"
            colorClass="text-cyan-400"
            borderClass="border-cyan-500/30 bg-cyan-950/20"
            badgeBg="bg-cyan-500/20 text-cyan-300"
            isWinner={agentState1.escapedExit !== null}
          />
          <AgentTelemetryCard
            agent={agentState2}
            label="Agent 2 (DFS)"
            colorClass="text-amber-400"
            borderClass="border-amber-500/30 bg-amber-950/20"
            badgeBg="bg-amber-500/20 text-amber-300"
            isWinner={agentState2.escapedExit !== null}
          />
        </div>
      ) : agentState1 ? (
        /* Single Agent Card */
        <AgentTelemetryCard
          agent={agentState1}
          label={`AI Agent (${agentState1.algorithm.toUpperCase()})`}
          colorClass="text-cyan-400"
          borderClass="border-cyan-500/30 bg-cyan-950/20"
          badgeBg="bg-cyan-500/20 text-cyan-300"
          isWinner={agentState1.escapedExit !== null}
        />
      ) : null}

      {/* Explanatory algorithm notes tailored to BFS vs DFS */}
      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            <strong className="text-cyan-300">BFS (Breadth-First Search):</strong> Explores
            all neighboring nodes uniformly layer by layer via a FIFO Queue. Always guarantees
            finding the <em>absolute shortest path</em> to the closest exit.
          </p>
          <p>
            <strong className="text-amber-300">DFS (Depth-First Search):</strong> Explores deep
            down corridors via a LIFO Stack until hitting a dead end before backtracking. Fast
            at discovering deep exits, but the resulting path may be winding and non-optimal.
          </p>
        </div>
      </div>
    </div>
  );
};

interface AgentTelemetryCardProps {
  agent: PathfindingState;
  label: string;
  colorClass: string;
  borderClass: string;
  badgeBg: string;
  isWinner: boolean;
}

const AgentTelemetryCard: React.FC<AgentTelemetryCardProps> = ({
  agent,
  label,
  colorClass,
  borderClass,
  badgeBg,
  isWinner,
}) => {
  const memoryStructure = agent.algorithm === 'bfs' ? 'Queue (FIFO)' : 'Stack (LIFO)';
  const frontierCount =
    agent.algorithm === 'bfs'
      ? agent.queue.length
      : agent.algorithm === 'dfs'
      ? agent.stack.length
      : agent.aStarOpen.length;

  return (
    <div className={`p-3.5 rounded-xl border ${borderClass} relative overflow-hidden flex flex-col justify-between`}>
      {isWinner && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 animate-pulse">
          <Trophy className="w-3 h-3 text-emerald-400" />
          ESCAPED!
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-bold uppercase tracking-wider ${colorClass}`}>
            {label}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${badgeBg}`}>
            {memoryStructure}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">Nodes Explored</span>
            <span className="font-mono text-base font-bold text-slate-200">
              {agent.nodesExpanded}
            </span>
          </div>

          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">Active Frontier</span>
            <span className="font-mono text-base font-bold text-slate-200">
              {frontierCount}
            </span>
          </div>

          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">Current Position</span>
            <span className="font-mono text-xs font-bold text-slate-300">
              ({agent.currentPos.x}, {agent.currentPos.y})
            </span>
          </div>

          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">Path Length</span>
            <span className="font-mono text-xs font-bold text-slate-300">
              {agent.solutionPath.length > 0 ? `${agent.solutionPath.length} steps` : 'Searching...'}
            </span>
          </div>
        </div>
      </div>

      {agent.escapedExit && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Exit Reached:</span>
          <span
            className="font-bold flex items-center gap-1"
            style={{ color: agent.escapedExit.color }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: agent.escapedExit.color }}
            />
            {agent.escapedExit.name}
          </span>
        </div>
      )}
    </div>
  );
};
