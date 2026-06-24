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
import QuizPuzzle from '@/components/puzzles/QuizPuzzle';
import ValuePuzzle from '@/components/puzzles/ValuePuzzle';
import {
  PIDConcept,
  SensorFusionConcept,
  DynamicsConcept,
  VisionConcept,
  SwarmConcept,
  ManipulationConcept,
  VLAConcept,
  LLMBrainConcept,
  WorldModelConcept,
  EdgeAIConcept,
} from '@/components/concepts/UnitConcepts';

const KinematicsLab   = dynamic(() => import('@/components/simulations/KinematicsLab'),   { ssr: false });
const PathfindingLab  = dynamic(() => import('@/components/simulations/PathfindingLab'),  { ssr: false });
const SLAMLab         = dynamic(() => import('@/components/simulations/SLAMLab'),         { ssr: false });
const PIDLab          = dynamic(() => import('@/components/simulations/PIDLab'),          { ssr: false });
const KalmanLab       = dynamic(() => import('@/components/simulations/KalmanLab'),       { ssr: false });
const DynamicsLab     = dynamic(() => import('@/components/simulations/DynamicsLab'),     { ssr: false });
const VisionLab       = dynamic(() => import('@/components/simulations/VisionLab'),       { ssr: false });
const SwarmLab        = dynamic(() => import('@/components/simulations/SwarmLab'),        { ssr: false });
const GraspLab        = dynamic(() => import('@/components/simulations/GraspLab'),        { ssr: false });
const VLALab          = dynamic(() => import('@/components/simulations/VLALab'),          { ssr: false });
const LLMBrainLab     = dynamic(() => import('@/components/simulations/LLMBrainLab'),     { ssr: false });
const WorldModelLab   = dynamic(() => import('@/components/simulations/WorldModelLab'),   { ssr: false });
const EdgeAILab       = dynamic(() => import('@/components/simulations/EdgeAILab'),       { ssr: false });

// ── Shared concept primitives ─────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 14, padding: 28, marginBottom: 20,
};
const BODY: React.CSSProperties = { color: 'var(--text-secondary)', lineHeight: 1.75, fontSize: 15 };
const H3: React.CSSProperties = { fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 };
const EQ: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-geist-mono)', fontSize: 13,
  color: '#00ff41', background: 'rgba(0,255,65,0.05)',
  borderLeft: '2px solid #00ff41', padding: '12px 16px', margin: '16px 0',
  whiteSpace: 'pre', overflowX: 'auto', lineHeight: 1.7,
};

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      flexShrink: 0, fontFamily: 'var(--font-geist-mono)', fontSize: 10,
      color, background: color + '18', border: `1px solid ${color}40`,
      borderRadius: 6, padding: '3px 8px', letterSpacing: '0.06em',
    }}>{label}</span>
  );
}

// ── Concept sections ──────────────────────────────────────────────────────────

