'use client';

import React from 'react';

// ── Shared concept primitives (mirrored from page.tsx) ────────────────────────

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

// ── PID Control ───────────────────────────────────────────────────────────────

export function PIDConcept() {
  return (
    <div style={{ maxWidth: 720 }}>

      <div style={CARD}>
        <h3 style={H3}>The Feedback Loop</h3>
        <p style={BODY}>
          PID control is the backbone of virtually all industrial control systems. The idea is
          simple: measure the output, compare it to the desired setpoint, and push back against
          the error. A thermostat is a P controller; your cruise control is a PI controller;
          a quadrotor stabiliser uses full PID. The three terms address three different aspects
          of the error signal.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>The PID Equation</h3>
          <Tag label="control" color="#00ff41" />
        </div>
        <p style={BODY}>
          Let e(t) = setpoint − measured output. The control signal u(t) is:
        </p>
        <code style={EQ}>{`u(t) = Kp·e(t) + Ki·∫e(τ)dτ + Kd·de/dt

Transfer function: C(s) = Kp + Ki/s + Kd·s`}</code>
        <p style={BODY}>
          Kp amplifies the present error — high Kp = aggressive response but may overshoot.
          Ki eliminates steady-state error by accumulating past error — if you&apos;re always
          a bit low, the integral grows and pushes harder. Kd damps oscillation by braking
          when the error is changing rapidly.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Second-Order System Analysis</h3>
          <Tag label="dynamics" color="#3b82f6" />
        </div>
        <p style={BODY}>
          For a double-integrator plant (position controlled by force), the closed-loop
          characteristic roots determine behaviour. With a PD controller:
        </p>
        <code style={EQ}>{`ωn = √Kp          (natural frequency)
ζ  = Kd / (2·√Kp) (damping ratio)

ζ < 1  → underdamped  (oscillates)
ζ = 1  → critically damped (fastest no overshoot)
ζ > 1  → overdamped  (sluggish)`}</code>
        <p style={BODY}>
          Peak overshoot Mp = e^(−πζ/√(1−ζ²)) for ζ &lt; 1.
          At ζ = 0.7 (common design target), overshoot ≈ 4.3%.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Ziegler–Nichols Tuning</h3>
          <Tag label="tuning" color="#f59e0b" />
        </div>
        <p style={BODY}>
          A practical heuristic for tuning without a plant model. Increase Kp with Ki=Kd=0
          until sustained oscillations occur at ultimate gain Ku with period Tu. Then:
        </p>
        <code style={EQ}>{`Classic PID:   Kp = 0.6·Ku,  Ki = 1.2·Ku/Tu,  Kd = 0.075·Ku·Tu
Pessen Integral: Kp = 0.7·Ku, Ti = 0.4·Tu, Td = 0.15·Tu`}</code>
        <p style={BODY}>
          Z-N tends toward aggressive tuning (ζ ≈ 0.2). Modern variants use lambda-tuning
          or model-based IMC for smoother responses.
        </p>
      </div>

    </div>
  );
}

// ── Sensor Fusion / Kalman ────────────────────────────────────────────────────

