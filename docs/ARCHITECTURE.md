# System Architecture & Technical Design

This document details the architectural layout, subsystem interactions, execution loops, safety guarantees, and communication patterns of the **AI-Based Adaptive Traffic Signal Optimization System (AISC)**.

---

## 1. High-Level Component Diagram

```
+========================================================================================+
|                                    PRESENTATION TIER                                   |
|                                                                                        |
|   +--------------------------------------------------------------------------------+   |
|   |                          REACT 18 + VITE FRONTEND                              |   |
|   |                                                                                |   |
|   |   +--------------------------+  +------------------------+  +----------------+ |   |
|   |   | IntersectionSimulation   |  | FuzzyExplainerPanel    |  | MetricCard /   | |   |
|   |   | (HTML5 Canvas 4-Way Junc)|  | (Memberships & Rules)  |  | DirectionCard  | |   |
|   |   +--------------------------+  +------------------------+  +----------------+ |   |
|   |   +--------------------------+  +------------------------+  +----------------+ |   |
|   |   | OptimizationPanel        |  | ComparisonPanel        |  | Simulation     | |   |
|   |   | (GA Convergence Chart)   |  | (Side-by-side tables)  |  | Controls       | |   |
|   |   +--------------------------+  +------------------------+  +----------------+ |   |
|   |                                                                                |   |
|   |   State Polling (250ms)        REST Commands (Start/Stop/Scenario/GA)         |   |
|   |   useSimulation Hook <=======> Frontend API Service (services/api.js)          |   |
|   +--------------------------------------------------------------------------------+   |
+========================================================================================+
                                        |  HTTP / JSON
                                        v
+========================================================================================+
|                                    APPLICATION TIER                                    |
|                                                                                        |
|   +--------------------------------------------------------------------------------+   |
|   |                             FASTAPI REST SERVER                                |   |
|   |                 (backend/app/main.py, backend/app/api/routes.py)               |   |
|   |                                                                                |   |
|   |   Endpoints:                                                                   |   |
|   |   GET  /api/health                     GET  /api/simulation/state             |   |
|   |   POST /api/simulation/start           POST /api/simulation/pause             |   |
|   |   POST /api/simulation/resume          POST /api/simulation/reset             |   |
|   |   POST /api/simulation/scenario        POST /api/simulation/config            |   |
|   |   POST /api/controller/decision        GET  /api/metrics                       |   |
|   |   POST /api/optimization/start         GET  /api/optimization/status           |   |
|   |   GET  /api/optimization/result        POST /api/optimization/apply            |   |
|   |   POST /api/comparison/run                                                     |   |
|   +--------------------------------------------------------------------------------+   |
|                                        |                                               |
|         +------------------------------+-----------------------------+                 |
|         | Synchronous API Access                                     | Background Task |
|         v                                                            v                 |
|   +-------------------------------+                          +---------------------+   |
|   |       SIMULATION ENGINE       |                          |  GENETIC ALGORITHM  |   |
|   | (backend/app/simulation/      |                          |      OPTIMIZER      |   |
|   |  engine.py)                   |                          | (backend/app/       |   |
|   |                               |                          |  optimization/      |   |
|   |  - 10Hz Async Physics Loop    |                          |  genetic_           |   |
|   |  - Poisson Vehicle Generator  |                          |  algorithm.py)      |   |
|   |  - Kinematic Car-Following    |                          |                     |   |
|   |  - Spatial Intersection Model |                          |  - Pop Size: 30     |   |
|   |  - Real-Time Aggregator       |                          |  - Generations: 20  |   |
|   +-------------------------------+                          |  - Tournament: k=3  |   |
|         |                   ^                                |  - Blend Crossover  |   |
|         | Metrics           | Signal States                  |  - Gaussian Mutation|   |
|         v                   |                                +---------------------+   |
|   +--------------------+    |                                        |                 |
|   |  MAMDANI FUZZY     |    |                                        |                 |
|   |  CONTROLLER        |    |                                        | Evaluates       |
|   | (fuzzy_            |    |                                        | Deterministic   |
|   |  controller.py)    |    |                                        | Workloads       |
|   |                    |    |                                        v                 |
|   | - 3 Crisp Inputs   |    |                                +---------------------+   |
|   | - 13 Rules Base    |    |                                |  WORKLOAD FITNESS   |   |
|   | - Centroid Defuzz  |    |                                |      EVALUATOR      |   |
|   +--------------------+    |                                | (backend/app/       |   |
|         |                   |                                |  optimization/      |   |
|         | Priority & Green  |                                |  fitness.py)        |   |
|         v                   |                                +---------------------+   |
|   +-------------------------------+                                  |                 |
|   |     SAFE SIGNAL SCHEDULER     | <========= Optimal Base =========+                 |
|   | (controllers/signal_          |            Green Allocations                       |
|   |  scheduler.py)                |                                                    |
|   |                               |                                                    |
|   | - 6 Phase Conflict-Free FSM   |                                                    |
|   | - Yellow Clearance (3.0s)     |                                                    |
|   | - All-Red Clearance (2.0s)    |                                                    |
|   | - Min Green Enforced (10.0s)  |                                                    |
|   | - Max Green Enforced (60.0s)  |                                                    |
|   +-------------------------------+                                                    |
+========================================================================================+
```

