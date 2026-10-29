"""
Authoritative Simulation Engine for 4-Way Traffic Intersection.
Coordinates vehicle generation, kinematics, signal scheduling, fuzzy control, and metrics.
"""

import asyncio
import time
import random
from typing import Dict, List, Optional
import numpy as np

from ..schemas.models import (
    Direction,
    SignalState,
    ControlMode,
    TrafficScenario,
    SimulationConfig,
    SimulationState,
    DirectionMetrics,
    FuzzyDecisionModel,
    GAResult,
)
from .vehicles import Vehicle
from .intersection import IntersectionGeometry
from ..controllers.signal_scheduler import SignalScheduler
from ..controllers.fuzzy_controller import FuzzyController
from ..metrics.collector import MetricsCollector


class SimulationEngine:
    def __init__(self, config: Optional[SimulationConfig] = None):
        self.config = config or SimulationConfig()
        self.scheduler = SignalScheduler(
            min_green=self.config.min_green,
            max_green=self.config.max_green,
            yellow_duration=self.config.yellow_duration,
            all_red_duration=self.config.all_red_duration,
            fixed_green_ns=self.config.fixed_green_ns,
            fixed_green_ew=self.config.fixed_green_ew,
        )
        self.fuzzy_controller = FuzzyController(
            min_green=self.config.min_green,
            max_green=self.config.max_green,
        )
        self.metrics_collector = MetricsCollector()

        # Vehicles organized by direction, sorted from closest to stop line to furthest
        self.vehicles: Dict[Direction, List[Vehicle]] = {
            Direction.NORTH: [],
            Direction.SOUTH: [],
            Direction.EAST: [],
            Direction.WEST: [],
        }

        self.is_running = False
        self.is_paused = False
        self.sim_time = 0.0
        self.last_fuzzy_decision: Optional[Dict] = None
        self.decision_history: List[Dict] = []
        self.ga_result: Optional[GAResult] = None

        # Background task handle
        self._task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

        # Apply initial scenario
        self.apply_scenario(self.config.scenario)

    def apply_scenario(self, scenario: TrafficScenario):
        """Adjusts arrival rates according to traffic scenario."""
        self.config.scenario = scenario
        if scenario == TrafficScenario.BALANCED:
            self.config.arrival_rates = {
                "NORTH": 15.0, "SOUTH": 15.0, "EAST": 15.0, "WEST": 15.0
            }
        elif scenario == TrafficScenario.HEAVY_NORTH_SOUTH:
            self.config.arrival_rates = {
                "NORTH": 32.0, "SOUTH": 32.0, "EAST": 8.0, "WEST": 8.0
            }
        elif scenario == TrafficScenario.HEAVY_EAST_WEST:
            self.config.arrival_rates = {
                "NORTH": 8.0, "SOUTH": 8.0, "EAST": 32.0, "WEST": 32.0
            }
        elif scenario == TrafficScenario.NORTH_SURGE:
            self.config.arrival_rates = {
                "NORTH": 45.0, "SOUTH": 16.0, "EAST": 12.0, "WEST": 12.0
            }
        elif scenario == TrafficScenario.HIGH_CONGESTION:
            self.config.arrival_rates = {
                "NORTH": 35.0, "SOUTH": 35.0, "EAST": 35.0, "WEST": 35.0
            }
        elif scenario == TrafficScenario.UNEVEN:
            self.config.arrival_rates = {
                "NORTH": 38.0, "SOUTH": 10.0, "EAST": 26.0, "WEST": 6.0
            }
        elif scenario == TrafficScenario.EAST_SURGE:
            self.config.arrival_rates = {
                "NORTH": 12.0, "SOUTH": 12.0, "EAST": 45.0, "WEST": 14.0
            }
        elif scenario == TrafficScenario.LOW_TRAFFIC:
            self.config.arrival_rates = {
                "NORTH": 5.0, "SOUTH": 5.0, "EAST": 5.0, "WEST": 5.0
            }

    def set_mode(self, mode: ControlMode):
        self.config.mode = mode
        self.scheduler.mode = mode

    def reset(self):
        """Cleans all simulation state, queues, metrics, and controllers."""
        self.vehicles = {
            Direction.NORTH: [],
            Direction.SOUTH: [],
            Direction.EAST: [],
            Direction.WEST: [],
        }
        self.scheduler.reset()
        self.metrics_collector.reset()
        self.sim_time = 0.0
        self.last_fuzzy_decision = None
        self.decision_history = []
        self.is_paused = False

    def spawn_vehicles(self, dt: float):
        """Generates vehicles based on Poisson arrival rates."""
        for direction in Direction:
            rate_per_min = self.config.arrival_rates.get(direction.value, 15.0)
            # Poisson probability for arrival in delta-t seconds
            # lambda_t = (rate / 60) * dt
            p_arrival = 1.0 - np.exp(-(rate_per_min / 60.0) * dt)

            if random.random() < p_arrival:
                # Check if entry point is clear (> 10m from furthest car)
                cars = self.vehicles[direction]
                if not cars or cars[-1].distance_to_stop < (IntersectionGeometry.APPROACH_LENGTH - 8.0):
                    v = Vehicle(
                        direction=direction,
                        distance_to_stop=IntersectionGeometry.APPROACH_LENGTH,
                        speed=8.0 + random.random() * 4.0,
                    )
                    cars.append(v)

    def step(self, dt: float):
        """Advances simulation by dt seconds."""
        self.sim_time += dt

        # 1. Spawn incoming vehicles
        self.spawn_vehicles(dt)

        # 2. Extract direction metrics for Fuzzy Logic
        dir_metrics = self._calculate_directional_metrics()
        ns_agg = {
            "density": (dir_metrics["NORTH"]["density"] + dir_metrics["SOUTH"]["density"]) / 2.0,
            "queue": dir_metrics["NORTH"]["queue"] + dir_metrics["SOUTH"]["queue"],
            "wait_time": max(dir_metrics["NORTH"]["wait_time"], dir_metrics["SOUTH"]["wait_time"]),
        }
        ew_agg = {
            "density": (dir_metrics["EAST"]["density"] + dir_metrics["WEST"]["density"]) / 2.0,
            "queue": dir_metrics["EAST"]["queue"] + dir_metrics["WEST"]["queue"],
            "wait_time": max(dir_metrics["EAST"]["wait_time"], dir_metrics["WEST"]["wait_time"]),
        }

        # 3. Fuzzy Controller decision
        self.last_fuzzy_decision = self.fuzzy_controller.decide_phase(
            ns_metrics=ns_agg,
            ew_metrics=ew_agg,
            current_phase_name=self.scheduler.current_phase.value,
            current_phase_elapsed=self.scheduler.phase_time_elapsed,
        )

        if self.last_fuzzy_decision:
            snapshot = {
                "sim_time": round(self.sim_time, 1),
                "selected_phase": self.last_fuzzy_decision["selected_phase"],
                "recommended_green": self.last_fuzzy_decision["recommended_green"],
                "ns_priority": self.last_fuzzy_decision["phase_priorities"]["NS"],
                "ew_priority": self.last_fuzzy_decision["phase_priorities"]["EW"],
                "reason": self.last_fuzzy_decision["reason"],
                "ns_queue": self.last_fuzzy_decision["inputs"]["NS"].get("queue", 0),
                "ew_queue": self.last_fuzzy_decision["inputs"]["EW"].get("queue", 0),
            }
            self.decision_history.append(snapshot)
            # Keep only last 30 entries
            if len(self.decision_history) > 30:
                self.decision_history = self.decision_history[-30:]

        # 4. Advance scheduler
        self.scheduler.step(dt, self.last_fuzzy_decision)
        signals = self.scheduler.get_signal_states()

        # 5. Update vehicle positions and queues
        total_queued = 0
        current_waiting_waits: List[float] = []

        for direction in Direction:
            sig = signals[direction.value]
            car_list = self.vehicles[direction]
            surviving_cars: List[Vehicle] = []

            for i, car in enumerate(car_list):
                leader = car_list[i - 1] if i > 0 else None
                car.update(dt, sig, leader)

                if car.is_waiting:
                    total_queued += 1
                    current_waiting_waits.append(car.wait_time)

                # Despawn when departed beyond clearance distance
                if car.distance_to_stop < -IntersectionGeometry.DEPARTURE_LENGTH:
                    self.metrics_collector.record_processed_vehicle(car.wait_time)
                else:
                    surviving_cars.append(car)

            self.vehicles[direction] = surviving_cars

        # 6. Update metrics
        self.metrics_collector.update(dt, total_queued)

    def _calculate_directional_metrics(self) -> Dict[str, Dict[str, float]]:
        metrics = {}
        for direction in Direction:
            cars = self.vehicles[direction]
            queue = sum(1 for c in cars if c.is_waiting)
            waits = [c.wait_time for c in cars if c.is_waiting]
            avg_w = float(np.mean(waits)) if waits else 0.0
            max_w = float(np.max(waits)) if waits else 0.0
            density = float(len(cars))

            metrics[direction.value] = {
                "density": density,
                "queue": float(queue),
                "wait_time": avg_w,
                "max_wait_time": max_w,
            }
        return metrics

    def get_state(self) -> SimulationState:
        """Returns full Pydantic snapshot of current simulation state."""
        signals = self.scheduler.get_signal_states()
        dir_metrics_raw = self._calculate_directional_metrics()

        all_waiting_waits: List[float] = []
        all_vehicles_models = []

        direction_models: Dict[str, DirectionMetrics] = {}
        for d in Direction:
            cars = self.vehicles[d]
            for c in cars:
                all_vehicles_models.append(c.to_model())
                if c.is_waiting:
                    all_waiting_waits.append(c.wait_time)

            dm = dir_metrics_raw[d.value]
            # Directional priority from fuzzy
            p_score = 0.0
            r_green = 25.0
            if self.last_fuzzy_decision:
                p_key = "NS" if d in (Direction.NORTH, Direction.SOUTH) else "EW"
                p_score = self.last_fuzzy_decision["phase_priorities"].get(p_key, 0.0)
                r_green = self.last_fuzzy_decision.get("recommended_green", 25.0)

            direction_models[d.value] = DirectionMetrics(
                direction=d,
                queue_length=int(dm["queue"]),
                vehicle_count=len(cars),
                avg_waiting_time=round(dm["wait_time"], 2),
                max_waiting_time=round(dm["max_wait_time"], 2),
                arrival_rate=self.config.arrival_rates.get(d.value, 15.0),
                density=round(dm["density"], 2),
                signal_state=signals[d.value],
                priority_score=round(p_score, 1),
                recommended_green=round(r_green, 1),
            )

        summary = self.metrics_collector.get_summary(all_waiting_waits)
        phase_duration = self.scheduler.get_phase_duration()
        countdown = max(0.0, phase_duration - self.scheduler.phase_time_elapsed)

        fuzzy_model = None
        if self.last_fuzzy_decision:
            fuzzy_model = FuzzyDecisionModel(
                timestamp=self.sim_time,
                inputs=self.last_fuzzy_decision["inputs"],
                memberships=self.last_fuzzy_decision["memberships"],
                active_rules=self.last_fuzzy_decision["active_rules"],
                phase_priorities=self.last_fuzzy_decision["phase_priorities"],
                selected_phase=self.last_fuzzy_decision["selected_phase"],
                recommended_green=self.last_fuzzy_decision["recommended_green"],
                reason=self.last_fuzzy_decision["reason"],
            )

        return SimulationState(
            timestamp=round(self.sim_time, 2),
            is_running=self.is_running,
            is_paused=self.is_paused,
            mode=self.config.mode,
            scenario=self.config.scenario,
            current_phase=self.scheduler.current_phase,
            phase_time_elapsed=round(self.scheduler.phase_time_elapsed, 2),
            phase_duration=round(phase_duration, 2),
            countdown=round(countdown, 1),
            directions=direction_models,
            vehicles=all_vehicles_models,
            total_vehicles_processed=summary["total_processed"],
            total_vehicles_waiting=len(all_waiting_waits),
            avg_waiting_time=summary["avg_waiting_time"],
            max_waiting_time=summary["max_waiting_time"],
            avg_queue_length=summary["avg_queue_length"],
            throughput=summary["throughput"],
            congestion_level=summary["congestion_level"],
            active_fuzzy_decision=fuzzy_model,
            ga_result=self.ga_result,
        )

    async def _run_loop(self):
        """Asynchronous execution loop for real-time simulation ticking."""
        dt = 0.1  # 100ms physics timestep
        while self.is_running:
            if not self.is_paused:
                async with self._lock:
                    effective_dt = dt * self.config.sim_speed
                    self.step(effective_dt)
            await asyncio.sleep(dt)

    def start(self):
        """Starts the simulation loop if not already running."""
        if not self.is_running:
            self.is_running = True
            self.is_paused = False
            try:
                loop = asyncio.get_running_loop()
                self._task = loop.create_task(self._run_loop())
            except RuntimeError:
                pass

    def pause(self):
        self.is_paused = True

    def resume(self):
        self.is_paused = False

    def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            self._task = None
