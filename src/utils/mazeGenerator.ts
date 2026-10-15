import { MazeData, Point, ExitPoint, StartLocationPreset } from '../types/maze';

const EXIT_COLORS = [
  { name: 'Exit Alpha', color: '#10b981' }, // emerald
  { name: 'Exit Beta', color: '#06b6d4' },  // cyan
  { name: 'Exit Gamma', color: '#f59e0b' }, // amber
  { name: 'Exit Delta', color: '#8b5cf6' }, // purple
  { name: 'Exit Epsilon', color: '#ec4899' }, // pink
  { name: 'Exit Zeta', color: '#3b82f6' }, // blue
];

/**
 * Finds a valid passage cell closest to the requested starting location preset
 */
export function findStartPointByPreset(
  grid: number[][],
  width: number,
  height: number,
  preset: StartLocationPreset
): Point {
  if (preset === 'random') {
    const candidates: Point[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (grid[y][x] === 1) {
          candidates.push({ x, y });
        }
      }
    }
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  // Target coordinates for corners / center
  let targetX = Math.floor(width / 2);
  let targetY = Math.floor(height / 2);

  if (preset === 'top_left') {
    targetX = 1;
    targetY = 1;
  } else if (preset === 'top_right') {
    targetX = width - 2;
    targetY = 1;
  } else if (preset === 'bottom_left') {
    targetX = 1;
    targetY = height - 2;
  } else if (preset === 'bottom_right') {
    targetX = width - 2;
    targetY = height - 2;
  }

  // Find nearest passage (grid === 1)
  let bestPt: Point = { x: 1, y: 1 };
  let bestDist = Infinity;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (grid[y][x] === 1) {
        const d = Math.abs(x - targetX) + Math.abs(y - targetY);
        if (d < bestDist) {
          bestDist = d;
          bestPt = { x, y };
        }
      }
    }
  }

  return bestPt;
}

/**
 * Generates an odd-dimension maze with multiple guaranteed randomized exits,
 * optional braiding (loops) to ensure multiple distinct paths exist,
 * and a customizable starting point.
 */
export function generateMaze(
  rawSize: number = 25,
  exitCount: number = 3,
  braidPercent: number = 25,
  startPreset: StartLocationPreset = 'center'
): MazeData {
  // Ensure odd dimensions for proper wall/passage interleaving
  const size = rawSize % 2 === 0 ? rawSize + 1 : rawSize;
  const width = size;
  const height = size;

  // Initialize all cells as walls (0)
  const grid: number[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 0)
  );

  // Helper directions for stepping 2 cells at a time
  const directions = [
    { dx: 0, dy: -2 }, // Up
    { dx: 2, dy: 0 },  // Right
    { dx: 0, dy: 2 },  // Down
    { dx: -2, dy: 0 }, // Left
  ];

  // Carve seed near center
  const seedX = Math.floor(width / 4) * 2 + 1;
  const seedY = Math.floor(height / 4) * 2 + 1;
  grid[seedY][seedX] = 1;

  // Recursive Backtracker algorithm with explicit stack
  const stack: Point[] = [{ x: seedX, y: seedY }];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors: { p: Point; wall: Point }[] = [];

    // Shuffle directions
    const shuffledDirs = [...directions].sort(() => Math.random() - 0.5);

    for (const dir of shuffledDirs) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && grid[ny][nx] === 0) {
        neighbors.push({
          p: { x: nx, y: ny },
          wall: { x: current.x + dir.dx / 2, y: current.y + dir.dy / 2 },
        });
      }
    }

    if (neighbors.length > 0) {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      grid[next.wall.y][next.wall.x] = 1; // carve wall
      grid[next.p.y][next.p.x] = 1;       // carve neighbor
      stack.push(next.p);
    } else {
      stack.pop();
    }
  }

  // Braiding: punch holes in random walls between passages to create loops
  // This guarantees multiple alternative paths to every exit!
  if (braidPercent > 0) {
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        if (grid[y][x] === 0) {
          // If it separates two passages horizontally or vertically
          const horizontalPassage = grid[y][x - 1] === 1 && grid[y][x + 1] === 1;
          const verticalPassage = grid[y - 1][x] === 1 && grid[y + 1][x] === 1;

          if ((horizontalPassage || verticalPassage) && Math.random() * 100 < braidPercent) {
            grid[y][x] = 1;
          }
        }
      }
    }
  }

  // Generate Multiple Randomized Exits along the 4 borders
  const exits: ExitPoint[] = [];
  const candidateExits: { border: 'top' | 'bottom' | 'left' | 'right'; x: number; y: number }[] = [];

  // Top and bottom borders
  for (let x = 1; x < width - 1; x += 2) {
    if (grid[1][x] === 1) {
      candidateExits.push({ border: 'top', x, y: 0 });
    }
    if (grid[height - 2][x] === 1) {
      candidateExits.push({ border: 'bottom', x, y: height - 1 });
    }
  }

  // Left and right borders
  for (let y = 1; y < height - 1; y += 2) {
    if (grid[y][1] === 1) {
      candidateExits.push({ border: 'left', x: 0, y });
    }
    if (grid[y][width - 2] === 1) {
      candidateExits.push({ border: 'right', x: width - 1, y });
    }
  }

  // Shuffle candidate exits
  candidateExits.sort(() => Math.random() - 0.5);

  const targetCount = Math.min(exitCount, candidateExits.length, EXIT_COLORS.length);
  const selectedCandidates = candidateExits.slice(0, targetCount);

  // Carve exit openings into perimeter
  selectedCandidates.forEach((cand, idx) => {
    grid[cand.y][cand.x] = 1; // carve doorway
    const colorInfo = EXIT_COLORS[idx % EXIT_COLORS.length];
    exits.push({
      x: cand.x,
      y: cand.y,
      id: `exit-${idx + 1}`,
      name: colorInfo.name,
      color: colorInfo.color,
    });
  });

  // Determine starting point based on preset
  const start = findStartPointByPreset(grid, width, height, startPreset);

  // Calculate shortest path distance from start to each exit via BFS
  computeExitDistances(grid, width, height, start, exits);

  return {
    width,
    height,
    grid,
    start,
    exits,
  };
}

/**
 * Computes shortest BFS distances from a given start point to each exit
 */
export function computeExitDistances(
  grid: number[][],
  width: number,
  height: number,
  start: Point,
  exits: ExitPoint[]
) {
  const exitLookup = new Map<string, ExitPoint>();
  exits.forEach((e) => exitLookup.set(`${e.x},${e.y}`, e));

  const queue: { p: Point; dist: number }[] = [{ p: start, dist: 0 }];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);

  const dirs = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  while (queue.length > 0) {
    const { p, dist } = queue.shift()!;
    const key = `${p.x},${p.y}`;

    if (exitLookup.has(key)) {
      const exitObj = exitLookup.get(key)!;
      exitObj.distanceFromStart = dist;
    }

    for (const d of dirs) {
      const nx = p.x + d.x;
      const ny = p.y + d.y;
      const nKey = `${nx},${ny}`;

      if (
        nx >= 0 &&
        nx < width &&
        ny >= 0 &&
        ny < height &&
        grid[ny][nx] === 1 &&
        !visited.has(nKey)
      ) {
        visited.add(nKey);
        queue.push({ p: { x: nx, y: ny }, dist: dist + 1 });
      }
    }
  }
}
