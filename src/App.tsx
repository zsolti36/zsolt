import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MazeData,
  GameSettings,
  GameStatus,
  Point,
  ExitPoint,
  MovingObstacle,
  StartLocationPreset,
} from './types/maze';
import {
  generateMaze,
  findStartPointByPreset,
  computeExitDistances,
} from './utils/mazeGenerator';
import {
  PathfindingState,
  createPathfindingState,
  stepPathfinding,
  solveInstant,
  solveFromPoint,
} from './utils/pathfinders';
import { spawnObstacles, updateObstaclePositions, checkObstacleCollision } from './utils/obstacles';
import { soundManager } from './utils/audio';
import { MazeCanvas } from './components/MazeCanvas';
import { TimerHUD } from './components/TimerHUD';
import { ControlPanel } from './components/ControlPanel';
import { AlgorithmInspector } from './components/AlgorithmInspector';
import { GameOverModal } from './components/GameOverModal';
import { ManualControls } from './components/ManualControls';
import { Compass, Cpu, ShieldAlert, Zap, User, Target, Footprints } from 'lucide-react';

const DEFAULT_SETTINGS: GameSettings = {
  gridSize: 25,
  exitCount: 4,
  durationSeconds: 300, // 5 minutes standard countdown timer
  speedMs: 25,
  braidPercent: 25,
  algorithm: 'bfs',
  gameMode: 'human_solo', // Default to interactive Human Player mode
  fogOfWar: false,
  soundEnabled: true,
  obstacleCount: 4, // 4 moving hazards by default
  obstacleSpeed: 'normal',
  startPreset: 'center',
};

