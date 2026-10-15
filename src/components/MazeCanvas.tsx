import React, { useEffect, useRef } from 'react';
import { MazeData, Point, ExitPoint, MovingObstacle } from '../types/maze';
import { PathfindingState } from '../utils/pathfinders';

interface MazeCanvasProps {
  maze: MazeData;
  agentState1?: PathfindingState | null; // Primary Agent (e.g. BFS)
  agentState2?: PathfindingState | null; // Secondary Agent (e.g. DFS in race mode)
  playerPos?: Point | null;              // Human player in vs mode
  playerTrail?: Point[];                 // Human player breadcrumb trail
  obstacles?: MovingObstacle[];          // Moving obstacles / hazards
  fogOfWar?: boolean;
  fogRadius?: number;
  highlightExits?: boolean;
  onCellClick?: (point: Point) => void;  // Click square to set start position or move
}

export const MazeCanvas: React.FC<MazeCanvasProps> = ({
  maze,
  agentState1,
  agentState2,
  playerPos,
  playerTrail = [],
  obstacles = [],
  fogOfWar = false,
  fogRadius = 4,
  onCellClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const container = containerRef.current;
    if (!container) return;

    const availableSize = Math.min(container.clientWidth, container.clientHeight, 720);
    const cellSize = Math.floor(availableSize / maze.width);
    const renderWidth = cellSize * maze.width;
    const renderHeight = cellSize * maze.height;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = renderWidth * dpr;
    canvas.height = renderHeight * dpr;
    canvas.style.width = `${renderWidth}px`;
    canvas.style.height = `${renderHeight}px`;

    ctx.scale(dpr, dpr);

    // 1. Draw maze background & passages
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, renderWidth, renderHeight);

    // Draw walls and passages
    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const px = x * cellSize;
        const py = y * cellSize;

        if (maze.grid[y][x] === 0) {
          // Wall
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(px, py, cellSize, cellSize);

          // Subtle wall bevel border
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
        } else {
          // Passage
          ctx.fillStyle = '#030712';
          ctx.fillRect(px, py, cellSize, cellSize);

          // Subtle tech floor pattern
          if (cellSize >= 16) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(px + cellSize / 2 - 1, py + cellSize / 2 - 1, 2, 2);
          }
        }
      }
    }

    // 2. Draw Visited Nodes (Agent 1: Cyan/Blue, Agent 2: Amber/Orange)
    if (agentState1) {
      drawVisitedNodes(ctx, agentState1, cellSize, 'rgba(6, 182, 212, 0.22)', 'rgba(14, 165, 233, 0.45)');
    }
    if (agentState2) {
      drawVisitedNodes(ctx, agentState2, cellSize, 'rgba(245, 158, 11, 0.22)', 'rgba(217, 119, 6, 0.45)');
    }

    // 3. Draw Frontiers
    if (agentState1 && agentState1.frontier.length > 0) {
      drawFrontier(ctx, agentState1.frontier, cellSize, '#38bdf8');
    }
    if (agentState2 && agentState2.frontier.length > 0) {
      drawFrontier(ctx, agentState2.frontier, cellSize, '#f59e0b');
    }

    // 4. Draw Solution Paths if finished
    if (agentState1 && agentState1.solutionPath.length > 1) {
      drawPath(ctx, agentState1.solutionPath, cellSize, '#06b6d4', '#67e8f9');
    }
    if (agentState2 && agentState2.solutionPath.length > 1) {
      drawPath(ctx, agentState2.solutionPath, cellSize, '#f59e0b', '#fde047');
    }

    // 5. Draw Exits (Portals with pulsing aura and distance label)
    maze.exits.forEach((exit) => {
      drawExitPortal(ctx, exit, cellSize);
    });

    // 6. Draw Start Base
    drawStartPoint(ctx, maze.start, cellSize);

    // 7. Draw Agents and Player
    if (agentState1) {
      drawAgent(
        ctx,
        agentState1.currentPos,
        cellSize,
        '#06b6d4',
        '#0284c7',
        agentState1.algorithm.toUpperCase(),
        agentState1.escapedExit !== null
      );
    }
    if (agentState2) {
      drawAgent(
        ctx,
        agentState2.currentPos,
        cellSize,
        '#f59e0b',
        '#d97706',
        agentState2.algorithm.toUpperCase(),
        agentState2.escapedExit !== null
      );
    }
    // 7.5 Draw Player Trail
    if (playerTrail && playerTrail.length > 1) {
      drawPlayerTrail(ctx, playerTrail, cellSize);
    }

    if (playerPos) {
      drawPlayer(ctx, playerPos, cellSize);
    }

    // 8. Draw Moving Obstacles / Hazards
    obstacles.forEach((obs) => {
      drawObstacle(ctx, obs, cellSize);
    });

    // 9. Fog of War effect
    if (fogOfWar) {
      const activePositions: Point[] = [];
      if (agentState1) activePositions.push(agentState1.currentPos);
      if (agentState2) activePositions.push(agentState2.currentPos);
      if (playerPos) activePositions.push(playerPos);

      drawFogOfWar(ctx, renderWidth, renderHeight, cellSize, activePositions, fogRadius);
    }
  }, [maze, agentState1, agentState2, playerPos, playerTrail, obstacles, fogOfWar, fogRadius]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCellClick || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const cellSize = rect.width / maze.width;
    const cellX = Math.floor(clickX / cellSize);
    const cellY = Math.floor(clickY / cellSize);

    if (
      cellX >= 0 &&
      cellX < maze.width &&
      cellY >= 0 &&
      cellY < maze.height &&
      maze.grid[cellY][cellX] === 1
    ) {
      onCellClick({ x: cellX, y: cellY });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center p-2 select-none overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="rounded-xl shadow-2xl border border-slate-800/80 bg-slate-950 transition-all duration-150 cursor-pointer"
        title="Click any passage square to move or set new starting point"
      />
    </div>
  );
};