export function SensorFusionConcept() {
  return (
    <div style={{ maxWidth: 720 }}>

      <div style={CARD}>
        <h3 style={H3}>The Sensor Fusion Problem</h3>
        <p style={BODY}>
          Each sensor is noisy. GPS drifts slowly but gives absolute position.
          An IMU integrates acceleration — accurate at short timescales but accumulates
          error rapidly. The Kalman filter is the optimal linear-Gaussian solution to
          combining them: it computes the minimum-variance unbiased estimate given both.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>State-Space Model</h3>
          <Tag label="model" color="#3b82f6" />
        </div>
        <p style={BODY}>
          The filter operates on two models: the process model (how state evolves) and
          the measurement model (how sensors observe the state):
        </p>
        <code style={EQ}>{`Process:     x⁺ = A·x + B·u + w,    w ~ N(0, Q)
Measurement: z  = H·x + v,           v ~ N(0, R)

x: state vector    A: transition matrix
u: control input   B: control matrix
Q: process noise   R: measurement noise`}</code>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Predict–Update Cycle</h3>
          <Tag label="KF" color="#00ff41" />
        </div>
        <code style={EQ}>{`── Predict ──────────────────────────────────────
x̂⁻ = A·x̂ + B·u        (propagate state estimate)
P⁻  = A·P·Aᵀ + Q       (propagate covariance — grows)

── Update ───────────────────────────────────────
K   = P⁻·Hᵀ·(H·P⁻·Hᵀ + R)⁻¹   (Kalman gain)
x̂   = x̂⁻ + K·(z − H·x̂⁻)        (correct estimate)
P   = (I − K·H)·P⁻              (shrink covariance)`}</code>
        <p style={BODY}>
          The innovation z − H·x̂⁻ is the surprise: how much the measurement differs
          from prediction. K weights how much to trust this surprise vs the prediction.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Kalman Gain Intuition</h3>
          <Tag label="insight" color="#f59e0b" />
        </div>
        <code style={EQ}>{`As R → ∞ (sensor very noisy):   K → 0   (trust model)
As R → 0 (sensor perfect):      K → H⁻¹ (trust sensor)
As Q → ∞ (process very noisy):  K → H⁻¹ (trust sensor)`}</code>
        <p style={BODY}>
          The Kalman filter is optimal in the sense that it minimises the trace of the
          posterior covariance P — equivalently, it minimises the mean squared error.
          This optimality holds exactly for linear systems with Gaussian noise; for
          nonlinear systems the EKF/UKF/particle filters provide approximations.
        </p>
      </div>

    </div>
  );
}

// ── Dynamics ──────────────────────────────────────────────────────────────────

export function DynamicsConcept() {
  return (
    <div style={{ maxWidth: 720 }}>

      <div style={CARD}>
        <h3 style={H3}>Lagrangian Mechanics</h3>
        <p style={BODY}>
          Instead of tracking forces and applying Newton&apos;s laws to each body,
          Lagrangian mechanics works with energy. The Lagrangian L = T − V (kinetic minus
          potential energy) encodes all system dynamics. For a robot arm, this cleanly
          separates joint-space dynamics from Cartesian forces.
        </p>
        <code style={EQ}>{`L(q, q̇) = T(q, q̇) − V(q)

Euler-Lagrange equation:
  d/dt(∂L/∂q̇) − ∂L/∂q = τ   (generalised torques)`}</code>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Pendulum as Canonical Example</h3>
          <Tag label="pendulum" color="#8b5cf6" />
        </div>
        <code style={EQ}>{`T = ½·I·θ̇²       (rotational kinetic energy)
V = −m·g·l·cos(θ) (potential, zero at θ=π)
L = T − V

Equation of motion:  I·θ̈ + m·g·l·sin(θ) = τ
Energy:              E = ½·I·θ̇² − m·g·l·cos(θ)
Separatrix at:       E = m·g·l  (energy for θ→π with θ̇→0)`}</code>
        <p style={BODY}>
          The separatrix is the boundary between libration (oscillation) and rotation
          (full revolutions). In phase space (θ, θ̇), it forms a figure-8. Points inside
          the separatrix oscillate; points outside rotate. The unstable equilibrium at
          θ=π sits exactly on the separatrix.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Trajectory Planning</h3>
          <Tag label="planning" color="#f59e0b" />
        </div>
        <p style={BODY}>
          A smooth trajectory must satisfy boundary conditions on position, velocity, and
          acceleration at start and end. A quintic polynomial (5th order) provides the
          minimum set of coefficients for this:
        </p>
        <code style={EQ}>{`q(t) = a₀ + a₁t + a₂t² + a₃t³ + a₄t⁴ + a₅t⁵

6 BCs: q(0), q̇(0), q̈(0), q(T), q̇(T), q̈(T) → 6 unknowns
Jerk = q‴(t) = 6a₃ + 24a₄t + 60a₅t²`}</code>
        <p style={BODY}>
          Minimum-jerk trajectories (used in neuroscience to model human reaching)
          arise when you minimise ∫(q‴)² dt over the trajectory. They produce
          bell-shaped velocity profiles, which matches observed human hand movements.
        </p>
      </div>

    </div>
  );
}

