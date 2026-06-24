'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type CellType = 'empty' | 'wall' | 'sand' | 'water' | 'start' | 'end' | 'visited' | 'frontier' | 'path';
type Algo = 'astar' | 'dijkstra' | 'bfs' | 'greedy';

const COLS = 30, ROWS = 22;
const CELL_COST: Record<CellType, number> = { empty: 1, sand: 3, water: 8, wall: Infinity, start: 1, end: 1, visited: 1, frontier: 1, path: 1 };
const CELL_COLOR: Record<CellType, string> = {
  empty: '#080f1e', wall: '#1a2236', sand: '#2d1f0a', water: '#0a1a2e',
  start: '#10d98a', end: '#f59e0b', visited: '#0d2d52', frontier: '#2d1045',
  path: '#fde047',
};
const TERRAIN_CYCLE: CellType[] = ['empty', 'sand', 'water', 'wall'];

interface GridState {
  cells: CellType[][];
  start: { r: number; c: number };
  end: { r: number; c: number };
}

interface SearchNode { f: number; g: number; r: number; c: number; }
interface SearchState {
  open: SearchNode[];
  closed: boolean[][];
  dist: number[][];
  parent: ({ r: number; c: number } | null)[][];
  done: boolean; found: boolean;
  visitedCount: number;
  pathCost: number;
}

function heuristic(algo: Algo, r: number, c: number, er: number, ec: number): number {
  if (algo === 'astar') return Math.abs(r - er) + Math.abs(c - ec);
  if (algo === 'greedy') return Math.abs(r - er) + Math.abs(c - ec);
  return 0;
}

function initSearch(grid: GridState, algo: Algo): SearchState {
  const { start, end } = grid;
  const dist = Array.from({ length: ROWS }, () => new Array(COLS).fill(Infinity));
  const parent = Array.from({ length: ROWS }, () => new Array<{ r: number; c: number } | null>(COLS).fill(null));
  const closed = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  dist[start.r][start.c] = 0;
  const h = heuristic(algo, start.r, start.c, end.r, end.c);
  return {
    open: [{ f: h, g: 0, r: start.r, c: start.c }],
    closed, dist, parent,
    done: false, found: false, visitedCount: 0, pathCost: 0,
  };
}

function stepSearch(ss: SearchState, grid: GridState, algo: Algo): boolean {
  if (ss.done || ss.open.length === 0) { ss.done = true; return false; }
  ss.open.sort((a, b) => a.f - b.f || a.g - b.g);
  const cur = ss.open.shift()!;
  const { r, c } = cur;
  if (ss.closed[r][c]) return true;
  ss.closed[r][c] = true;
  ss.visitedCount++;

  const { end } = grid;
  if (r === end.r && c === end.c) {
    ss.done = true; ss.found = true;
    ss.pathCost = cur.g;
    return false;
  }

  const { start } = grid;
  const cell = grid.cells[r][c];
  if (!(r === start.r && c === start.c) && !(r === end.r && c === end.c)) {
    grid.cells[r][c] = 'visited';
  }

  for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
    if (ss.closed[nr][nc]) continue;
    const ncell = grid.cells[nr][nc];
    if (ncell === 'wall') continue;
    const moveCost = CELL_COST[ncell] ?? 1;
    const ng = ss.dist[r][c] + moveCost;
    if (ng < ss.dist[nr][nc]) {
      ss.dist[nr][nc] = ng;
      ss.parent[nr][nc] = { r, c };
      const h = algo === 'greedy' ? heuristic(algo, nr, nc, end.r, end.c) : heuristic(algo, nr, nc, end.r, end.c);
      const f = algo === 'greedy' ? h : ng + h;
      ss.open.push({ f, g: ng, r: nr, c: nc });
      if (!(nr === start.r && nc === start.c) && !(nr === end.r && nc === end.c)) {
        grid.cells[nr][nc] = 'frontier';
      }
    }
  }
  return !ss.done;
}

function tracePath(ss: SearchState, grid: GridState): number {
  const { end, start } = grid;
  let { r, c } = end;
  let steps = 0;
  while (ss.parent[r][c]) {
    const p = ss.parent[r][c]!;
    if (!(r === start.r && c === start.c) && !(r === end.r && c === end.c)) grid.cells[r][c] = 'path';
    r = p.r; c = p.c; steps++;
  }
  return steps;
}

function makeGrid(): GridState {
  return {
    cells: Array.from({ length: ROWS }, () => new Array<CellType>(COLS).fill('empty')),
    start: { r: Math.floor(ROWS / 2), c: 2 },
    end: { r: Math.floor(ROWS / 2), c: COLS - 3 },
  };
}