/* --- Canvas Render Helpers --- */

function drawVisitedNodes(
  ctx: CanvasRenderingContext2D,
  agentState: PathfindingState,
  cellSize: number,
  fillColor: string,
  strokeColor: string
) {
  agentState.visited.forEach((_, key) => {
    const [x, y] = key.split(',').map(Number);
    const px = x * cellSize;
    const py = y * cellSize;

    ctx.fillStyle = fillColor;
    ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

    if (cellSize > 14) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
    }
  });
}

function drawFrontier(
  ctx: CanvasRenderingContext2D,
  frontier: Point[],
  cellSize: number,
  color: string
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, cellSize * 0.1);
  frontier.forEach((p) => {
    const px = p.x * cellSize;
    const py = p.y * cellSize;
    ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
  });
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  path: Point[],
  cellSize: number,
  glowColor: string,
  lineColor: string
) {
  if (path.length < 2) return;

  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = Math.max(3, cellSize * 0.28);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  path.forEach((p, idx) => {
    const cx = p.x * cellSize + cellSize / 2;
    const cy = p.y * cellSize + cellSize / 2;
    if (idx === 0) {
      ctx.moveTo(cx, cy);
    } else {
      ctx.lineTo(cx, cy);
    }
  });
  ctx.stroke();
  ctx.restore();
}

function drawStartPoint(ctx: CanvasRenderingContext2D, start: Point, cellSize: number) {
  const cx = start.x * cellSize + cellSize / 2;
  const cy = start.y * cellSize + cellSize / 2;
  const radius = cellSize * 0.4;

  ctx.save();
  ctx.shadowColor = '#3b82f6';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#1d4ed8';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#60a5fa';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawExitPortal(ctx: CanvasRenderingContext2D, exit: ExitPoint, cellSize: number) {
  const px = exit.x * cellSize;
  const py = exit.y * cellSize;
  const cx = px + cellSize / 2;
  const cy = py + cellSize / 2;
  const radius = cellSize * 0.42;

  ctx.save();
  ctx.shadowColor = exit.color;
  ctx.shadowBlur = 12;

  // Outer portal ring
  ctx.fillStyle = exit.color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Dark core
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
  ctx.fill();

  // Center white star/spark
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // If cell is large enough, write exit letter or distance badge
  if (cellSize >= 20) {
    ctx.font = `bold ${Math.floor(cellSize * 0.38)}px JetBrains Mono, monospace`;
    ctx.fillStyle = exit.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tag = exit.name.split(' ')[1] || 'E';
    ctx.fillText(tag.charAt(0), cx, cy);
  }

  ctx.restore();
}

function drawAgent(
  ctx: CanvasRenderingContext2D,
  pos: Point,
  cellSize: number,
  primaryColor: string,
  secondaryColor: string,
  label: string,
  hasEscaped: boolean
) {
  const cx = pos.x * cellSize + cellSize / 2;
  const cy = pos.y * cellSize + cellSize / 2;
  const radius = cellSize * 0.42;

  ctx.save();
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = hasEscaped ? 18 : 10;

  // Bot outer hull
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Inner visor/chassis
  ctx.fillStyle = secondaryColor;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.68, 0, Math.PI * 2);
  ctx.fill();

  // Glowing center eye / visor
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Label text if size permits
  if (cellSize >= 24) {
    ctx.font = `800 ${Math.floor(cellSize * 0.32)}px JetBrains Mono, monospace`;
    ctx.fillStyle = '#030712';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 3), cx, cy);
  }

  ctx.restore();
}

