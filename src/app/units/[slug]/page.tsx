'use client';

import { notFound } from 'next/navigation';
import { use, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getUnit } from '@/lib/units';
import { useProgress } from '@/lib/progress';
import UnitShell from '@/components/ui/UnitShell';
import FoldPointPuzzle from '@/components/puzzles/FoldPointPuzzle';
import ExpensiveShortcutPuzzle from '@/components/puzzles/ExpensiveShortcutPuzzle';
import LostRobotPuzzle from '@/components/puzzles/LostRobotPuzzle';

const KinematicsLab = dynamic(() => import('@/components/simulations/KinematicsLab'), { ssr: false });
const PathfindingLab = dynamic(() => import('@/components/simulations/PathfindingLab'), { ssr: false });
const SLAMLab        = dynamic(() => import('@/components/simulations/SLAMLab'), { ssr: false });

// ── Concept sections ──────────────────────────────────────────────────────────

function KinematicsConcept() {
  return (
    <div style={{ maxWidth: 720 }}>
      {[
        {
          title: 'What is Kinematics?',
          body: `Kinematics studies motion without caring about forces. For a robot arm made of rigid links connected by joints, it answers one deceptively simple question: given joint angles, where does the tip end up?`,
        },
        {
          title: 'Forward Kinematics',
          body: `FK goes "forward" from cause to effect. You specify every joint angle, and the math tells you the end-effector position. For a 2-link planar arm, you chain rotation matrices — joint 1 transforms into joint 2's frame, then into the end effector. FK is always unique: one set of joint angles gives exactly one position.`,
          accent: '#3b82f6',
          tag: 'FK',
        },
        {
          title: 'Inverse Kinematics',
          body: `IK works backwards: you know the target position and need the joint angles. This is genuinely hard. A 2-DOF arm has two solutions — "elbow up" and "elbow down". A 6-DOF arm can have 16. Numerical methods use the Jacobian — a matrix relating joint velocities to end-effector velocities — to iteratively refine a solution.`,
          accent: '#f59e0b',
          tag: 'IK',
        },
        {
          title: 'Singularities',
          body: `A singular configuration is where the Jacobian loses rank — the arm momentarily loses ability to move in some Cartesian direction. The classic example: full extension. Both IK solutions become the same. The robot can't distinguish elbow-up from elbow-down. This is the fold point you'll find in the lab.`,
          accent: '#ff6b6b',
          tag: 'Singularity',
        },
      ].map(sec => (
        <div key={sec.title} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 28, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{sec.title}</h3>
            {sec.tag && (
              <span style={{
                flexShrink: 0, fontFamily: 'var(--font-geist-mono)', fontSize: 10,
                color: sec.accent, background: sec.accent + '18',
                border: `1px solid ${sec.accent}40`, borderRadius: 6, padding: '3px 8px',
                letterSpacing: '0.06em',
              }}>{sec.tag}</span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 15 }}>{sec.body}</p>
        </div>
      ))}
    </div>
  );
}

function PathfindingConcept() {
  return (
    <div style={{ maxWidth: 720 }}>
      {[
        {
          title: 'The Navigation Problem',
          body: `A robot needs to get from A to B without hitting anything. The space of all possible robot configurations is called configuration space (C-space). Even for a 2D planar robot, finding a collision-free path through C-space is non-trivial once obstacles appear.`,
        },
        {
          title: 'BFS / Flood Fill',
          body: `BFS spreads outward from a source cell like water filling a basin. It visits every reachable cell in order of steps, guaranteeing shortest hop count. It treats all moves as equal cost — no weights. Excellent for "can I reach this at all?" and simple uniform grids.`,
          accent: '#f59e0b', tag: 'BFS',
        },
        {
          title: 'Dijkstra\'s Algorithm',
          body: `Dijkstra uses a priority queue instead of a FIFO queue. It processes cells in order of total cost from start, guaranteeing the shortest weighted path. On terrain with sand (cost ×3) or water (cost ×8), Dijkstra correctly routes around expensive cells even if the detour is longer in steps.`,
          accent: '#3b82f6', tag: 'Dijkstra',
        },
        {
          title: 'A* — Directed Search',
          body: `A* adds a heuristic h(n) to Dijkstra: instead of expanding by cost-so-far g(n), it expands by f(n) = g(n) + h(n). A good heuristic (Manhattan distance) focuses the search toward the goal, dramatically cutting explored nodes. A* is optimal as long as h(n) never overestimates — the admissibility condition.`,
          accent: '#10d98a', tag: 'A*',
        },
        {
          title: 'Greedy Best-First',
          body: `Greedy expands only by h(n) — the estimated distance to goal. It's fast but not optimal: it can be fooled into an expensive path that looks close. Watch how Greedy behaves differently from A* on weighted terrain in the lab.`,
          accent: '#ff6b6b', tag: 'Greedy',
        },
      ].map(sec => (
        <div key={sec.title} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 28, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{sec.title}</h3>
            {sec.tag && (
              <span style={{
                flexShrink: 0, fontFamily: 'var(--font-geist-mono)', fontSize: 10,
                color: sec.accent, background: sec.accent + '18',
                border: `1px solid ${sec.accent}40`, borderRadius: 6, padding: '3px 8px',
                letterSpacing: '0.06em',
              }}>{sec.tag}</span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 15 }}>{sec.body}</p>
        </div>
      ))}
    </div>
  );
}