export default function PathfindingLab({ onPuzzleComplete }: { onPuzzleComplete?: (route1: number, route2: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<GridState>(makeGrid());
  const searchRef = useRef<SearchState | null>(null);
  const runRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paintRef = useRef(false);
  const [algo, setAlgo] = useState<Algo>('astar');
  const [placeMode, setPlaceMode] = useState<'start' | 'end' | null>(null);
  const [stats, setStats] = useState({ visited: 0, pathLen: 0, pathCost: 0, status: 'Ready' });
  const [speed, setSpeed] = useState(20);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const cw = W / COLS, ch = H / ROWS;
    const grid = gridRef.current;

    ctx.clearRect(0, 0, W, H);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid.cells[r][c];
        ctx.fillStyle = CELL_COLOR[cell] ?? CELL_COLOR.empty;
        ctx.fillRect(c * cw + 0.5, r * ch + 0.5, cw - 1, ch - 1);
      }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(59,130,246,0.05)';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * cw, 0); ctx.lineTo(c * cw, H); ctx.stroke(); }
    for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * ch); ctx.lineTo(W, r * ch); ctx.stroke(); }

    // Glow start/end
    [
      { pos: grid.start, color: '#10d98a' },
      { pos: grid.end, color: '#f59e0b' },
    ].forEach(({ pos, color }) => {
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.c * cw + cw / 2, pos.r * ch + ch / 2, Math.min(cw, ch) * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, []);

  useEffect(() => {
    const g = gridRef.current;
    g.cells[g.start.r][g.start.c] = 'start';
    g.cells[g.end.r][g.end.c] = 'end';
    draw();
  }, [draw]);

  const clearPath = useCallback(() => {
    runRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
    searchRef.current = null;
    const g = gridRef.current;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (['visited', 'frontier', 'path'].includes(g.cells[r][c])) g.cells[r][c] = 'empty';
    setStats({ visited: 0, pathLen: 0, pathCost: 0, status: 'Ready' });
    draw();
  }, [draw]);

  const clearAll = useCallback(() => {
    gridRef.current = makeGrid();
    const g = gridRef.current;
    g.cells[g.start.r][g.start.c] = 'start';
    g.cells[g.end.r][g.end.c] = 'end';
    clearPath();
  }, [clearPath]);

  const getCell = (e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const scX = canvas.width / r.width, scY = canvas.height / r.height;
    const x = (e.clientX - r.left) * scX;
    const y = (e.clientY - r.top) * scY;
    const c = Math.floor(x / (canvas.width / COLS));
    const row = Math.floor(y / (canvas.height / ROWS));
    if (row < 0 || row >= ROWS || c < 0 || c >= COLS) return null;
    return { r: row, c };
  };

  const paintCell = (cell: { r: number; c: number } | null) => {
    if (!cell) return;
    const g = gridRef.current;
    if ((cell.r === g.start.r && cell.c === g.start.c) || (cell.r === g.end.r && cell.c === g.end.c)) return;
    const cur = g.cells[cell.r][cell.c];
    if (!TERRAIN_CYCLE.includes(cur as CellType)) return;
    const idx = TERRAIN_CYCLE.indexOf(cur as CellType);
    g.cells[cell.r][cell.c] = TERRAIN_CYCLE[(idx + 1) % TERRAIN_CYCLE.length];
    draw();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const cell = getCell(e);
    if (!cell) return;
    const g = gridRef.current;
    if (placeMode) {
      if (placeMode === 'start') {
        g.cells[g.start.r][g.start.c] = 'empty';
        g.start = cell; g.cells[cell.r][cell.c] = 'start';
      } else {
        g.cells[g.end.r][g.end.c] = 'empty';
        g.end = cell; g.cells[cell.r][cell.c] = 'end';
      }
      setPlaceMode(null);
      clearPath();
      return;
    }
    paintRef.current = true;
    paintCell(cell);
  };

  const runSearch = useCallback(() => {
    if (!searchRef.current) {
      const g = gridRef.current;
      // Restore terrain under visited/frontier/path
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (['visited','frontier','path'].includes(g.cells[r][c])) g.cells[r][c] = 'empty';
      g.cells[g.start.r][g.start.c] = 'start';
      g.cells[g.end.r][g.end.c] = 'end';
      searchRef.current = initSearch(g, algo);
    }
    const ss = searchRef.current;
    if (ss.done) return;

    if (intervalRef.current) clearInterval(intervalRef.current);
    runRef.current = true;
    intervalRef.current = setInterval(() => {
      const cont = stepSearch(ss, gridRef.current, algo);
      setStats({ visited: ss.visitedCount, pathLen: 0, pathCost: 0, status: 'Searching...' });
      draw();
      if (!cont) {
        clearInterval(intervalRef.current!);
        runRef.current = false;
        if (ss.found) {
          const steps = tracePath(ss, gridRef.current);
          draw();
          setStats({ visited: ss.visitedCount, pathLen: steps, pathCost: ss.pathCost, status: 'Path found!' });
        } else {
          setStats(s => ({ ...s, status: 'No path!' }));
        }
      }
    }, Math.max(1, Math.round(50 / speed)));
  }, [algo, draw, speed]);

  const stepOnce = useCallback(() => {
    const g = gridRef.current;
    if (!searchRef.current) {
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (['visited','frontier','path'].includes(g.cells[r][c])) g.cells[r][c] = 'empty';
      g.cells[g.start.r][g.start.c] = 'start';
      g.cells[g.end.r][g.end.c] = 'end';
      searchRef.current = initSearch(g, algo);
    }
    const ss = searchRef.current;
    const cont = stepSearch(ss, g, algo);
    draw();
    setStats({ visited: ss.visitedCount, pathLen: 0, pathCost: 0, status: cont ? 'Stepping...' : ss.found ? 'Found!' : 'No path' });
    if (!cont && ss.found) { tracePath(ss, g); draw(); }
  }, [algo, draw]);

  const generateMaze = useCallback(() => {
    clearAll();
    const g = gridRef.current;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) g.cells[r][c] = 'wall';
    const carve = (r: number, c: number) => {
      const dirs = [[0,2],[0,-2],[2,0],[-2,0]].sort(() => Math.random() - 0.5);
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (g.cells[nr][nc] === 'wall') {
          g.cells[r + dr/2][c + dc/2] = 'empty';
          g.cells[nr][nc] = 'empty';
          carve(nr, nc);
        }
      }
    };
    g.cells[1][1] = 'empty'; carve(1, 1);
    g.start = { r: 1, c: 1 }; g.end = { r: ROWS - 2, c: COLS - 2 };
    g.cells[g.start.r][g.start.c] = 'start';
    g.cells[g.end.r][g.end.c] = 'end';
    draw();
  }, [clearAll, draw]);

  const ALGOS: { id: Algo; label: string; color: string }[] = [
    { id: 'astar', label: 'A*', color: '#10d98a' },
    { id: 'dijkstra', label: 'Dijkstra', color: '#3b82f6' },
    { id: 'bfs', label: 'BFS', color: '#f59e0b' },
    { id: 'greedy', label: 'Greedy', color: '#ff6b6b' },
  ];

  return (
    <div>
      {/* Algo tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 12 }}>
        {ALGOS.map(a => (
          <button
            key={a.id}
            onClick={() => { setAlgo(a.id); clearPath(); }}
            style={{
              padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: `1px solid ${algo === a.id ? a.color : 'var(--border)'}`,
              background: algo === a.id ? `${a.color}20` : 'var(--bg-inset)',
              color: algo === a.id ? a.color : 'var(--text-secondary)',
              fontFamily: 'var(--font-geist-sans)',
            }}
          >{a.label}</button>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, marginBottom: 10, fontSize: 11, color: 'var(--text-muted)' }}>
        {[
          { color: '#10d98a', label: 'Start' },
          { color: '#f59e0b', label: 'Goal' },
          { color: '#1a2236', label: 'Wall' },
          { color: '#2d1f0a', label: 'Sand (×3)' },
          { color: '#0a1a2e', label: 'Water (×8)' },
          { color: '#0d2d52', label: 'Visited' },
          { color: '#fde047', label: 'Path' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: color, border: '1px solid rgba(255,255,255,0.15)' }} />
            <span>{label}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>Click to cycle terrain</div>
      </div>

      <div className="sim-canvas-wrap" style={{ marginBottom: 12 }}>
        <canvas
          ref={canvasRef}
          width={600} height={440}
          style={{ display: 'block', width: '100%', height: 'auto', cursor: placeMode ? 'cell' : 'crosshair' }}
          onMouseDown={handleMouseDown}
          onMouseMove={e => { if (paintRef.current && !placeMode) paintCell(getCell(e)); }}
          onMouseUp={() => { paintRef.current = false; }}
          onMouseLeave={() => { paintRef.current = false; }}
          onContextMenu={e => e.preventDefault()}
        />
      </div>

      {/* Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Algorithm', value: ALGOS.find(a => a.id === algo)?.label ?? algo },
          { label: 'Visited', value: String(stats.visited) },
          { label: 'Path Cost', value: stats.pathCost > 0 ? String(stats.pathCost) : '—' },
          { label: 'Status', value: stats.status },
        ].map(chip => (
          <div key={chip.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 10px',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{chip.label}</div>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{chip.value}</div>
          </div>
        ))}
      </div>

      {/* Speed */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Speed: {speed}×</div>
        <input type="range" min={1} max={50} value={speed} onChange={e => setSpeed(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#10d98a' }} />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        {[
          { label: '▶ Run', fn: runSearch, primary: true },
          { label: 'Step', fn: stepOnce },
          { label: 'Clear Path', fn: clearPath },
          { label: 'Clear All', fn: clearAll },
          { label: placeMode === 'start' ? '● Set Start' : 'Set Start', fn: () => setPlaceMode(m => m === 'start' ? null : 'start') },
          { label: placeMode === 'end' ? '● Set End' : 'Set End', fn: () => setPlaceMode(m => m === 'end' ? null : 'end') },
          { label: 'Maze', fn: generateMaze },
        ].map(btn => (
          <button key={btn.label} onClick={btn.fn} style={{
            background: btn.primary ? '#10d98a' : 'var(--bg-card)',
            color: btn.primary ? '#0e1117' : 'var(--text-secondary)',
            border: btn.primary ? 'none' : '1px solid var(--border)',
            borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-geist-sans)',
          }}>
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