---

## 2. End-to-End Data Flow

The system coordinates continuous telemetry and asynchronous actuation through decoupled, stateful loops:

```
[ FRONTEND CLIENT ]                              [ FASTAPI BACKEND ]                     [ SIMULATION ENGINE ]
        |                                                 |                                        |
        | --- 1. GET /api/simulation/state -------------> |                                        |
        |    (every 250ms via useSimulation hook)         | --- 2. engine.get_state() -----------> |
        |                                                 |                                        |
        |                                                 | <--- 3. Pydantic SimulationState ------ |
        | <--- 4. HTTP 200 OK (JSON Snapshot) ----------- |         (Vehicles, signals, metrics,   |
        |                                                           fuzzy memberships, GA state)   |
        |                                                                                          |
        | === 5. React Re-render ========================                                          |
        |  a. Canvas redraws vehicle positions & lights                                            |
        |  b. MetricCards update delays, throughput, queues                                        |
        |  c. FuzzyExplainer renders firing bars & reason                                          |
        |  d. Countdowns tick down to next phase change                                            |
        |                                                                                          |
        | --- 6. User Action: POST /api/simulation/scenario -> |                                   |
        |                                                 | --- 7. engine.apply_scenario() -------> |
        | <--- 8. HTTP 200 OK (Updated) ------------------ |                                        |
```

### Telemetry Payload Structure (`SimulationState`):
1. **Timing & Phase**: `timestamp`, `current_phase` (`NS_GREEN`, `NS_YELLOW`, etc.), `phase_time_elapsed`, `phase_duration`, `countdown`.
2. **Directional Metrics**: For `NORTH`, `SOUTH`, `EAST`, `WEST`:
   - `queue_length`, `vehicle_count`, `density`, `avg_waiting_time`, `max_waiting_time`, `signal_state`, `priority_score`, `recommended_green`.
3. **Microscopic Vehicle Spatial Array**: Each vehicle has `id`, `direction`, `distance_to_stop` ($m$), `speed` ($m/s$), `is_waiting` ($bool$), and `wait_time` ($s$).
4. **Aggregate KPIs**: `total_vehicles_processed`, `total_vehicles_waiting`, `avg_waiting_time`, `max_waiting_time`, `avg_queue_length`, `throughput` ($veh/min$), `congestion_level`.
5. **Active Explainability Payloads**:
   - `active_fuzzy_decision`: Crisp inputs, fuzzified membership degrees, active rule activations with firing strengths, selected corridor, and natural-language justification string.
   - `ga_result`: Latest optimization status, progress ($0.0 \dots 1.0$), convergence history, and best chromosome.

---

## 3. Simulation Execution Loop

The simulation runs asynchronously in Python's `asyncio` event loop at **10 Hz** ($\Delta t = 0.1$\,s), with the following sequence executed on every tick:

```
               +------------------------------------------------+
               |              START SIMULATION TICK             |
               |          dt = 0.1s * config.sim_speed          |
               +------------------------------------------------+
                                       |
                                       v
               +------------------------------------------------+
               | 1. SPAWN INCOMING VEHICLES                     |
               |    - Poisson arrival probability:              |
               |      P(arr) = 1 - exp(-(rate/60) * dt)         |
               |    - Enforce spatial clearance at entry:       |
               |      last_car.distance < (APPROACH_LENGTH - 8) |
               +------------------------------------------------+
                                       |
                                       v
               +------------------------------------------------+
               | 2. AGGREGATE DIRECTIONAL METRICS               |
               |    - Count stopped vehicles (speed < 0.2 m/s)  |
               |    - Compute mean wait time per approach       |
               |    - Synthesize NS and EW corridor metrics     |
               +------------------------------------------------+
                                       |
                                       v
               +------------------------------------------------+
               | 3. FUZZY CONTROLLER INFERENCE                  |
               |    - Fuzzify Density, Queue, and Wait Time     |
               |    - Evaluate 13 Mamdani rules (min conjunction|
               |    - Centroid defuzzification of Priority &    |
               |      Recommended Green duration                |
               |    - Apply starvation safety bonus if wait>45s |
               +------------------------------------------------+
                                       |
                                       v
               +------------------------------------------------+
               | 4. ADVANCE SIGNAL SCHEDULER                    |
               |    - scheduler.step(dt, fuzzy_decision)        |
               |    - Evaluate termination criteria:            |
               |      elapsed >= min_green AND                  |
               |      (elapsed >= max_green OR priority delta)  |
               |    - Advance FSM phase if criteria met         |
               +------------------------------------------------+
                                       |
                                       v
               +------------------------------------------------+
               | 5. UPDATE VEHICLE KINEMATICS                   |
               |    - Car-following acceleration/braking        |
               |    - Red/Yellow stop-line deceleration         |
               |    - Green intersection crossing               |
               |    - Despawn vehicles past DEPARTURE_LENGTH    |
               +------------------------------------------------+
                                       |
                                       v
               +------------------------------------------------+
               | 6. UPDATE PERFORMANCE METRICS                  |
               |    - Record completed vehicle trip times       |
               |    - Sample average queue lengths              |
               |    - Calculate instantaneous throughput        |
               +------------------------------------------------+
                                       |
                                       v
               +------------------------------------------------+
               |             AWAIT ASYNCIO.SLEEP(0.1s)          |
               +------------------------------------------------+
```

---

## 4. Signal Scheduler Finite State Machine (FSM)

The signal scheduler (`backend/app/controllers/signal_scheduler.py`) ensures that physical signals never permit conflicting movements:

```
                           +----------------------+
            +------------> |       NS_GREEN       | <-------------------+
            |              | Lights: N=G,S=G,E=R,W=R                    |
            |              | Duration: target_green                     |
            |              +----------------------+                     |
            |                         |                                 |
            |                         | elapsed >= min_green &          |
            |                         | (elapsed >= target OR priority) |
            |                         v                                 |
            |              +----------------------+                     |
            |              |      NS_YELLOW       |                     |
            |              | Lights: N=Y,S=Y,E=R,W=R                    |
            |              | Duration: 3.0s fixed                       |
            |              +----------------------+                     |
            |                         |                                 |
            |                         | elapsed >= 3.0s                 |
            |                         v                                 |
            |              +----------------------+                     |
            |              |      ALL_RED_1       |                     |
            |              | Lights: N=R,S=R,E=R,W=R                    |
            |              | Duration: 2.0s fixed                       |
            |              +----------------------+                     |
            |                         |                                 |
            |                         | elapsed >= 2.0s                 |
            |                         v                                 |
            |              +----------------------+                     |
            |              |       EW_GREEN       |                     |
            |              | Lights: N=R,S=R,E=G,W=G                    |
            |              | Duration: target_green                     |
            |              +----------------------+                     |
            |                         |                                 |
            |                         | elapsed >= min_green &          |
            |                         | (elapsed >= target OR priority) |
            |                         v                                 |
            |              +----------------------+                     |
            |              |      EW_YELLOW       |                     |
            |              | Lights: N=R,S=R,E=Y,W=Y                    |
            |              | Duration: 3.0s fixed                       |
            |              +----------------------+                     |
            |                         |                                 |
            |                         | elapsed >= 3.0s                 |
            |                         v                                 |
            |              +----------------------+                     |
            |              |      ALL_RED_2       | --------------------+
            |              | Lights: N=R,S=R,E=R,W=R  elapsed >= 2.0s
            |              | Duration: 2.0s fixed
            +------------- +----------------------+
```

### Safety Invariants Guaranteed by Design:
1. **Mutually Exclusive Movement**: Under no circumstance can North-South and East-West both display Green or Yellow concurrently.
2. **Mandatory Clearance Intervals**: Transitioning between opposing greens strictly requires 3 seconds of Yellow warning followed by 2 seconds of All-Red clearance.
3. **Bounded Phase Durations**: Green phases are strictly constrained between $G_{\min} = 10.0$\,s and $G_{\max} = 60.0$\,s, preventing rapid flickering or indefinitely long greens.

---

## 5. API Design & REST Contracts

The backend exposes a clean RESTful interface adhering to OpenAPI 3.0 specifications:

| Endpoint | Method | Request Payload | Response Schema | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | *None* | `{"status": "healthy", ...}` | Liveness check |
| `/api/simulation/state` | `GET` | *None* | `SimulationState` | Complete telemetry snapshot |
| `/api/simulation/start` | `POST` | *None* | `{"status": "started"}` | Starts 10 Hz async loop |
| `/api/simulation/pause` | `POST` | *None* | `{"status": "paused"}` | Suspends physics updates |
| `/api/simulation/resume` | `POST` | *None* | `{"status": "resumed"}` | Resumes physics updates |
| `/api/simulation/reset` | `POST` | *None* | `{"status": "reset"}` | Clears all vehicles & state |
| `/api/simulation/scenario` | `POST` | `ScenarioRequest` | `{"status": "scenario_applied"}` | Sets predefined arrival rates |
| `/api/simulation/config` | `POST` | `ConfigUpdateRequest` | `{"status": "updated", ...}` | Updates parameters/speed/mode |
| `/api/controller/decision` | `POST` | `FuzzyDecisionRequest` | `FuzzyDecisionModel` | Stateless fuzzy inference test |
| `/api/optimization/start` | `POST` | `GAConfig` | `{"status": "started", ...}` | Dispatches background GA task |
| `/api/optimization/status` | `GET` | *None* | Status dictionary | Polling GA generation progress |
| `/api/optimization/result` | `GET` | *None* | `GAResult` | Retrieves full convergence data |
| `/api/optimization/apply` | `POST` | *None* | `{"status": "applied", ...}` | Applies GA timing to scheduler |
| `/api/comparison/run` | `POST` | `ComparisonRequest` | `ComparisonResult` | Runs 3-way benchmark test |
| `/api/metrics` | `GET` | *None* | Summary dictionary | Instantaneous metrics |

---

## 6. Frontend Architecture

The frontend is constructed using React 18, Vite, Tailwind CSS, Lucide icons, and Recharts.

```
frontend/src/
├── main.jsx                   # React DOM root entry point
├── App.jsx                    # Top-level shell rendering Dashboard
├── index.css                  # Global Tailwind styles & glassmorphism utilities
├── hooks/
│   └── useSimulation.js       # Central polling hook (250ms), state manager & action dispatcher
├── services/
│   └── api.js                 # Fetch wrapper for all backend REST endpoints
└── components/
    ├── Dashboard.jsx          # Primary UI layout: header, grid, cards, footer
    ├── IntersectionSimulation.jsx # HTML5 Canvas rendering vehicles, roads, lane markings, lights
    ├── TrafficSignal.jsx      # SVG traffic light housing with animated glow
    ├── DirectionCard.jsx      # Per-approach metrics (queue, density, wait, signal pill)
    ├── MetricCard.jsx         # Executive KPI card with Lucide icon and color accents
    ├── FuzzyExplainerPanel.jsx# Interactive 4-step Mamdani inspection view
    ├── OptimizationPanel.jsx  # GA controls, hyperparameter sliders & Recharts curve
    ├── ComparisonPanel.jsx    # Side-by-side performance comparison tables
    └── SimulationControls.jsx # Start, Pause, Reset, Speed, and Scenario buttons
```

### Component Breakdown & Interaction:
1. **`useSimulation` Hook**:
   - Manages a continuous `setInterval` polling loop (every 250\,ms) querying `/api/simulation/state`.
   - Exposes wrapped asynchronous dispatchers (`start`, `pause`, `reset`, `setScenario`, `updateRates`) that immediately re-fetch state upon completion for zero-latency UI responsiveness.
2. **`IntersectionSimulation` (Canvas Renderer)**:
   - Renders a 4-way crossroad at 60\,FPS via `requestAnimationFrame`.
   - Interpolates vehicle positions smoothly using absolute approach offsets.
   - Accurately renders stop lines, lane dividers, directional arrows, and physical traffic light heads reflecting actual scheduler states (`RED`, `YELLOW`, `GREEN`).
3. **`FuzzyExplainerPanel`**:
   - Decomposes the active Mamdani cycle into 4 visual steps:
     1. Fuzzification (animated percentage bars for Low/Med/High).
     2. Rule Evaluation (table of fired rules with individual firing weights).
     3. Aggregation & Defuzzification (resulting priority scores and green allocations).
     4. Final Decision & Reasoning (natural language justification for the current phase).
4. **`OptimizationPanel` & `ComparisonPanel`**:
   - Provides user controls for GA population size, generations, and mutation rates.
   - Plots generational fitness curves using Recharts.
   - Presents reproducible percentage improvement matrices across Average Waiting Time, Queue Length, and Throughput.
