"""
Metrics collector and statistical aggregator for traffic intersection simulation.
"""

from typing import Dict, List, Any
import numpy as np
from ..schemas.models import Direction, DirectionMetrics, BenchmarkMetrics


class MetricsCollector:
    def __init__(self):
        self.reset()

    def reset(self):
        self.total_processed = 0
        self.completed_wait_times: List[float] = []
        self.queue_history: List[int] = []
        self.simulation_elapsed = 0.0

    def record_processed_vehicle(self, wait_time: float):
        """Records a vehicle that successfully navigated the intersection."""
        self.total_processed += 1
        self.completed_wait_times.append(wait_time)

    def update(self, dt: float, current_queue: int):
        self.simulation_elapsed += dt
        self.queue_history.append(current_queue)
        # Keep max 500 history points to avoid unbound memory
        if len(self.queue_history) > 500:
            self.queue_history.pop(0)

    def get_summary(self, current_waiting_vehicles: List[float]) -> Dict[str, Any]:
        """
        Combines completed and currently waiting vehicle metrics.
        """
        all_waits = list(self.completed_wait_times) + current_waiting_vehicles
        avg_wait = float(np.mean(all_waits)) if all_waits else 0.0
        max_wait = float(np.max(all_waits)) if all_waits else 0.0
        avg_queue = float(np.mean(self.queue_history)) if self.queue_history else 0.0

        elapsed_minutes = max(0.01, self.simulation_elapsed / 60.0)
        throughput = float(self.total_processed / elapsed_minutes)

        # Congestion classification
        if avg_queue < 3.0 and avg_wait < 15.0:
            congestion = "Low"
        elif avg_queue < 7.0 and avg_wait < 30.0:
            congestion = "Moderate"
        elif avg_queue < 12.0 and avg_wait < 50.0:
            congestion = "High"
        else:
            congestion = "Critical"

        return {
            "total_processed": self.total_processed,
            "avg_waiting_time": round(avg_wait, 2),
            "max_waiting_time": round(max_wait, 2),
            "avg_queue_length": round(avg_queue, 2),
            "throughput": round(throughput, 2),
            "congestion_level": congestion,
        }

    def to_benchmark_metrics(self, current_waiting_vehicles: List[float]) -> BenchmarkMetrics:
        all_waits = list(self.completed_wait_times) + current_waiting_vehicles
        avg_wait = float(np.mean(all_waits)) if all_waits else 0.0
        max_wait = float(np.max(all_waits)) if all_waits else 0.0
        total_wait = float(np.sum(all_waits)) if all_waits else 0.0
        avg_queue = float(np.mean(self.queue_history)) if self.queue_history else 0.0
        elapsed_minutes = max(0.01, self.simulation_elapsed / 60.0)
        throughput = float(self.total_processed / elapsed_minutes)

        return BenchmarkMetrics(
            total_vehicles_processed=self.total_processed,
            total_waiting_time=round(total_wait, 2),
            avg_waiting_time=round(avg_wait, 2),
            max_waiting_time=round(max_wait, 2),
            avg_queue_length=round(avg_queue, 2),
            throughput=round(throughput, 2),
        )