// ── Vision ────────────────────────────────────────────────────────────────────

export function VisionConcept() {
  return (
    <div style={{ maxWidth: 720 }}>

      <div style={CARD}>
        <h3 style={H3}>Pinhole Camera Model</h3>
        <p style={BODY}>
          The pinhole model maps a 3D point (X, Y, Z) to image coordinates (u, v).
          Focal length f is the distance from the pinhole to the image plane:
        </p>
        <code style={EQ}>{`u = f · X/Z + cx
v = f · Y/Z + cy

In homogeneous form (K = camera intrinsic matrix):
  p = K · [R | t] · P

K = ⎡f  0  cx⎤
    ⎢0  f  cy⎥
    ⎣0  0   1⎦`}</code>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Edge Detection: Sobel Kernels</h3>
          <Tag label="filtering" color="#3b82f6" />
        </div>
        <code style={EQ}>{`Gx = ⎡-1  0  +1⎤    Gy = ⎡+1  +2  +1⎤
     ⎢-2  0  +2⎥         ⎢ 0   0   0⎥
     ⎣-1  0  +1⎦         ⎣-1  -2  -1⎦

|G| = √(Gx² + Gy²)    θ = atan2(Gy, Gx)`}</code>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Harris Corner Detector</h3>
          <Tag label="features" color="#f59e0b" />
        </div>
        <code style={EQ}>{`Structure tensor M = Σ w(x,y) · ⎡Ix²   IxIy⎤
                                ⎣IxIy  Iy² ⎦

R = det(M) − k·trace(M)²

R >> 0  → corner
R << 0  → edge
|R| ≈ 0 → flat`}</code>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Optical Flow & Visual Servoing</h3>
          <Tag label="servoing" color="#8b5cf6" />
        </div>
        <code style={EQ}>{`Lucas-Kanade: I(x,y,t) = I(x+δx, y+δy, t+δt)
  → Ix·u + Iy·v + It = 0  (brightness constancy)
  A·d = b  where A=[Ix Iy] for N pixels

Visual servoing error: e = s − s*  (feature vs desired)
Control: vc = −λ · Ls⁺ · e

Ls: interaction matrix (image Jacobian)
vc: camera velocity screw`}</code>
        <p style={BODY}>
          Ls⁺ is the pseudo-inverse of the interaction (image Jacobian) matrix.
          Visual servoing allows a robot to servo directly on image features without
          needing to reconstruct 3D position.
        </p>
      </div>

    </div>
  );
}

// ── Swarm ─────────────────────────────────────────────────────────────────────

