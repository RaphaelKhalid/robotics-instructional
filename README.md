# Interactive Robotics Course

An interactive robotics course covering 13 units of classical and modern robotics — from kinematics to foundation AI models. Each unit contains a concept explainer with real mathematics, a Canvas 2D simulation lab, and a puzzle that tests understanding.

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **React** with client components
- **Canvas 2D** — all simulations rendered with requestAnimationFrame loops
- **Framer Motion** — page and tab transitions
- **GSAP + ScrollTrigger** — scroll-reveal animations
- **Zustand** — progress state (visited units, solved puzzles)

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validate a production build

```bash
npm run lint
npm run build
npm run start
```

`npm run start` serves the build created by `npm run build`.

## Project structure

- `src/lib/units.ts` — the 13-unit catalog, slugs, descriptions, and puzzle
  assignments.
- `src/components/simulations/` — interactive Canvas 2D simulation labs.
- `src/components/puzzles/` — end-of-unit puzzles and checks.
- `src/app/units/[slug]/` — the route that assembles a unit's concepts,
  simulation, and puzzle.
- `src/components/hero/` and `src/components/ui/` — the landing-page visuals
  and shared course UI.

## Units

1. **Forward & Inverse Kinematics** — 2-link arm, FK/IK, Jacobian, singularities
2. **Path Planning & Search** — A\*, Dijkstra, BFS, weighted terrain
3. **SLAM** — EKF-SLAM, Bayes filter, loop closure, uncertainty ellipse
4. **PID Control** — P/I/D terms, step response, Ziegler–Nichols tuning
5. **Sensor Fusion & Kalman Filtering** — predict–update cycle, Kalman gain intuition
6. **Robot Dynamics & Trajectories** — Lagrangian mechanics, pendulum, quintic trajectories
7. **Computer Vision for Robotics** — pinhole model, Sobel, Harris corners, visual servoing
8. **Swarm & Multi-Agent Robotics** — Reynolds flocking, separation/alignment/cohesion, PSO
9. **Manipulation & Grasping** — friction cone, force closure, grasp quality metric
10. **Vision-Language-Action Models** — ViT patch embeddings, cross-attention fusion, RT-2/π0
11. **LLM as Robot Brain** — SayCan, ReAct loop, code-as-policies, hallucination failure modes
12. **World Models & Sim-to-Real** — RSSM/DreamerV3, latent dynamics, domain randomisation
13. **Edge AI for Robotics** — INT8 quantisation, pruning, knowledge distillation, Pareto tradeoffs