function KinematicsConcept() {
  return (
    <div style={{ maxWidth: 720 }}>

      <div style={CARD}>
        <h3 style={H3}>The Geometry of Motion</h3>
        <p style={BODY}>
          Kinematics is the geometry of motion — no forces, no masses, just shape and position.
          A robot arm is a <em>kinematic chain</em>: rigid links connected by joints, each joint
          allowing one degree of freedom. For a planar 2-link arm, exactly two numbers —
          the joint angles θ₁ and θ₂ — completely and unambiguously determine where the tip is.
          That&apos;s the whole problem.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Forward Kinematics: Chaining Rotations</h3>
          <Tag label="FK" color="#3b82f6" />
        </div>
        <p style={BODY}>
          FK converts joint angles to tip position. Each joint rotates the coordinate frame
          of everything downstream. For a 2-link planar arm with link lengths l₁ and l₂:
        </p>
        <code style={EQ}>{`x = l₁·cos(θ₁) + l₂·cos(θ₁ + θ₂)
y = l₁·sin(θ₁) + l₂·sin(θ₁ + θ₂)`}</code>
        <p style={BODY}>
          The first term places the elbow; the second extends from there by rotating another
          l₂ at the combined angle θ₁+θ₂. This is always <strong>unique</strong> — one set of
          angles gives exactly one tip position. FK never fails, never has multiple solutions.
          It&apos;s just trigonometry composed twice.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Inverse Kinematics: Working Backwards</h3>
          <Tag label="IK" color="#f59e0b" />
        </div>
        <p style={BODY}>
          IK asks: given a target (x, y), what joint angles do I need? Start with the law of
          cosines applied to the triangle formed by the two links and the target distance r:
        </p>
        <code style={EQ}>{`r² = x² + y²
cos(θ₂) = (r² − l₁² − l₂²) / (2·l₁·l₂)`}</code>
        <p style={BODY}>
          The key insight: cos(θ₂) has <em>two</em> solutions — ±√(1 − cos²(θ₂)). That&apos;s
          elbow-up and elbow-down. Once θ₂ is known, θ₁ follows:
        </p>
        <code style={EQ}>{`θ₁ = atan2(y, x) − atan2(l₂·sin(θ₂),  l₁ + l₂·cos(θ₂))`}</code>
        <p style={BODY}>
          This isn&apos;t a numerical approximation — it&apos;s a closed-form exact solution.
          Two solutions exist for every reachable interior point. At the boundary of the
          workspace they converge into one.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>The Jacobian: Relating Velocities</h3>
          <Tag label="J" color="#8b5cf6" />
        </div>
        <p style={BODY}>
          The Jacobian J maps joint velocities (θ̇₁, θ̇₂) to tip velocity (ẋ, ẏ).
          Differentiate the FK equations with respect to time:
        </p>
        <code style={EQ}>{`⎡ẋ⎤   ⎡ −l₁·sin(θ₁)−l₂·sin(θ₁+θ₂)   −l₂·sin(θ₁+θ₂) ⎤ ⎡θ̇₁⎤
⎣ẏ⎦ = ⎣  l₁·cos(θ₁)+l₂·cos(θ₁+θ₂)    l₂·cos(θ₁+θ₂) ⎦ ⎣θ̇₂⎦`}</code>
        <p style={BODY}>
          J is a 2×2 matrix. Its determinant is:
        </p>
        <code style={EQ}>{`det(J) = l₁·l₂·sin(θ₂)`}</code>
        <p style={BODY}>
          When det(J) = 0, the Jacobian loses rank — the arm loses one direction of motion.
          This happens exactly when sin(θ₂) = 0, i.e. θ₂ = 0° or 180°.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Singularities and the Fold Point</h3>
          <Tag label="singular" color="#ff6b6b" />
        </div>
        <p style={BODY}>
          At full extension (θ₂ = 0°): the two links are collinear. det(J) = 0.
          Both IK solutions — elbow-up and elbow-down — become identical. The arm cannot
          move perpendicular to itself; it has instantaneously lost one degree of freedom.
          This is a <em>kinematic singularity</em>.
        </p>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, fontSize: 15, marginTop: 12 }}>
          In practice this causes joint velocities to blow up near singularities: to achieve
          a small tip movement perpendicular to the arm requires infinite joint speed. Real
          robots use damped least-squares (DLS) to handle this gracefully. Find the fold
          point in the lab — hold the arm fully extended and watch the red ring appear.
        </p>
      </div>

    </div>
  );
}