function SLAMConcept() {
  return (
    <div style={{ maxWidth: 720 }}>
      {[
        {
          title: 'The Chicken-and-Egg Problem',
          body: `SLAM stands for Simultaneous Localization and Mapping. The core challenge: to build an accurate map, you need to know your precise position. But to know your position, you need an accurate map. SLAM solves both at once.`,
        },
        {
          title: 'Landmarks and Loop Closure',
          body: `Landmark-based SLAM uses distinctive features in the environment as reference points. As the robot moves, it accumulates position error (dead reckoning drift). When it re-observes a previously seen landmark, it can correct its estimated position — this is called a loop closure. Each loop closure sharply reduces uncertainty.`,
          accent: '#ff6b6b', tag: 'Loop Closure',
        },
        {
          title: 'Extended Kalman Filter (EKF-SLAM)',
          body: `EKF-SLAM maintains a belief state: a mean (best estimate of position and landmark locations) and a covariance matrix (uncertainty). The filter has two steps: predict (move, uncertainty grows) and update (observe landmark, uncertainty shrinks). The covariance ellipse in the lab visualizes this directly.`,
          accent: '#3b82f6', tag: 'EKF',
        },
        {
          title: 'Triangulation',
          body: `To unambiguously determine 2D position from range observations, you need bearings or distances to multiple landmarks. One landmark gives a circle of possible positions. Two gives two intersecting points. Three uniquely determines position. This geometric fact is what the puzzle asks you to discover.`,
          accent: '#f59e0b', tag: 'Geometry',
        },
      ].map(sec => (
        <div key={sec.title} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 28, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{sec.title}</h3>
            {sec.tag && (
              <span style={{
                flexShrink: 0, fontFamily: 'var(--font-geist-mono)', fontSize: 10,
                color: sec.accent, background: sec.accent + '18',
                border: `1px solid ${sec.accent}40`, borderRadius: 6, padding: '3px 8px',
                letterSpacing: '0.06em',
              }}>{sec.tag}</span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 15 }}>{sec.body}</p>
        </div>
      ))}
    </div>
  );
}

// ── Unit pages ────────────────────────────────────────────────────────────────

function KinematicsPage() {
  const { markVisited } = useProgress();
  const [foldUnlocked, setFoldUnlocked] = useState(false);

  const handleFold = () => {
    setFoldUnlocked(true);
    markVisited(1);
  };

  return (
    <UnitShell
      unit={getUnit('kinematics')!}
      concept={<KinematicsConcept />}
      lab={<KinematicsLab onFoldPointReached={handleFold} />}
      puzzle={<FoldPointPuzzle unitId={1} unlocked={foldUnlocked} />}
    />
  );
}

function PathfindingPage() {
  const { markVisited } = useProgress();
  useEffect(() => { markVisited(2); }, []);

  return (
    <UnitShell
      unit={getUnit('pathfinding')!}
      concept={<PathfindingConcept />}
      lab={<PathfindingLab />}
      puzzle={<ExpensiveShortcutPuzzle unitId={2} />}
    />
  );
}

function SLAMPage() {
  const { markVisited } = useProgress();
  const [uncertaintyAchieved, setUncertaintyAchieved] = useState(false);

  const handleLow = () => {
    setUncertaintyAchieved(true);
    markVisited(3);
  };

  return (
    <UnitShell
      unit={getUnit('slam')!}
      concept={<SLAMConcept />}
      lab={<SLAMLab onUncertaintyLow={handleLow} />}
      puzzle={<LostRobotPuzzle unitId={3} uncertaintyAchieved={uncertaintyAchieved} />}
    />
  );
}

// ── Router ────────────────────────────────────────────────────────────────────

export default function UnitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  if (slug === 'kinematics') return <KinematicsPage />;
  if (slug === 'pathfinding') return <PathfindingPage />;
  if (slug === 'slam') return <SLAMPage />;

  notFound();
}
