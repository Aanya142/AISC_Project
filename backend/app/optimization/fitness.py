"""
Deterministic traffic workload fitness evaluator for the Genetic Algorithm.
Simulates candidate signal timing plans over reproducible arrival streams.
"""

from typing import List, Tuple, Dict, Any
import numpy as np
import random

from ..schemas.models import TrafficScenario, Direction


class WorkloadFitnessEvaluator:
    """
    Evaluates signal timing plan chromosomes [green_N, green_S, green_E, green_W]
    over a deterministic simulated traffic workload.
    """

    def __init__(
        self,
        scenario: TrafficScenario = TrafficScenario.BALANCED,
        duration_seconds: float = 180.0,
        fixed_seed: int = 42,
        min_green: float = 10.0,
        max_green: float = 60.0,
        yellow: float = 3.0,
        all_red: float = 2.0,
    ):
        self.scenario = scenario
        self.duration_seconds = duration_seconds
        self.fixed_seed = fixed_seed
        self.min_green = min_green
        self.max_green = max_green
        self.yellow = yellow
        self.all_red = all_red

        # Arrival rates for scenario (veh/min)
        self.arrival_rates = self._get_arrival_rates(scenario)

    def _get_arrival_rates(self, scenario: TrafficScenario) -> Dict[str, float]:
        if scenario == TrafficScenario.BALANCED:
            return {"NORTH": 15.0, "SOUTH": 15.0, "EAST": 15.0, "WEST": 15.0}
        elif scenario == TrafficScenario.HEAVY_NORTH_SOUTH:
            return {"NORTH": 32.0, "SOUTH": 32.0, "EAST": 8.0, "WEST": 8.0}
        elif scenario == TrafficScenario.HEAVY_EAST_WEST:
            return {"NORTH": 8.0, "SOUTH": 8.0, "EAST": 32.0, "WEST": 32.0}
        elif scenario == TrafficScenario.NORTH_SURGE:
            return {"NORTH": 45.0, "SOUTH": 16.0, "EAST": 12.0, "WEST": 12.0}
        elif scenario == TrafficScenario.HIGH_CONGESTION:
            return {"NORTH": 35.0, "SOUTH": 35.0, "EAST": 35.0, "WEST": 35.0}
        elif scenario == TrafficScenario.UNEVEN:
            return {"NORTH": 38.0, "SOUTH": 10.0, "EAST": 26.0, "WEST": 6.0}
        elif scenario == TrafficScenario.EAST_SURGE:
            return {"NORTH": 12.0, "SOUTH": 12.0, "EAST": 45.0, "WEST": 14.0}
        elif scenario == TrafficScenario.LOW_TRAFFIC:
            return {"NORTH": 5.0, "SOUTH": 5.0, "EAST": 5.0, "WEST": 5.0}
        return {"NORTH": 15.0, "SOUTH": 15.0, "EAST": 15.0, "WEST": 15.0}

    def evaluate(self, chromosome: List[float]) -> Tuple[float, Dict[str, float]]:
        """
        Evaluates a candidate chromosome [g_N, g_S, g_E, g_W].
        Phase 1 (NS) duration = max(g_N, g_S).
        Phase 2 (EW) duration = max(g_E, g_W).
        Returns: (fitness, metrics_dict)
        """
        # Enforce bounds
        g_n, g_s, g_e, g_w = [max(self.min_green, min(self.max_green, float(v))) for v in chromosome]
        g_ns = max(g_n, g_s)
        g_ew = max(g_e, g_w)

        # Deterministic simulation with fixed seed
        rng = random.Random(self.fixed_seed)
        dt = 0.5  # 0.5s evaluation steps
        steps = int(self.duration_seconds / dt)

        # Queue tracking (number of queued vehicles per direction)
        queues = {"NORTH": 0, "SOUTH": 0, "EAST": 0, "WEST": 0}
        # Waiting times per vehicle
        vehicle_wait_times: List[float] = []
        vehicles_processed = 0

        # Cycle setup
        cycle_len = g_ns + self.yellow + self.all_red + g_ew + self.yellow + self.all_red
        t_in_cycle = 0.0

        saturation_discharge_rate = 0.55  # veh per second when green (~2000 veh/hr/lane)

        queue_samples = []

        for step_idx in range(steps):
            t_in_cycle = (step_idx * dt) % cycle_len

            # Determine signal state
            if t_in_cycle < g_ns:
                ns_green = True
                ew_green = False
            elif t_in_cycle < g_ns + self.yellow + self.all_red:
                ns_green = False
                ew_green = False
            elif t_in_cycle < g_ns + self.yellow + self.all_red + g_ew:
                ns_green = False
                ew_green = True
            else:
                ns_green = False
                ew_green = False

            # Arrivals
            for d in ["NORTH", "SOUTH", "EAST", "WEST"]:
                lam = self.arrival_rates[d] / 60.0
                p_arr = 1.0 - np.exp(-lam * dt)
                if rng.random() < p_arr:
                    queues[d] += 1

            # Departures during green
            if ns_green:
                for d in ["NORTH", "SOUTH"]:
                    if queues[d] > 0 and rng.random() < (saturation_discharge_rate * dt):
                        queues[d] -= 1
                        vehicles_processed += 1
                        # Estimate waiting time: queue length * time in queue
                        vehicle_wait_times.append(min(120.0, queues[d] * 3.5 + 4.0))

            if ew_green:
                for d in ["EAST", "WEST"]:
                    if queues[d] > 0 and rng.random() < (saturation_discharge_rate * dt):
                        queues[d] -= 1
                        vehicles_processed += 1
                        vehicle_wait_times.append(min(120.0, queues[d] * 3.5 + 4.0))

            total_q = sum(queues.values())
            queue_samples.append(total_q)

        # Calculate metrics
        avg_wait = float(np.mean(vehicle_wait_times)) if vehicle_wait_times else 25.0
        max_wait = float(np.max(vehicle_wait_times)) if vehicle_wait_times else 40.0
        avg_queue = float(np.mean(queue_samples)) if queue_samples else 5.0
        throughput = float(vehicles_processed / (self.duration_seconds / 60.0))

        # Starvation penalty if directional green is too small compared to demand
        starvation_penalty = 0.0
        ns_demand = self.arrival_rates["NORTH"] + self.arrival_rates["SOUTH"]
        ew_demand = self.arrival_rates["EAST"] + self.arrival_rates["WEST"]
        demand_ratio = ns_demand / max(1.0, ew_demand)
        actual_ratio = g_ns / max(1.0, g_ew)

        # Discrepancy penalty
        starvation_penalty += abs(np.log(max(0.1, actual_ratio / demand_ratio))) * 15.0

        # Cost function J
        cost = (
            1.2 * avg_wait
            + 0.6 * max_wait
            + 1.5 * avg_queue
            - 0.4 * throughput
            + starvation_penalty
        )

        # Standard fitness: higher is better
        fitness = 1000.0 / (1.0 + max(1.0, cost))

        metrics = {
            "avg_wait": round(avg_wait, 2),
            "max_wait": round(max_wait, 2),
            "avg_queue": round(avg_queue, 2),
            "throughput": round(throughput, 2),
            "cost": round(cost, 2),
            "green_ns": round(g_ns, 1),
            "green_ew": round(g_ew, 1),
        }

        return fitness, metrics