function PathfindingConcept() {
  return (
    <div style={{ maxWidth: 720 }}>

      <div style={CARD}>
        <h3 style={H3}>Configuration Space</h3>
        <p style={BODY}>
          A robot&apos;s <em>configuration space</em> (C-space) is the set of all possible
          configurations — every value the joint angles can take. For a point robot in 2D,
          C-space = ℝ². Obstacles in the physical world become inflated obstacle regions in
          C-space. Pathfinding algorithms search C-space, not physical space. Once you have
          a graph, finding a path is a well-studied problem with exact algorithms.
        </p>
      </div>

      <div style={CARD}>
        <h3 style={H3}>The Search Problem, Formally</h3>
        <p style={BODY}>
          Discretize the space into a grid. Each cell is a node; edges connect adjacent cells.
          Each edge has a weight (the cost of traversal). We want the minimum-cost path from
          start s to goal t. Formally: given graph G = (V, E, w), find path P minimising:
        </p>
        <code style={EQ}>{`cost(P) = Σ w(e)  for all edges e ∈ P`}</code>
        <p style={BODY}>
          Different algorithms answer this with different tradeoffs between completeness,
          optimality, and speed. The lab lets you watch them all on the same grid.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Dijkstra: Optimal by Construction</h3>
          <Tag label="Dijkstra" color="#3b82f6" />
        </div>
        <p style={BODY}>
          Dijkstra maintains a min-priority queue ordered by g(n) — the accumulated cost from
          start. Its key invariant: when a node is dequeued, its g-value is final. Why? Any
          alternative path to that node would have to pass through a node still in the queue,
          which by definition has g ≥ the current node&apos;s g. So no cheaper path exists.
        </p>
        <code style={EQ}>{`priority(n) = g(n)           // cost from start only
complexity  = O((V + E)·log V)   // with a binary heap`}</code>
        <p style={BODY}>
          BFS is Dijkstra with all edge weights = 1. On unweighted grids they&apos;re
          identical. On weighted terrain (sand ×3, water ×8), Dijkstra routes around
          expensive cells that BFS happily walks through.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>A*: Add a Heuristic</h3>
          <Tag label="A*" color="#10d98a" />
        </div>
        <p style={BODY}>
          Dijkstra expands in all directions uniformly. A* breaks the symmetry by adding
          a heuristic h(n) — an estimate of the remaining cost to goal:
        </p>
        <code style={EQ}>{`priority(n) = g(n) + h(n)

Manhattan heuristic:  h(n) = |Δx| + |Δy|`}</code>
        <p style={BODY}>
          <strong>Admissibility</strong>: h(n) ≤ h*(n) for all n, where h*(n) is the true
          remaining cost. Manhattan distance is admissible on a 4-connected grid because
          you can&apos;t do better than |Δx| + |Δy| moves. An admissible heuristic guarantees
          A* finds the optimal path.
        </p>
        <p style={{ ...BODY, marginTop: 12 }}>
          <strong>Consistency</strong> (stronger): h(n) ≤ w(n,n&apos;) + h(n&apos;) for every
          edge (n, n&apos;). Consistent heuristics mean each node is processed at most once —
          no re-opening. Manhattan distance is consistent on uniform grids.
          When h = 0: A* degenerates to Dijkstra. When g is ignored: Greedy best-first.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Why Weights Matter</h3>
          <Tag label="terrain" color="#f59e0b" />
        </div>
        <p style={BODY}>
          A 3-step path through water costs 3 × 8 = 24. A 12-step path through empty cells
          costs 12 × 1 = 12. BFS picks the shorter path in hops and gets it wrong.
          Dijkstra and A* pick the cheaper path in cost and get it right.
        </p>
        <p style={{ ...BODY, marginTop: 12 }}>
          The puzzle for this unit asks you to construct exactly this situation — a map
          where the visually obvious shortcut is the wrong answer. Build it in the lab,
          measure both costs, then report them.
        </p>
      </div>

    </div>
  );
}

