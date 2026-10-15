import { Point, ExitPoint, MazeData, AlgorithmType } from '../types/maze';

export interface PathfindingState {
  algorithm: AlgorithmType;
  currentPos: Point;
  visited: Map<string, number>; // key -> step index
  visitedOrder: Point[];
  parentMap: Map<string, string>; // childKey -> parentKey
  frontier: Point[];
  // For DFS: stack of points
  // For BFS: queue of points
  // For A*: open list with f scores
  queue: Point[];
  stack: Point[];
  aStarOpen: { point: Point; f: number; g: number }[];
  aStarGScore: Map<string, number>;
  nodesExpanded: number;
  isFinished: boolean;
  escapedExit: ExitPoint | null;
  solutionPath: Point[];
}

export function createPathfindingState(
  start: Point,
  algorithm: AlgorithmType
): PathfindingState {
  const startKey = `${start.x},${start.y}`;
  const visited = new Map<string, number>();
  const parentMap = new Map<string, string>();

  const state: PathfindingState = {
    algorithm,
    currentPos: { ...start },
    visited,
    visitedOrder: [],
    parentMap,
    frontier: [{ ...start }],
    queue: [{ ...start }],
    stack: [{ ...start }],
    aStarOpen: [{ point: { ...start }, f: 0, g: 0 }],
    aStarGScore: new Map<string, number>([[startKey, 0]]),
    nodesExpanded: 0,
    isFinished: false,
    escapedExit: null,
    solutionPath: [],
  };

  return state;
}

const NEIGHBOR_DELTAS = [
  { x: 0, y: -1 }, // Up
  { x: 1, y: 0 },  // Right
  { x: 0, y: 1 },  // Down
  { x: -1, y: 0 }, // Left
];

/**
 * Executes a single step of the pathfinding algorithm.
 * Returns true if the search finished (either escaped or exhausted).
 */
export function stepPathfinding(
  state: PathfindingState,
  maze: MazeData,
  blockedCells?: Set<string>
): boolean {
  if (state.isFinished) return true;

  const exitMap = new Map<string, ExitPoint>();
  maze.exits.forEach((e) => exitMap.set(`${e.x},${e.y}`, e));

  if (state.algorithm === 'bfs') {
    return stepBFS(state, maze, exitMap, blockedCells);
  } else if (state.algorithm === 'dfs') {
    return stepDFS(state, maze, exitMap, blockedCells);
  } else {
    return stepAStar(state, maze, exitMap, blockedCells);
  }
}

function stepBFS(
  state: PathfindingState,
  maze: MazeData,
  exitMap: Map<string, ExitPoint>,
  blockedCells?: Set<string>
): boolean {
  if (state.queue.length === 0) {
    state.isFinished = true;
    return true;
  }

  // FIFO dequeue
  const current = state.queue.shift()!;
  state.currentPos = current;
  const currentKey = `${current.x},${current.y}`;

  if (!state.visited.has(currentKey)) {
    state.visited.set(currentKey, state.nodesExpanded);
    state.visitedOrder.push(current);
    state.nodesExpanded++;
  }

  // Check if reached exit
  if (exitMap.has(currentKey)) {
    state.isFinished = true;
    state.escapedExit = exitMap.get(currentKey)!;
    state.solutionPath = reconstructPath(state.parentMap, maze.start, current);
    state.frontier = [];
    return true;
  }

  // Inspect valid neighbors
  for (const delta of NEIGHBOR_DELTAS) {
    const nx = current.x + delta.x;
    const ny = current.y + delta.y;
    const nKey = `${nx},${ny}`;

    // Skip if dynamically blocked by moving obstacle
    if (blockedCells && blockedCells.has(nKey)) {
      continue;
    }

    if (
      nx >= 0 &&
      nx < maze.width &&
      ny >= 0 &&
      ny < maze.height &&
      maze.grid[ny][nx] === 1 &&
      !state.visited.has(nKey) &&
      !state.parentMap.has(nKey) &&
      nKey !== `${maze.start.x},${maze.start.y}`
    ) {
      state.parentMap.set(nKey, currentKey);
      state.queue.push({ x: nx, y: ny });
    }
  }

  state.frontier = [...state.queue];
  return false;
}

