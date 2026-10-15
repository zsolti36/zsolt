import { MovingObstacle, MazeData, Point } from '../types/maze';

const OBSTACLE_NAMES = [
  'Sentinel-01',
  'Patrol Drone Beta',
  'Plasma Core',
  'Void Seeker',
  'Pulse Mine',
  'Phantom Guard',
  'Laser Orb',
  'Glitch Hazard',
];

const OBSTACLE_COLORS = [
  '#ef4444', // red
  '#f43f5e', // rose
  '#ec4899', // pink
  '#dc2626', // dark red
  '#e11d48', // ruby
];

/**
 * Initializes randomized moving obstacles inside open corridors of the maze.
 * Ensures obstacles do not spawn right on top of the start point or exit doors.
 */
export function spawnObstacles(maze: MazeData, count: number): MovingObstacle[] {
  if (count <= 0) return [];

  const candidates: Point[] = [];
  const startKey = `${maze.start.x},${maze.start.y}`;
  const exitKeys = new Set(maze.exits.map((e) => `${e.x},${e.y}`));

  // Collect candidate passage cells that are at least 3 steps away from start
  for (let y = 1; y < maze.height - 1; y++) {
    for (let x = 1; x < maze.width - 1; x++) {
      if (maze.grid[y][x] === 1) {
        const key = `${x},${y}`;
        const distFromStart = Math.abs(x - maze.start.x) + Math.abs(y - maze.start.y);

        if (key !== startKey && !exitKeys.has(key) && distFromStart >= 4) {
          candidates.push({ x, y });
        }
      }
    }
  }

  // Shuffle candidates
  candidates.sort(() => Math.random() - 0.5);

  const selected = candidates.slice(0, Math.min(count, candidates.length));
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
  ];

  return selected.map((pt, idx) => {
    const randomDir = dirs[Math.floor(Math.random() * dirs.length)];
    return {
      id: `obstacle-${idx + 1}`,
      name: OBSTACLE_NAMES[idx % OBSTACLE_NAMES.length],
      x: pt.x,
      y: pt.y,
      prevX: pt.x,
      prevY: pt.y,
      dx: randomDir.dx,
      dy: randomDir.dy,
      speedMultiplier: 1,
      color: OBSTACLE_COLORS[idx % OBSTACLE_COLORS.length],
    };
  });
}

/**
 * Updates positions of all moving obstacles within valid maze corridors.
 * Obstacles cannot pass through walls, each other, or player/agent positions.
 */
export function updateObstaclePositions(
  obstacles: MovingObstacle[],
  maze: MazeData,
  solidEntities: Point[] = []
): MovingObstacle[] {
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 2 },
    { dx: -1, dy: 0 },
  ];

  // Set of cells occupied by entities that cannot be passed through
  const occupiedCells = new Set<string>();
  solidEntities.forEach((p) => occupiedCells.add(`${p.x},${p.y}`));

  // Current positions of all obstacles
  const otherObstaclePositions = new Map<string, string>(); // obs.id -> 'x,y'
  obstacles.forEach((o) => otherObstaclePositions.set(o.id, `${o.x},${o.y}`));

  const updated: MovingObstacle[] = [];

  for (const obs of obstacles) {
    const currentX = obs.x;
    const currentY = obs.y;

    // Check possible valid moves that are open passages and not occupied by solid barriers
    const validMoves: { dx: number; dy: number }[] = [];

    const testDirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    for (const d of testDirs) {
      const nx = currentX + d.dx;
      const ny = currentY + d.dy;
      const nKey = `${nx},${ny}`;

      if (
        nx >= 0 &&
        nx < maze.width &&
        ny >= 0 &&
        ny < maze.height &&
        maze.grid[ny][nx] === 1 &&
        !occupiedCells.has(nKey)
      ) {
        // Also check if another already-updated obstacle or un-updated obstacle is there
        const collidesWithOtherObstacle = updated.some((u) => u.x === nx && u.y === ny);
        if (!collidesWithOtherObstacle) {
          validMoves.push(d);
        }
      }
    }

    if (validMoves.length === 0) {
      // Cannot move forward: reverse direction
      updated.push({
        ...obs,
        prevX: currentX,
        prevY: currentY,
        dx: -obs.dx,
        dy: -obs.dy,
      });
      continue;
    }

    // Try to continue straight in the same direction if valid
    const canContinueStraight = validMoves.some(
      (m) => m.dx === obs.dx && m.dy === obs.dy
    );

    let chosenMove: { dx: number; dy: number };

    if (canContinueStraight && Math.random() < 0.75) {
      chosenMove = { dx: obs.dx, dy: obs.dy };
    } else {
      chosenMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    updated.push({
      ...obs,
      prevX: currentX,
      prevY: currentY,
      x: currentX + chosenMove.dx,
      y: currentY + chosenMove.dy,
      dx: chosenMove.dx,
      dy: chosenMove.dy,
    });
  }

  return updated;
}

/**
 * Checks if a point collides with any moving obstacle
 */
export function checkObstacleCollision(
  point: Point,
  obstacles: MovingObstacle[]
): MovingObstacle | null {
  for (const obs of obstacles) {
    if (obs.x === point.x && obs.y === point.y) {
      return obs;
    }
  }
  return null;
}

/**
 * Checks if any obstacle is on the target cell
 */
export function isObstacleAt(point: Point, obstacles: MovingObstacle[]): boolean {
  return obstacles.some((obs) => obs.x === point.x && obs.y === point.y);
}