export function SwarmConcept() {
  return (
    <div style={{ maxWidth: 720 }}>

      <div style={CARD}>
        <h3 style={H3}>Emergence from Local Rules</h3>
        <p style={BODY}>
          No global planner. No central coordinator. Each agent follows three simple
          rules based only on its local neighbourhood, and rich collective behaviour —
          flocking, splitting around obstacles, merging — emerges automatically.
          Craig Reynolds&apos; 1987 &ldquo;Boids&rdquo; model demonstrated this for birds and fish.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Reynolds&apos; Three Rules</h3>
          <Tag label="flocking" color="#8b5cf6" />
        </div>
        <code style={EQ}>{`Separation:  f_sep = Σ (pos_i − pos_j) / |pos_i − pos_j|²
              (for j in close neighbours; avoid crowding)

Alignment:   f_ali = avg(vel_j) − vel_i
              (steer toward average heading)

Cohesion:    f_coh = avg(pos_j) − pos_i
              (steer toward centre of mass)

v_new = v_i + ws·f_sep + wa·f_ali + wc·f_coh`}</code>
        <p style={BODY}>
          The weights ws, wa, wc determine swarm personality. ws ≫ wc: agents repel
          (spread out). wc ≫ ws: agents cluster (single point). wa high: agents align
          into lanes. Tuning these produces different collective modes.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Relation to Particle Swarm Optimisation</h3>
          <Tag label="PSO" color="#10d98a" />
        </div>
        <p style={BODY}>
          PSO repurposes the cohesion and alignment ideas for optimisation. Each
          particle tracks its personal best (pbest) and the swarm&apos;s global best (gbest):
        </p>
        <code style={EQ}>{`v_new = w·v + c1·r1·(pbest − x) + c2·r2·(gbest − x)
x_new = x + v_new

w: inertia (exploration vs exploitation)
c1: cognitive (pull toward personal best)
c2: social    (pull toward global best)`}</code>
        <p style={BODY}>
          PSO is competitive with gradient-free methods on non-convex, multimodal
          functions. The swarm collaboratively explores the fitness landscape without
          gradients.
        </p>
      </div>

    </div>
  );
}

// ── Manipulation ──────────────────────────────────────────────────────────────

export function ManipulationConcept() {
  return (
    <div style={{ maxWidth: 720 }}>

      <div style={CARD}>
        <h3 style={H3}>Contact Mechanics</h3>
        <p style={BODY}>
          A grasp is a set of contacts between the robot hand and the object. Each contact
          exerts forces and torques on the object. The question is: does this set of contacts
          prevent all object motion? That&apos;s grasping theory in a nutshell.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Friction Cone</h3>
          <Tag label="contact" color="#ff6b35" />
        </div>
        <code style={EQ}>{`Coulomb friction:  |ft| ≤ μ·fn

fn: normal force (must be ≥ 0, pushing not pulling)
ft: tangential force components (friction)
μ:  coefficient of friction

Friction cone half-angle α = atan(μ)
Contact force must lie inside the cone to be feasible`}</code>
        <p style={BODY}>
          A contact can push but not pull. And the tangential force is bounded by μ times
          the normal force. A finger pressing perpendicularly can exert much more shear
          force than one pressing at a shallow angle.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Force Closure & Grasp Quality</h3>
          <Tag label="closure" color="#3b82f6" />
        </div>
        <code style={EQ}>{`Contact Jacobian: Jc maps contact forces → object wrench
  w = Jcᵀ · f_contacts

Force closure: ∃f s.t. Jcᵀ·f = w_ext  for all w_ext
  (can resist any external wrench)

Grasp quality ε = largest ball in wrench space
  (how much perturbation the grasp can absorb)

Quasi-static equilibrium:
  Jcᵀ·w + τ_ext = 0`}</code>
        <p style={BODY}>
          Form closure is purely geometric — no friction needed, gaps filled everywhere.
          Force closure requires friction but is much easier to achieve.
          Most practical robot grasps rely on force closure.
        </p>
      </div>

    </div>
  );
}

// ── VLA ───────────────────────────────────────────────────────────────────────