function stepDFS(
  state: PathfindingState,
  maze: MazeData,
  exitMap: Map<string, ExitPoint>,
  blockedCells?: Set<string>
): boolean {
  if (state.stack.length === 0) {
    state.isFinished = true;
    return true;
  }

  // LIFO pop
  const current = state.stack.pop()!;
  state.currentPos = current;
  const currentKey = `${current.x},${current.y}`;

  if (!state.visited.has(currentKey)) {
    state.visited.set(currentKey, state.nodesExpanded);
    state.visitedOrder.push(current);
    state.nodesExpanded++;
  }

  // Check if reached exit
  if (exitMap.has(currentKey)) {
    state.isFinished = true;
    state.escapedExit = exitMap.get(currentKey)!;
    state.solutionPath = reconstructPath(state.parentMap, maze.start, current);
    state.frontier = [];
    return true;
  }

  // Inspect neighbors
  const unvisitedNeighbors: Point[] = [];
  for (const delta of NEIGHBOR_DELTAS) {
    const nx = current.x + delta.x;
    const ny = current.y + delta.y;
    const nKey = `${nx},${ny}`;

    // Skip if blocked by moving obstacle
    if (blockedCells && blockedCells.has(nKey)) {
      continue;
    }

    if (
      nx >= 0 &&
      nx < maze.width &&
      ny >= 0 &&
      ny < maze.height &&
      maze.grid[ny][nx] === 1 &&
      !state.visited.has(nKey)
    ) {
      unvisitedNeighbors.push({ x: nx, y: ny });
    }
  }

  for (const neighbor of unvisitedNeighbors) {
    const nKey = `${neighbor.x},${neighbor.y}`;
    if (!state.parentMap.has(nKey) && nKey !== `${maze.start.x},${maze.start.y}`) {
      state.parentMap.set(nKey, currentKey);
    }
    state.stack.push(neighbor);
  }

  state.frontier = [...state.stack];
  return false;
}

function stepAStar(
  state: PathfindingState,
  maze: MazeData,
  exitMap: Map<string, ExitPoint>,
  blockedCells?: Set<string>
): boolean {
  if (state.aStarOpen.length === 0) {
    state.isFinished = true;
    return true;
  }

  // Sort open list by f score ascending
  state.aStarOpen.sort((a, b) => a.f - b.f);
  const currentEntry = state.aStarOpen.shift()!;
  const current = currentEntry.point;
  state.currentPos = current;
  const currentKey = `${current.x},${current.y}`;

  if (!state.visited.has(currentKey)) {
    state.visited.set(currentKey, state.nodesExpanded);
    state.visitedOrder.push(current);
    state.nodesExpanded++;
  }

  if (exitMap.has(currentKey)) {
    state.isFinished = true;
    state.escapedExit = exitMap.get(currentKey)!;
    state.solutionPath = reconstructPath(state.parentMap, maze.start, current);
    state.frontier = [];
    return true;
  }

  const currentG = state.aStarGScore.get(currentKey) ?? 0;

  for (const delta of NEIGHBOR_DELTAS) {
    const nx = current.x + delta.x;
    const ny = current.y + delta.y;
    const nKey = `${nx},${ny}`;

    if (blockedCells && blockedCells.has(nKey)) {
      continue;
    }

    if (
      nx >= 0 &&
      nx < maze.width &&
      ny >= 0 &&
      ny < maze.height &&
      maze.grid[ny][nx] === 1 &&
      !state.visited.has(nKey)
    ) {
      const tentativeG = currentG + 1;
      const existingG = state.aStarGScore.get(nKey);

      if (existingG === undefined || tentativeG < existingG) {
        state.parentMap.set(nKey, currentKey);
        state.aStarGScore.set(nKey, tentativeG);

        // Heuristic: Manhattan distance to the closest exit
        let minH = Infinity;
        for (const exit of maze.exits) {
          const h = Math.abs(exit.x - nx) + Math.abs(exit.y - ny);
          if (h < minH) minH = h;
        }

        const f = tentativeG + minH;
        state.aStarOpen.push({ point: { x: nx, y: ny }, f, g: tentativeG });
      }
    }
  }

  state.frontier = state.aStarOpen.map((item) => item.point);
  return false;
}

/**
 * Reconstructs the path from start to end using parent map
 */
function reconstructPath(
  parentMap: Map<string, string>,
  start: Point,
  end: Point
): Point[] {
  const path: Point[] = [];
  let currKey: string | undefined = `${end.x},${end.y}`;
  const startKey = `${start.x},${start.y}`;

  while (currKey && currKey !== startKey) {
    const [x, y] = currKey.split(',').map(Number);
    path.unshift({ x, y });
    currKey = parentMap.get(currKey);
  }

  path.unshift(start);
  return path;
}

/**
 * Solves completely from start and returns the result (useful for instant comparison or validation)
 */
export function solveInstant(
  maze: MazeData,
  algorithm: AlgorithmType,
  blockedCells?: Set<string>
): {
  solutionPath: Point[];
  escapedExit: ExitPoint | null;
  nodesExpanded: number;
  visitedOrder: Point[];
} {
  return solveFromPoint(maze.start, maze, algorithm, blockedCells);
}

/**
 * Solves pathfinding from an arbitrary position (e.g. current agent position when rerouting around moving obstacles)
 */
export function solveFromPoint(
  startPos: Point,
  maze: MazeData,
  algorithm: AlgorithmType,
  blockedCells?: Set<string>
): {
  solutionPath: Point[];
  escapedExit: ExitPoint | null;
  nodesExpanded: number;
  visitedOrder: Point[];
} {
  const state = createPathfindingState(startPos, algorithm);
  let steps = 0;
  const maxSteps = maze.width * maze.height * 4;

  while (!state.isFinished && steps < maxSteps) {
    stepPathfinding(state, maze, blockedCells);
    steps++;
  }

  return {
    solutionPath: state.solutionPath,
    escapedExit: state.escapedExit,
    nodesExpanded: state.nodesExpanded,
    visitedOrder: state.visitedOrder,
  };
}
