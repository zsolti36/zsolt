export interface Point {
  x: number;
  y: number;
}

export interface ExitPoint extends Point {
  id: string;
  name: string;
  color: string;
  distanceFromStart?: number;
}

export interface MazeData {
  width: number;
  height: number;
  // 0: wall, 1: path
  grid: number[][];
  start: Point;
  exits: ExitPoint[];
}

export type AlgorithmType = 'bfs' | 'dfs' | 'astar';

export type GameMode = 'human_solo' | 'human_vs_ai' | 'ai_only' | 'race_bfs_dfs';

export type StartLocationPreset =
  | 'center'
  | 'top_left'
  | 'top_right'
  | 'bottom_left'
  | 'bottom_right'
  | 'random'
  | 'custom';

export type GameStatus = 'idle' | 'running' | 'paused' | 'escaped' | 'timeout';

export interface AgentProgress {
  id: string;
  name: string;
  algorithm: AlgorithmType;
  color: string;
  secondaryColor: string;
  currentPos: Point;
  visitedCount: number;
  frontierCount: number;
  pathLength: number;
  nodesExpanded: number;
  status: 'idle' | 'searching' | 'escaped' | 'dead_end';
  escapedExit: ExitPoint | null;
  escapeTimeSeconds: number | null;
  // Explored grid coordinates map string "x,y" => step index
  visitedMap: Map<string, number>;
  // Current frontier positions
  frontier: Point[];
  // Reconstructed final route
  solutionPath: Point[];
  // Full chronological step history for replay or animation
  stepHistory: Point[];
}

export interface MovingObstacle {
  id: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  dx: number;
  dy: number;
  speedMultiplier: number;
  name: string;
  color: string;
}

export interface GameSettings {
  gridSize: number; // e.g. 15, 21, 29, 39
  exitCount: number; // 2 to 6 exits
  durationSeconds: number; // default 300 (5 mins)
  speedMs: number; // delay between search/move steps (5ms to 300ms)
  braidPercent: number; // 0 to 60% loops (creates multiple distinct paths to each exit!)
  algorithm: AlgorithmType;
  gameMode: GameMode;
  fogOfWar: boolean;
  soundEnabled: boolean;
  obstacleCount: number; // 0 to 8 moving hazards
  obstacleSpeed: 'slow' | 'normal' | 'fast';
  startPreset: StartLocationPreset;
}