export function VLAConcept() {
  return (
    <div style={{ maxWidth: 720 }}>

      <div style={CARD}>
        <h3 style={H3}>Foundation Models for Robot Action</h3>
        <p style={BODY}>
          Vision-Language-Action models unify perception, language understanding, and
          motor control into a single neural network. Rather than hand-engineering a
          pipeline of perception → planning → control, a VLA is trained end-to-end on
          demonstrations and learns all three jointly.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Architecture: ViT + LLM + Action Decoder</h3>
          <Tag label="VLA" color="#8b5cf6" />
        </div>
        <code style={EQ}>{`Image → ViT patch encoder → visual tokens  [N_vis × d]
Text  → tokenizer       → text tokens    [N_txt × d]

Cross-attention fusion:
  Q = text tokens
  K, V = visual tokens + text tokens
  out = softmax(QKᵀ/√d) · V           → fused tokens

Action decoder → action tokens (tokenised joint deltas)

RT-2: repurposes LM token vocabulary for discrete actions
π0 / OpenVLA: flow matching for continuous action distributions`}</code>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Action Tokenisation</h3>
          <Tag label="tokenisation" color="#10d98a" />
        </div>
        <p style={BODY}>
          RT-2 (Brohan et al., 2023) quantises each action dimension into 256 bins and
          maps them to unused token IDs in the LLM vocabulary. The model literally
          speaks action commands in the same format as natural language. This leverages
          the full pretrained LLM capacity for generalisation without a separate action
          head.
        </p>
        <code style={EQ}>{`Δjoint_i → bin_idx ∈ {0..255} → token_id ∈ vocab
Action sequence: [tok_j1, tok_j2, ..., tok_j7, tok_grip]

Data flywheel: more demos → better generalisation
  → deployed robots collect more data → repeat`}</code>
      </div>

    </div>
  );
}

// ── LLM Brain ─────────────────────────────────────────────────────────────────

export function LLMBrainConcept() {
  return (
    <div style={{ maxWidth: 720 }}>

      <div style={CARD}>
        <h3 style={H3}>Task and Motion Planning with LLMs</h3>
        <p style={BODY}>
          Classical TAMP (Task And Motion Planning) requires symbolic descriptions of
          preconditions and effects. LLMs can substitute for the symbolic planner:
          given a goal in natural language, they generate sequences of robot primitives
          (pick, place, open, navigate) without explicit symbolic axioms.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>SayCan: Grounding Language in Affordances</h3>
          <Tag label="SayCan" color="#f59e0b" />
        </div>
        <code style={EQ}>{`Selected skill = argmax_i [ p_LLM(skill_i | goal)
                             × p_affordance(skill_i | state) ]

p_LLM:         probability that the skill advances the goal
p_affordance:  probability that the skill is currently feasible
               (learned from robot experience)`}</code>
        <p style={BODY}>
          Without affordance grounding, the LLM selects plausible-sounding but infeasible
          actions (e.g., &ldquo;open the fridge&rdquo; when you&apos;re across the room).
          The affordance term ensures the selected skill can actually be executed right now.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>ReAct Loop & Code-as-Policies</h3>
          <Tag label="ReAct" color="#3b82f6" />
        </div>
        <code style={EQ}>{`ReAct: Reason → Act → Observe → Reason → ...

Thought:  "I need to pick the red cup. It's on the left table."
Action:   pick("red cup")
Obs:      FAILED: no object at (0.3, 0.1, 0.05)
Thought:  "The pose estimate was wrong. Retry with vision."

Code-as-Policies: LLM generates Python that calls robot API
  def task():
      obj = detect("red block")
      arm.move_to(obj.pose)
      gripper.close()`}</code>
        <p style={BODY}>
          Failure modes: hallucinated state (LLM believes object is present when it isn&apos;t),
          geometric blindness (correct plan, wrong 3D pose), missing preconditions
          (skipping &ldquo;open gripper before grasping&rdquo;).
        </p>
      </div>

    </div>
  );
}

// ── World Models ──────────────────────────────────────────────────────────────