export default function App() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [maze, setMaze] = useState<MazeData>(() =>
    generateMaze(
      DEFAULT_SETTINGS.gridSize,
      DEFAULT_SETTINGS.exitCount,
      DEFAULT_SETTINGS.braidPercent,
      DEFAULT_SETTINGS.startPreset
    )
  );

  const [obstacles, setObstacles] = useState<MovingObstacle[]>(() =>
    spawnObstacles(maze, DEFAULT_SETTINGS.obstacleCount)
  );

  const [agent1, setAgent1] = useState<PathfindingState | null>(null);
  const [agent2, setAgent2] = useState<PathfindingState | null>(null);
  const [playerPos, setPlayerPos] = useState<Point | null>(null);
  const [playerTrail, setPlayerTrail] = useState<Point[]>([]);
  const [playerSteps, setPlayerSteps] = useState<number>(0);
  const [victorName, setVictorName] = useState<string>('');

  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_SETTINGS.durationSeconds);
  const [escapedExit, setEscapedExit] = useState<ExitPoint | null>(null);
  const [timeTaken, setTimeTaken] = useState<number>(0);
  const [hazardAlert, setHazardAlert] = useState<string | null>(null);

  // References for requestAnimationFrame game loop & intervals
  const animFrameRef = useRef<number | null>(null);
  const lastStepTimeRef = useRef<number>(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const mazeRef = useRef(maze);
  mazeRef.current = maze;

  const obstaclesRef = useRef(obstacles);
  obstaclesRef.current = obstacles;

  const agent1Ref = useRef(agent1);
  agent1Ref.current = agent1;

  const playerPosRef = useRef(playerPos);
  playerPosRef.current = playerPos;

  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerHazardAlert = useCallback((message: string) => {
    setHazardAlert(message);
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
    alertTimeoutRef.current = setTimeout(() => {
      setHazardAlert(null);
    }, 2400);
  }, []);

  // Initialize Agents and Player based on Maze Start and Mode
  const initAgents = useCallback(
    (currentMaze: MazeData, currentSettings: GameSettings) => {
      const isHumanMode =
        currentSettings.gameMode === 'human_solo' || currentSettings.gameMode === 'human_vs_ai';

      // Setup Human Player
      if (isHumanMode) {
        setPlayerPos({ ...currentMaze.start });
        setPlayerTrail([{ ...currentMaze.start }]);
        setPlayerSteps(0);
      } else {
        setPlayerPos(null);
        setPlayerTrail([]);
        setPlayerSteps(0);
      }

      // Setup AI Agent 1 (for ai_only, race, or human_vs_ai)
      if (currentSettings.gameMode !== 'human_solo') {
        const a1 = createPathfindingState(
          currentMaze.start,
          currentSettings.gameMode === 'race_bfs_dfs' ? 'bfs' : currentSettings.algorithm
        );
        setAgent1(a1);
      } else {
        setAgent1(null);
      }

      // Setup AI Agent 2 (only for race_bfs_dfs)
      if (currentSettings.gameMode === 'race_bfs_dfs') {
        const a2 = createPathfindingState(currentMaze.start, 'dfs');
        setAgent2(a2);
      } else {
        setAgent2(null);
      }

      setTimeLeft(currentSettings.durationSeconds);
      setGameStatus('idle');
      setEscapedExit(null);
      setVictorName('');
      setTimeTaken(0);
      setHazardAlert(null);
    },
    []
  );

  // Initialize on mount
  useEffect(() => {
    initAgents(maze, settings);
  }, [initAgents]);

  // Handle New Maze Generation
  const handleGenerateNewMaze = useCallback(() => {
    const newMaze = generateMaze(
      settings.gridSize,
      settings.exitCount,
      settings.braidPercent,
      settings.startPreset
    );
    setMaze(newMaze);
    const newObs = spawnObstacles(newMaze, settings.obstacleCount);
    setObstacles(newObs);
    initAgents(newMaze, settings);
  }, [settings, initAgents]);

  // Reset current maze agents & player back to start
  const handleReset = useCallback(() => {
    const freshObs = spawnObstacles(maze, settings.obstacleCount);
    setObstacles(freshObs);
    initAgents(maze, settings);
  }, [maze, settings, initAgents]);

  // Toggle Sound
  const handleToggleSound = useCallback(() => {
    setSettings((prev) => {
      const next = !prev.soundEnabled;
      soundManager.enabled = next;
      return { ...prev, soundEnabled: next };
    });
  }, []);

  // Set Starting Position directly by clicking on canvas passage square
  const handleCellClick = useCallback(
    (cell: Point) => {
      // Set cell as the starting point
      const updatedGrid = mazeRef.current.grid;
      const updatedExits = [...mazeRef.current.exits];
      computeExitDistances(
        updatedGrid,
        mazeRef.current.width,
        mazeRef.current.height,
        cell,
        updatedExits
      );

      const updatedMaze: MazeData = {
        ...mazeRef.current,
        start: cell,
        exits: updatedExits,
      };

      setMaze(updatedMaze);
      setSettings((s) => ({ ...s, startPreset: 'custom' }));
      initAgents(updatedMaze, settingsRef.current);
      triggerHazardAlert(`Starting point set to (${cell.x}, ${cell.y})!`);
      soundManager.playClick();
    },
    [initAgents, triggerHazardAlert]
  );

  // Update Settings (including Starting Point presets and Game Modes)
  const handleUpdateSettings = useCallback(
    (newSettings: Partial<GameSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        const needsRegeneration =
          newSettings.gridSize !== undefined && newSettings.gridSize !== prev.gridSize;
        const needsExitRegen =
          newSettings.exitCount !== undefined && newSettings.exitCount !== prev.exitCount;

        if (needsRegeneration || needsExitRegen) {
          const newMaze = generateMaze(
            updated.gridSize,
            updated.exitCount,
            updated.braidPercent,
            updated.startPreset
          );
          setMaze(newMaze);
          const newObs = spawnObstacles(newMaze, updated.obstacleCount);
          setObstacles(newObs);
          initAgents(newMaze, updated);
        } else if (
          newSettings.startPreset !== undefined &&
          newSettings.startPreset !== prev.startPreset &&
          newSettings.startPreset !== 'custom'
        ) {
          // Relocate start point inside existing maze
          const newStart = findStartPointByPreset(
            mazeRef.current.grid,
            mazeRef.current.width,
            mazeRef.current.height,
            newSettings.startPreset as StartLocationPreset
          );

          const updatedExits = [...mazeRef.current.exits];
          computeExitDistances(
            mazeRef.current.grid,
            mazeRef.current.width,
            mazeRef.current.height,
            newStart,
            updatedExits
          );

          const updatedMaze: MazeData = {
            ...mazeRef.current,
            start: newStart,
            exits: updatedExits,
          };
          setMaze(updatedMaze);
          initAgents(updatedMaze, updated);
          triggerHazardAlert(`Start relocated to ${newSettings.startPreset.replace('_', ' ')}!`);
        } else if (
          newSettings.obstacleCount !== undefined &&
          newSettings.obstacleCount !== prev.obstacleCount
        ) {
          const newObs = spawnObstacles(mazeRef.current, updated.obstacleCount);
          setObstacles(newObs);
        } else if (
          newSettings.algorithm !== undefined ||
          newSettings.gameMode !== undefined ||
          newSettings.durationSeconds !== undefined
        ) {
          initAgents(mazeRef.current, updated);
        }

        return updated;
      });
    },
    [initAgents, triggerHazardAlert]
  );

  // Instant Solve Preview (incorporating current moving obstacles as dynamic blocked cells)
  const handleInstantSolve = useCallback(() => {
    const blockedCells = new Set(obstaclesRef.current.map((o) => `${o.x},${o.y}`));
    const res = solveInstant(maze, settings.algorithm, blockedCells);
    const targetExit = res.escapedExit;
    if (targetExit) {
      setAgent1((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          isFinished: true,
          solutionPath: res.solutionPath,
          escapedExit: targetExit,
          nodesExpanded: res.nodesExpanded,
          currentPos: { x: targetExit.x, y: targetExit.y },
        };
      });
      setEscapedExit(targetExit);
      setVictorName(`AI Agent (${settings.algorithm.toUpperCase()})`);
      setGameStatus('escaped');
      soundManager.playExitFound();
    }
  }, [maze, settings.algorithm]);

  // Play / Pause Toggle
  const handleTogglePlayPause = useCallback(() => {
    if (gameStatus === 'running') {
      setGameStatus('paused');
    } else if (gameStatus === 'idle' || gameStatus === 'paused') {
      soundManager.playClick();
      setGameStatus('running');
    }
  }, [gameStatus]);

  // 5-Minute Timer Countdown effect
  useEffect(() => {
    if (gameStatus !== 'running') return;

    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          setGameStatus('timeout');
          soundManager.playTimeout();
          return 0;
        }

        // Warning tick in the last 10 seconds
        if (prev <= 11) {
          soundManager.playTick();
        }

        return prev - 1;
      });

      setTimeTaken((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [gameStatus]);

  // Moving Obstacles Patrol & Collision Loop
  useEffect(() => {
    if (gameStatus !== 'running' || settings.obstacleCount === 0) return;

    const speedMap = {
      slow: 460,
      normal: 270,
      fast: 150,
    };
    const intervalMs = speedMap[settings.obstacleSpeed] || 270;

    const obstacleInterval = setInterval(() => {
      setObstacles((prevObs) => {
        // Obstacles cannot pass through player or AI agent
        const solidEntities: Point[] = [];
        if (playerPosRef.current) solidEntities.push(playerPosRef.current);
        if (agent1Ref.current && !agent1Ref.current.isFinished) {
          solidEntities.push(agent1Ref.current.currentPos);
        }

        const moved = updateObstaclePositions(prevObs, mazeRef.current, solidEntities);

        // 2. Collision with AI Agent 1
        if (agent1Ref.current && !agent1Ref.current.isFinished) {
          const colAgent = checkObstacleCollision(agent1Ref.current.currentPos, moved);
          if (colAgent) {
            soundManager.playHazardCollision();
            soundManager.playRerouteAlert();
            setTimeLeft((t) => Math.max(0, t - 5)); // 5s penalty
            triggerHazardAlert(`Agent intercepted by ${colAgent.name}! Dynamic Reroute!`);

            // Dynamically recalculate path detour avoiding moving obstacle
            const blocked = new Set(moved.map((o) => `${o.x},${o.y}`));
            const detour = solveFromPoint(
              agent1Ref.current.currentPos,
              mazeRef.current,
              agent1Ref.current.algorithm,
              blocked
            );

            if (detour.solutionPath.length > 0) {
              setAgent1((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  solutionPath: detour.solutionPath,
                  escapedExit: detour.escapedExit,
                  queue: detour.solutionPath.slice(1),
                  frontier: detour.solutionPath.slice(1, 4),
                };
              });
            }
          }
        }

        return moved;
      });
    }, intervalMs);

    return () => clearInterval(obstacleInterval);
  }, [gameStatus, settings.obstacleCount, settings.obstacleSpeed, triggerHazardAlert]);

  // AI Pathfinding Animation Loop (Only active when AI is running)
  useEffect(() => {
    if (gameStatus !== 'running' || settings.gameMode === 'human_solo') {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const stepLoop = (timestamp: number) => {
      const currentSpeed = settingsRef.current.speedMs;

      if (timestamp - lastStepTimeRef.current >= currentSpeed) {
        lastStepTimeRef.current = timestamp;

        // In turbo mode (speed <= 5ms), execute batch steps per frame for high throughput
        const batchSize = currentSpeed <= 5 ? 4 : 1;

        let finished = false;
        let victorExit: ExitPoint | null = null;
        let winningAgentName = `AI Agent (${settingsRef.current.algorithm.toUpperCase()})`;

        // Dynamic blocked cells from moving obstacles
        const blockedCells = new Set(obstaclesRef.current.map((o) => `${o.x},${o.y}`));

        // Step Agent 1
        setAgent1((prev) => {
          if (!prev || prev.isFinished) return prev;
          const clone: PathfindingState = {
            ...prev,
            queue: [...prev.queue],
            stack: [...prev.stack],
            aStarOpen: [...prev.aStarOpen],
            visited: new Map(prev.visited),
            visitedOrder: [...prev.visitedOrder],
            parentMap: new Map(prev.parentMap),
            aStarGScore: new Map(prev.aStarGScore),
          };

          for (let i = 0; i < batchSize; i++) {
            const done = stepPathfinding(clone, mazeRef.current, blockedCells);
            if (done) {
              finished = true;
              if (clone.escapedExit) {
                victorExit = clone.escapedExit;
                winningAgentName = settingsRef.current.gameMode === 'race_bfs_dfs' ? 'BFS Bot' : `AI Agent (${clone.algorithm.toUpperCase()})`;
              }
              break;
            }
          }
          return clone;
        });

        // Step Agent 2 (if in Race Mode)
        if (settingsRef.current.gameMode === 'race_bfs_dfs') {
          setAgent2((prev) => {
            if (!prev || prev.isFinished) return prev;
            const clone: PathfindingState = {
              ...prev,
              queue: [...prev.queue],
              stack: [...prev.stack],
              aStarOpen: [...prev.aStarOpen],
              visited: new Map(prev.visited),
              visitedOrder: [...prev.visitedOrder],
              parentMap: new Map(prev.parentMap),
              aStarGScore: new Map(prev.aStarGScore),
            };

            for (let i = 0; i < batchSize; i++) {
              const done = stepPathfinding(clone, mazeRef.current, blockedCells);
              if (done) {
                finished = true;
                if (!victorExit && clone.escapedExit) {
                  victorExit = clone.escapedExit;
                  winningAgentName = 'DFS Bot';
                }
                break;
              }
            }
            return clone;
          });
        }

        if (finished && victorExit) {
          setEscapedExit(victorExit);
          setVictorName(winningAgentName);
          setGameStatus('escaped');
          soundManager.playExitFound();
          return;
        }
      }

      animFrameRef.current = requestAnimationFrame(stepLoop);
    };

    animFrameRef.current = requestAnimationFrame(stepLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [gameStatus, settings.gameMode]);

  // Square-by-Square Human Player Movement Handler
  const handleMovePlayer = useCallback(
    (dx: number, dy: number) => {
      if (gameStatus !== 'running' && gameStatus !== 'idle') return;
      if (!playerPos) return;

      const nx = playerPos.x + dx;
      const ny = playerPos.y + dy;

      // Check wall boundary (square-by-square)
      if (
        nx >= 0 &&
        nx < maze.width &&
        ny >= 0 &&
        ny < maze.height &&
        maze.grid[ny][nx] === 1
      ) {
        // Check moving obstacle impassability: CANNOT BE PASSED THROUGH!
        const col = checkObstacleCollision({ x: nx, y: ny }, obstaclesRef.current);
        if (col) {
          soundManager.playBarrierBlocked();
          soundManager.playHazardCollision();
          setTimeLeft((t) => Math.max(0, t - 5)); // Penalty for bumping barrier
          triggerHazardAlert(`BLOCKED! ${col.name} is a solid hazard and cannot be passed through!`);
          return; // Strictly stop: player cannot move into or pass through the obstacle
        }

        const newPt = { x: nx, y: ny };
        setPlayerPos(newPt);
        setPlayerTrail((prev) => [...prev, newPt]);
        setPlayerSteps((s) => s + 1);
        soundManager.playStep(true);

        if (gameStatus === 'idle') {
          setGameStatus('running');
        }

        // Check if reached exit portal
        const exitFound = maze.exits.find((e) => e.x === nx && e.y === ny);
        if (exitFound) {
          setEscapedExit(exitFound);
          setVictorName('Human Player (You)');
          setGameStatus('escaped');
          soundManager.playExitFound();
        }
      }
    },
    [gameStatus, playerPos, maze, triggerHazardAlert]
  );

  // Keyboard navigation for Human Player (WASD / Arrows)
  useEffect(() => {
    const isHumanMode =
      settings.gameMode === 'human_solo' || settings.gameMode === 'human_vs_ai';

    if (!isHumanMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleMovePlayer(0, -1);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleMovePlayer(0, 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleMovePlayer(-1, 0);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleMovePlayer(1, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.gameMode, handleMovePlayer]);

  // Total passages count for HUD
  const totalMazePassages = maze.grid.reduce(
    (sum, row) => sum + row.filter((c) => c === 1).length,
    0
  );

  const isHumanActive =
    settings.gameMode === 'human_solo' || settings.gameMode === 'human_vs_ai';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <Compass className="w-5 h-5 text-white animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>MAZE ESCAPE</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {settings.gameMode === 'human_solo'
                    ? 'HUMAN SOLO ESCAPE'
                    : settings.gameMode === 'human_vs_ai'
                    ? 'HUMAN VS AI'
                    : 'BFS • DFS • A*'}
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Multiple randomized exits • 5-minute countdown • Moving obstacles & customizable starting points
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isHumanActive && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                <Footprints className="w-3.5 h-3.5" />
                <span className="font-semibold">{playerSteps} Squares</span>
              </div>
            )}
            {settings.obstacleCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
                <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                <span className="font-semibold">{settings.obstacleCount} Hazards</span>
              </div>
            )}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Start:</span>
              <span className="text-cyan-300 font-bold uppercase">
                {settings.startPreset === 'custom'
                  ? `(${maze.start.x}, ${maze.start.y})`
                  : settings.startPreset.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col lg:flex-row gap-5 items-start">
        {/* Left / Center: Maze Canvas & Timer */}
        <div className="flex-1 w-full flex flex-col gap-4">
          {/* Hazard Alert Banner */}
          {hazardAlert && (
            <div className="bg-rose-500/20 border border-rose-500/50 text-rose-200 px-4 py-2.5 rounded-xl text-xs font-bold font-mono flex items-center gap-2 shadow-lg animate-bounce">
              <Zap className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{hazardAlert}</span>
            </div>
          )}

          {/* 5-Minute Countdown Timer HUD */}
          <TimerHUD
            timeLeftSeconds={timeLeft}
            totalDurationSeconds={settings.durationSeconds}
            gameStatus={gameStatus}
            soundEnabled={settings.soundEnabled}
            onTogglePlayPause={handleTogglePlayPause}
            onReset={handleReset}
            onToggleSound={handleToggleSound}
            onSelectDuration={(sec) => handleUpdateSettings({ durationSeconds: sec })}
          />

          {/* Interactive Maze Viewport */}
          <div className="w-full aspect-square max-h-[720px] bg-slate-900/40 rounded-2xl border border-slate-800/80 shadow-2xl relative flex items-center justify-center overflow-hidden">
            <MazeCanvas
              maze={maze}
              agentState1={agent1}
              agentState2={agent2}
              playerPos={playerPos}
              playerTrail={playerTrail}
              obstacles={obstacles}
              fogOfWar={settings.fogOfWar}
              fogRadius={4}
              onCellClick={handleCellClick}
            />

            {/* Helper status overlay */}
            {gameStatus === 'idle' && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-slate-950/85 border border-slate-800 text-xs font-semibold text-slate-300 backdrop-blur-md shadow-lg pointer-events-none flex items-center gap-2">
                {isHumanActive ? (
                  <>
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Use Keyboard Arrow Keys / WASD to move square-by-square! Click any square to move start point.</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Press "Start Escape" or click any square to set custom starting point.</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile On-Screen D-Pad for Touch Screens */}
          {isHumanActive && (
            <div className="sm:hidden flex justify-center">
              <ManualControls
                onMove={handleMovePlayer}
                disabled={gameStatus !== 'running' && gameStatus !== 'idle'}
              />
            </div>
          )}
        </div>

        {/* Right Sidebar: Controls & Live Algorithm Telemetry */}
        <div className="w-full lg:w-96 flex flex-col gap-4">
          {/* Control Panel: Game Modes, Starting Points, Exits, Hazards */}
          <ControlPanel
            settings={settings}
            onChangeSettings={handleUpdateSettings}
            onGenerateNewMaze={handleGenerateNewMaze}
            onInstantSolve={handleInstantSolve}
            exits={maze.exits}
          />

          {/* If Human Solo or vs AI mode, show on-screen controls and quick instructions */}
          {isHumanActive && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  Human Navigation Controls
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {playerSteps} Squares Moved
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Move square-by-square using <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-200 font-mono text-[10px]">Arrow Keys</kbd> or <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-200 font-mono text-[10px]">WASD</kbd>. Dodge moving hazards and reach an exit before the 5 minutes expire!
              </p>
              <div className="flex justify-center pt-1">
                <ManualControls
                  onMove={handleMovePlayer}
                  disabled={gameStatus !== 'running' && gameStatus !== 'idle'}
                />
              </div>
            </div>
          )}

          {/* Algorithm Inspector & Live State (when AI is enabled) */}
          {settings.gameMode !== 'human_solo' && (
            <AlgorithmInspector
              agentState1={agent1}
              agentState2={agent2}
              gameMode={settings.gameMode}
              totalMazePassages={totalMazePassages}
            />
          )}
        </div>
      </main>

      {/* Game Over / Victory Modal */}
      <GameOverModal
        status={gameStatus}
        escapedExit={escapedExit}
        timeTakenSeconds={timeTaken}
        totalNodesExplored={agent1 ? agent1.nodesExpanded : playerSteps}
        pathLength={isHumanActive ? playerSteps : agent1?.solutionPath ? agent1.solutionPath.length : 0}
        algorithmName={
          settings.gameMode === 'human_solo'
            ? 'Human Navigation'
            : settings.gameMode === 'race_bfs_dfs'
            ? 'BFS vs DFS Race'
            : settings.algorithm.toUpperCase()
        }
        victorName={victorName}
        onPlayAgain={handleReset}
        onNewMaze={handleGenerateNewMaze}
      />
    </div>
  );
}