function SLAMConcept() {
  return (
    <div style={{ maxWidth: 720 }}>

      <div style={CARD}>
        <h3 style={H3}>Dead Reckoning and Why It Fails</h3>
        <p style={BODY}>
          The simplest position estimate: integrate velocity over time. If you know you moved
          at speed v for time Δt in direction θ, then:
        </p>
        <code style={EQ}>{`x_{t+1} = x_t + v·Δt·cos(θ)
y_{t+1} = y_t + v·Δt·sin(θ)`}</code>
        <p style={BODY}>
          The problem is error accumulation. A 1% velocity miscalibration means after 100m
          you&apos;re 1m off. After 1km, 10m off. The error grows without bound. Without
          external observations to correct it, the robot eventually has no idea where it is.
          SLAM is the solution.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>The Bayes Filter</h3>
          <Tag label="probabilistic" color="#8b5cf6" />
        </div>
        <p style={BODY}>
          Instead of tracking a single position estimate, maintain a full probability
          distribution over all possible positions: p(x_t | z_&#123;1:t&#125;, u_&#123;1:t&#125;).
          Every timestep has two phases:
        </p>
        <code style={EQ}>{`// Predict — integrate motion model (uncertainty grows)
p(x_t | z_{1:t-1}) = ∫ p(x_t | x_{t-1}, u_t) · p(x_{t-1} | z_{1:t-1}) dx_{t-1}

// Update — incorporate observation (uncertainty shrinks)
p(x_t | z_{1:t}) ∝ p(z_t | x_t) · p(x_t | z_{1:t-1})`}</code>
        <p style={BODY}>
          The predict step convolves the belief with the motion noise — the distribution
          spreads. The update step multiplies by the observation likelihood — peaks that
          are consistent with the measurement grow, inconsistent ones shrink.
          The result sharpens around the true position.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>EKF-SLAM: Making It Tractable</h3>
          <Tag label="EKF" color="#3b82f6" />
        </div>
        <p style={BODY}>
          The Bayes filter is exact but intractable for continuous spaces. The Extended
          Kalman Filter approximates it by assuming Gaussian distributions and linearising
          the nonlinear motion/observation models via first-order Taylor expansion (the
          Jacobians). The full SLAM state vector is:
        </p>
        <code style={EQ}>{`μ = [x_r, y_r, θ_r,  l₁_x, l₁_y,  l₂_x, l₂_y, ...]ᵀ
          ↑robot pose       ↑landmark positions

Σ = (3 + 2n) × (3 + 2n)  covariance matrix`}</code>
        <p style={BODY}>
          The covariance matrix Σ encodes uncertainty in every dimension and, crucially,
          the <em>correlations</em> between them. The robot-landmark off-diagonal blocks
          grow as the robot explores — they encode: &ldquo;if the robot is further right
          than we thought, then landmark 3 is probably further right too.&rdquo; This shared
          uncertainty is what makes loop closure so powerful.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Triangulation: Why 3 Landmarks?</h3>
          <Tag label="geometry" color="#f59e0b" />
        </div>
        <p style={BODY}>
          Consider what a single range observation tells you: the robot is somewhere on a
          circle of radius r centred on the landmark. Two circles intersect at (generically)
          two points. Three circles — from three distinct landmarks — intersect at exactly
          one point. This is trilateration, and it&apos;s why GPS needs at least 3 satellites
          (4 in 3D to also solve for clock error).
        </p>
        <code style={EQ}>{`1 landmark → circle of possible positions
2 landmarks → 2 intersection points
3 landmarks → unique position (generically)`}</code>
        <p style={BODY}>
          With bearing and range (not just range), two landmarks suffice — the bearing
          breaks the circle into a ray. The lab uses proximity detection, so you need 3.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Loop Closure</h3>
          <Tag label="correction" color="#ff6b6b" />
        </div>
        <p style={BODY}>
          When the robot re-observes a previously mapped landmark, it gets a constraint
          between its current estimated pose and the landmark&apos;s stored position. If both
          have drifted, the observation tightens the estimate of both simultaneously — and
          through the cross-correlations in Σ, it updates every other landmark too. One
          loop closure can sharply reduce uncertainty across the entire map.
        </p>
        <p style={{ ...BODY, marginTop: 12 }}>
          This is why SLAM robots are deliberately designed to revisit places. The uncertainty
          ellipse in the lab shrinks each time you pass near a known landmark. The goal:
          get it below 12px by visiting all 5. Watch the orange ellipse contract.
        </p>
      </div>

    </div>
  );
}

// ── Unit pages ────────────────────────────────────────────────────────────────

function KinematicsPage() {
  const { markVisited } = useProgress();
  useEffect(() => { markVisited(1); }, []);

  return (
    <UnitShell
      unit={getUnit('kinematics')!}
      concept={<KinematicsConcept />}
      lab={<KinematicsLab />}
      puzzle={<FoldPointPuzzle unitId={1} />}
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
  useEffect(() => { markVisited(3); }, []);

  return (
    <UnitShell
      unit={getUnit('slam')!}
      concept={<SLAMConcept />}
      lab={<SLAMLab />}
      puzzle={<LostRobotPuzzle unitId={3} />}
    />
  );
}

function PIDPage() {
  const { markVisited } = useProgress();
  useEffect(() => { markVisited(4); }, []);

  return (
    <UnitShell
      unit={getUnit('pid')!}
      concept={<PIDConcept />}
      lab={<PIDLab />}
      puzzle={
        <ValuePuzzle
          unitId={4}
          title="PID Settling Time"
          prompt="With the default gains (Kp=2, Ki=0.1, Kd=0.5), press Re-step and observe the Settling time chip. What value (in seconds) does it show when the response has settled?"
          answer={3.5}
          tolerance={2.5}
          suffix="s"
          placeholder="e.g. 3.5"
          explanation="With Kp=2, Ki=0.1, Kd=0.5 the system is slightly underdamped. The settling time (last time error exceeded the 2% band) is typically 2–6 seconds depending on the browser timing. The integral term slowly eliminates any steady-state error."
          hint="Press the Re-step button in the lab and read the Settling time chip. Values between 1 and 6 seconds are accepted."
        />
      }
    />
  );
}

function SensorFusionPage() {
  const { markVisited } = useProgress();
  useEffect(() => { markVisited(5); }, []);

  return (
    <UnitShell
      unit={getUnit('sensor-fusion')!}
      concept={<SensorFusionConcept />}
      lab={<KalmanLab />}
      puzzle={
        <QuizPuzzle
          unitId={5}
          title="Kalman Gain Behaviour"
          prompt="As measurement noise R → ∞ (sensor becomes extremely noisy), the Kalman gain K approaches:"
          options={[
            { key: 'A', label: '0 (ignore the sensor, trust the model)' },
            { key: 'B', label: '1 (fully trust the sensor)' },
            { key: 'C', label: '∞ (gain blows up)' },
            { key: 'D', label: 'Unchanged (K does not depend on R)' },
          ]}
          correctKey="A"
          explanation="K = P⁻·Hᵀ·(H·P⁻·Hᵀ + R)⁻¹. As R → ∞, the denominator dominates and K → 0. A K of 0 means the correction term K·(z − Hx̂) vanishes — the filter ignores new measurements and relies entirely on the motion model."
          hint="Look at the Kalman gain formula: K = P⁻Hᵀ(HP⁻Hᵀ + R)⁻¹. What happens to K as R grows very large?"
        />
      }
    />
  );
}

function DynamicsPage() {
  const { markVisited } = useProgress();
  useEffect(() => { markVisited(6); }, []);

  return (
    <UnitShell
      unit={getUnit('dynamics')!}
      concept={<DynamicsConcept />}
      lab={<DynamicsLab />}
      puzzle={
        <ValuePuzzle
          unitId={6}
          title="Pendulum Equilibrium Torque"
          prompt="At the stable equilibrium (θ = 0, θ̇ = 0) of a simple pendulum, what is the net torque (N·m)?"
          answer={0}
          tolerance={0.1}
          suffix="N·m"
          placeholder="e.g. 0"
          explanation="At θ = 0, sin(0) = 0, so the gravitational torque m·g·l·sin(θ) = 0. With no applied torque (τ = 0), the net torque is exactly zero — this is why θ = 0 is an equilibrium. The pendulum hangs straight down with no tendency to rotate."
          hint="The equation of motion is I·θ̈ + m·g·l·sin(θ) = τ. At θ = 0 and τ = 0, what does sin(0) equal?"
        />
      }
    />
  );
}

function VisionPage() {
  const { markVisited } = useProgress();
  useEffect(() => { markVisited(7); }, []);

  return (
    <UnitShell
      unit={getUnit('vision')!}
      concept={<VisionConcept />}
      lab={<VisionLab />}
      puzzle={
        <QuizPuzzle
          unitId={7}
          title="Pinhole Camera: Focal Length Effect"
          prompt="In the pinhole camera model, if focal length doubles while object distance remains unchanged, the projected image height:"
          options={[
            { key: 'A', label: 'Halves' },
            { key: 'B', label: 'Stays the same' },
            { key: 'C', label: 'Doubles' },
            { key: 'D', label: 'Quadruples' },
          ]}
          correctKey="C"
          explanation="From the pinhole equation v = f·Y/Z: image height is directly proportional to focal length f. If f doubles and Z is unchanged, v doubles. A longer focal length is a narrower field of view but magnifies objects — just like a telephoto lens."
          hint="The pinhole equation is v = f·Y/Z. If f doubles and Z stays the same, what happens to v?"
        />
      }
    />
  );
}

function SwarmPage() {
  const { markVisited } = useProgress();
  useEffect(() => { markVisited(8); }, []);

  return (
    <UnitShell
      unit={getUnit('swarm')!}
      concept={<SwarmConcept />}
      lab={<SwarmLab />}
      puzzle={
        <QuizPuzzle
          unitId={8}
          title="Swarm Cohesion Dominance"
          prompt="In a Reynolds flocking model with separation weight = 0 and very high cohesion weight, the swarm will:"
          options={[
            { key: 'A', label: 'Spread evenly across the space' },
            { key: 'B', label: 'Collapse toward a single point' },
            { key: 'C', label: 'Line up in a row' },
            { key: 'D', label: 'Stop moving entirely' },
          ]}
          correctKey="B"
          explanation="Cohesion pulls each agent toward the group centre of mass. With no separation force to counteract it, every agent accelerates toward the centroid — collapsing the swarm to a single point. Separation is what gives the swarm spatial extent."
          hint="Cohesion steers toward the centre of mass. Without separation to push agents apart, where do they all end up?"
        />
      }
    />
  );
}

function ManipulationPage() {
  const { markVisited } = useProgress();
  useEffect(() => { markVisited(9); }, []);

  return (
    <UnitShell
      unit={getUnit('manipulation')!}
      concept={<ManipulationConcept />}
      lab={<GraspLab />}
      puzzle={
        <ValuePuzzle
          unitId={9}
          title="Friction Cone: Max Tangential Force"
          prompt="With coefficient of friction μ = 0.5 and a normal force of 10 N, what is the maximum tangential (friction) force before slip (N)?"
          answer={5}
          tolerance={0.1}
          suffix="N"
          placeholder="e.g. 5"
          explanation="Coulomb friction: |ft| ≤ μ·fn = 0.5 × 10 = 5 N. At exactly 5 N tangential force, the contact is at the boundary of the friction cone — any more and the finger slips. This is why a rubber-tipped finger (high μ) can exert more shear force than a smooth metal one."
          hint="The Coulomb friction constraint is |ft| ≤ μ·fn. Multiply μ by the normal force."
        />
      }
    />
  );
}

function VLAPage() {
  const { markVisited } = useProgress();
  useEffect(() => { markVisited(10); }, []);

  return (
    <UnitShell
      unit={getUnit('vla')!}
      concept={<VLAConcept />}
      lab={<VLALab />}
      puzzle={
        <QuizPuzzle
          unitId={10}
          title="RT-2 Action Representation"
          prompt="In RT-2 (Robotics Transformer 2), robot actions are represented as:"
          options={[
            { key: 'A', label: 'Continuous floating-point joint angles' },
            { key: 'B', label: 'Text tokens from the language model vocabulary' },
            { key: 'C', label: 'Image pixels indicating target end-effector position' },
            { key: 'D', label: 'Joint torque commands in Newton-metres' },
          ]}
          correctKey="B"
          explanation="RT-2 discretises each action dimension into 256 bins and maps them to unused token IDs in the LLM vocabulary. The model generates actions the same way it generates text — as sequences of tokens. This allows the robot to leverage the full generalisation capacity of the pretrained language model."
          hint="RT-2 repurposes the language model's existing vocabulary for robot control. What format does an LLM output?"
        />
      }
    />
  );
}

function LLMBrainPage() {
  const { markVisited } = useProgress();
  useEffect(() => { markVisited(11); }, []);

  return (
    <UnitShell
      unit={getUnit('llm-brain')!}
      concept={<LLMBrainConcept />}
      lab={<LLMBrainLab />}
      puzzle={
        <QuizPuzzle
          unitId={11}
          title="SayCan Skill Selection"
          prompt="SayCan selects a robot skill based on:"
          options={[
            { key: 'A', label: 'LLM probability alone' },
            { key: 'B', label: 'Affordance feasibility alone' },
            { key: 'C', label: 'LLM probability × affordance feasibility' },
            { key: 'D', label: 'Random selection among feasible skills' },
          ]}
          correctKey="C"
          explanation="SayCan scores each candidate skill as p_LLM(skill|goal) × p_affordance(skill|state). The LLM provides semantic plausibility (does this skill make sense for the goal?), while the affordance model provides physical feasibility (can the robot actually do this right now?). Both must be high for a skill to be selected."
          hint="SayCan grounds language in robot capabilities. It combines two probabilities — one from the LLM and one from the robot's learned affordance model."
        />
      }
    />
  );
}

function WorldModelsPage() {
  const { markVisited } = useProgress();
  useEffect(() => { markVisited(12); }, []);

  return (
    <UnitShell
      unit={getUnit('world-models')!}
      concept={<WorldModelConcept />}
      lab={<WorldModelLab />}
      puzzle={
        <QuizPuzzle
          unitId={12}
          title="Domain Randomisation"
          prompt="Domain randomisation enables sim-to-real transfer by:"
          options={[
            { key: 'A', label: 'Making the simulation look exactly like the real world' },
            { key: 'B', label: 'Training across a distribution of sim parameters so real-world variation falls inside the training distribution' },
            { key: 'C', label: 'Removing all randomness from the simulation' },
            { key: 'D', label: 'Fine-tuning exclusively on real-world data' },
          ]}
          correctKey="B"
          explanation="Domain randomisation (DR) randomises simulation parameters (friction, mass, lighting, textures) during training. If the distribution p(φ) over sim parameters is broad enough to include the true real-world parameters φ_real, the trained policy transfers. The real world becomes 'just another sample' from the training distribution."
          hint="DR doesn't make sim look like reality — it makes the policy robust to variation by training on many different sims."
        />
      }
    />
  );
}

function EdgeAIPage() {
  const { markVisited } = useProgress();
  useEffect(() => { markVisited(13); }, []);

  return (
    <UnitShell
      unit={getUnit('edge-ai')!}
      concept={<EdgeAIConcept />}
      lab={<EdgeAILab />}
      puzzle={
        <ValuePuzzle
          unitId={13}
          title="INT8 Size Reduction"
          prompt="INT8 quantisation reduces model memory footprint by approximately ___× compared to FP32?"
          answer={4}
          tolerance={0.1}
          suffix="×"
          placeholder="e.g. 4"
          explanation="FP32 uses 32 bits per weight; INT8 uses 8 bits. The ratio is 32/8 = 4×. A 100 MB FP32 model becomes ~25 MB in INT8, with only a small accuracy penalty (typically under 1% on standard benchmarks when using proper calibration)."
          hint="FP32 = 32 bits per parameter, INT8 = 8 bits per parameter. What is 32 ÷ 8?"
        />
      }
    />
  );
}

// ── Router ────────────────────────────────────────────────────────────────────

export default function UnitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  if (slug === 'kinematics')   return <KinematicsPage />;
  if (slug === 'pathfinding')  return <PathfindingPage />;
  if (slug === 'slam')         return <SLAMPage />;
  if (slug === 'pid')          return <PIDPage />;
  if (slug === 'sensor-fusion') return <SensorFusionPage />;
  if (slug === 'dynamics')     return <DynamicsPage />;
  if (slug === 'vision')       return <VisionPage />;
  if (slug === 'swarm')        return <SwarmPage />;
  if (slug === 'manipulation') return <ManipulationPage />;
  if (slug === 'vla')          return <VLAPage />;
  if (slug === 'llm-brain')    return <LLMBrainPage />;
  if (slug === 'world-models') return <WorldModelsPage />;
  if (slug === 'edge-ai')      return <EdgeAIPage />;

  notFound();
}