function drawPlayerTrail(ctx: CanvasRenderingContext2D, trail: Point[], cellSize: number) {
  if (trail.length < 2) return;

  ctx.save();
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
  ctx.lineWidth = Math.max(2, cellSize * 0.16);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  trail.forEach((p, idx) => {
    const cx = p.x * cellSize + cellSize / 2;
    const cy = p.y * cellSize + cellSize / 2;
    if (idx === 0) {
      ctx.moveTo(cx, cy);
    } else {
      ctx.lineTo(cx, cy);
    }
  });
  ctx.stroke();

  // Draw breadcrumb footprints
  ctx.fillStyle = '#4ade80';
  trail.forEach((p) => {
    const cx = p.x * cellSize + cellSize / 2;
    const cy = p.y * cellSize + cellSize / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1.5, cellSize * 0.08), 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, pos: Point, cellSize: number) {
  const cx = pos.x * cellSize + cellSize / 2;
  const cy = pos.y * cellSize + cellSize / 2;
  const radius = cellSize * 0.42;

  ctx.save();
  ctx.shadowColor = '#22c55e';
  ctx.shadowBlur = 12;

  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#14532d';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(cellSize * 0.4)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('YOU', cx, cy);

  ctx.restore();
}

function drawFogOfWar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number,
  positions: Point[],
  radiusInCells: number
) {
  ctx.save();
  // We use destination-out composite operation to carve visibility holes in a black overlay
  const fogCanvas = document.createElement('canvas');
  fogCanvas.width = width;
  fogCanvas.height = height;
  const fCtx = fogCanvas.getContext('2d');
  if (!fCtx) return;

  fCtx.fillStyle = 'rgba(3, 7, 18, 0.94)';
  fCtx.fillRect(0, 0, width, height);

  fCtx.globalCompositeOperation = 'destination-out';

  positions.forEach((p) => {
    const cx = p.x * cellSize + cellSize / 2;
    const cy = p.y * cellSize + cellSize / 2;
    const gradRadius = radiusInCells * cellSize;

    const grad = fCtx.createRadialGradient(cx, cy, gradRadius * 0.3, cx, cy, gradRadius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.85)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    fCtx.fillStyle = grad;
    fCtx.beginPath();
    fCtx.arc(cx, cy, gradRadius, 0, Math.PI * 2);
    fCtx.fill();
  });

  ctx.drawImage(fogCanvas, 0, 0);
  ctx.restore();
}

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  obs: MovingObstacle,
  cellSize: number
) {
  const px = obs.x * cellSize;
  const py = obs.y * cellSize;
  const cx = px + cellSize / 2;
  const cy = py + cellSize / 2;
  const radius = cellSize * 0.42;

  ctx.save();

  // Solid Impassable Barrier Forcefield (fills the grid cell perimeter)
  ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
  ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

  // Impassable Barrier Border
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 2]);
  ctx.strokeRect(px + 1.5, py + 1.5, cellSize - 3, cellSize - 3);
  ctx.setLineDash([]); // Reset dash

  // Corner barrier brackets
  const bracketSize = Math.max(3, cellSize * 0.2);
  ctx.strokeStyle = '#f87171';
  ctx.lineWidth = 2;
  // Top-left bracket
  ctx.beginPath();
  ctx.moveTo(px + bracketSize, py + 2);
  ctx.lineTo(px + 2, py + 2);
  ctx.lineTo(px + 2, py + bracketSize);
  // Bottom-right bracket
  ctx.moveTo(px + cellSize - bracketSize, py + cellSize - 2);
  ctx.lineTo(px + cellSize - 2, py + cellSize - 2);
  ctx.lineTo(px + cellSize - 2, py + cellSize - bracketSize);
  ctx.stroke();

  // Pulsing danger outer glow
  ctx.shadowColor = obs.color || '#ef4444';
  ctx.shadowBlur = 12;

  // Outer red warning ring
  ctx.strokeStyle = obs.color || '#ef4444';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
  ctx.stroke();

  // Dark metallic hazard chassis
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Glowing red plasma core
  ctx.fillStyle = obs.color || '#ef4444';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
  ctx.fill();

  // Center white hot laser eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // Rotating hazard spikes/crosshair
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  const spikeLen = radius * 0.85;

  ctx.beginPath();
  // Horizontal crosshair
  ctx.moveTo(cx - spikeLen, cy);
  ctx.lineTo(cx + spikeLen, cy);
  // Vertical crosshair
  ctx.moveTo(cx, cy - spikeLen);
  ctx.lineTo(cx, cy + spikeLen);
  ctx.stroke();

  ctx.restore();
}