export function WorldModelConcept() {
  return (
    <div style={{ maxWidth: 720 }}>

      <div style={CARD}>
        <h3 style={H3}>Latent World Models</h3>
        <p style={BODY}>
          A world model learns to predict future observations given actions, operating
          in a compressed latent space. Rather than predicting raw pixels (expensive),
          it encodes observations into a compact state representation and predicts
          dynamics there. The agent can then plan entirely in the latent space —
          &ldquo;dreaming&rdquo; — without interacting with the real environment.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Encoder–Dynamics–Decoder</h3>
          <Tag label="RSSM" color="#8b5cf6" />
        </div>
        <code style={EQ}>{`Encoder:   f(o_t) → z_t           (obs → latent state)
Dynamics:  g(z_t, a_t) → z_{t+1} (transition model)
Decoder:   h(z_t) → ô_t           (reconstruct obs)

RSSM (Recurrent State Space Model, DreamerV3):
  z_t = deterministic h_t + stochastic s_t
  h_t = GRU(h_{t-1}, z_{t-1}, a_{t-1})
  s_t ~ Categorical (straight-through gradients)`}</code>
        <p style={BODY}>
          DreamerV3 (Hafner et al., 2023) shows that with the right architecture and
          loss balancing, a single agent can master tasks across domains from pixels
          alone: Atari, continuous control, Minecraft, BSuite — without domain-specific
          hyperparameters.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Sim-to-Real Gap & Domain Randomisation</h3>
          <Tag label="sim2real" color="#ff6b35" />
        </div>
        <code style={EQ}>{`Sim-to-real gap: δ = E[L_real] − E[L_sim]

Domain randomisation: sample sim params φ ~ p(φ)
  friction ∈ [0.3, 0.8], mass ∈ [0.8m, 1.2m],
  texture ∈ random, lighting ∈ random

If p(φ) covers the true real params φ_real,
  policy π trained on p(φ) transfers to real.

System identification: fit sim params to match
  real observations → reduces δ`}</code>
        <p style={BODY}>
          The goal: make the real world look like just another sample from the training
          distribution. OpenAI&apos;s Dactyl (Rubik&apos;s cube) used ADR (Automatic Domain
          Randomisation) to progressively expand the randomisation distribution as the
          policy improved.
        </p>
      </div>

    </div>
  );
}

// ── Edge AI ───────────────────────────────────────────────────────────────────

export function EdgeAIConcept() {
  return (
    <div style={{ maxWidth: 720 }}>

      <div style={CARD}>
        <h3 style={H3}>Inference on the Edge</h3>
        <p style={BODY}>
          A robot must make decisions in milliseconds using a CPU or small NPU, not a
          data-centre GPU. Model compression — quantisation, pruning, distillation —
          is the engineering discipline of shrinking models without sacrificing the
          accuracy they need for the task.
        </p>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>INT8 Quantisation</h3>
          <Tag label="quantisation" color="#10d98a" />
        </div>
        <code style={EQ}>{`Affine (asymmetric) quantisation:
  scale      = (max − min) / 255
  zero_point = round(−min / scale)
  q(x)       = round(x / scale) + zero_point  ∈ [0, 255]
  dq(q)      = (q − zero_point) · scale

Quantisation error: ε = x − dq(q(x)) ≤ scale/2
  ε_max ≈ (max − min) / 510

FP32 → INT8: 4× memory reduction, 2–4× speedup
FP32 → INT4: 8× reduction, ~3.5% accuracy drop typical`}</code>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ ...H3, marginBottom: 0 }}>Pruning & Distillation</h3>
          <Tag label="compression" color="#f59e0b" />
        </div>
        <code style={EQ}>{`Structured pruning: remove entire channels/heads
  → hardware-friendly, actual speedup

Unstructured pruning: zero individual weights
  → requires sparse compute for speedup

Magnitude pruning: remove weights with |w| < threshold
  Cliff at ~50% sparsity: accuracy degrades sharply

Knowledge distillation:
  L = α·L_task + (1−α)·KL(p_teacher/T ‖ p_student/T)
  T: temperature  (soften teacher probabilities)
  T > 1: teacher reveals more relative information`}</code>
        <p style={BODY}>
          The accuracy–latency Pareto frontier captures the tradeoff. The goal is to
          find the model on this frontier that meets the latency constraint with maximum
          accuracy. TinyML, ONNX Runtime, and TensorRT automate this search.
        </p>
      </div>

    </div>
  );
}
