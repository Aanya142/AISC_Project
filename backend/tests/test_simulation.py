"""
Tests for Traffic Simulation Engine and Vehicle Kinematics.
"""

import pytest
from app.schemas.models import Direction, SignalState, TrafficScenario, ControlMode
from app.simulation.vehicles import Vehicle
from app.simulation.engine import SimulationEngine


def test_vehicle_kinematics_and_queue():
    v1 = Vehicle(direction=Direction.NORTH, distance_to_stop=10.0, speed=8.0)
    # Stop line is RED
    for _ in range(30):
        v1.update(dt=0.1, signal_state=SignalState.RED)

    # Vehicle should have stopped safely before or at stop line
    assert v1.distance_to_stop >= 0.0
    assert v1.speed < 0.5
    assert v1.is_waiting is True
    assert v1.wait_time > 0.0


def test_vehicle_safe_following_distance():
    # Leader stopped at stop line
    leader = Vehicle(direction=Direction.NORTH, distance_to_stop=0.0, speed=0.0)
    follower = Vehicle(direction=Direction.NORTH, distance_to_stop=15.0, speed=10.0)

    for _ in range(50):
        follower.update(dt=0.1, signal_state=SignalState.RED, leader=leader)

    # Follower must stop behind leader with safe gap (min_gap >= 5.5m)
    gap = follower.distance_to_stop - leader.distance_to_stop
    assert gap >= 5.0
    assert follower.speed < 0.5


def test_engine_reset_behavior():
    engine = SimulationEngine()
    engine.step(10.0)  # Simulate 10 seconds

    # Vehicles should have spawned
    assert any(len(cars) > 0 for cars in engine.vehicles.values())

    engine.reset()
    # All queues, counts, and timers must be cleared
    assert all(len(cars) == 0 for cars in engine.vehicles.values())
    assert engine.sim_time == 0.0
    assert engine.metrics_collector.total_processed == 0


def test_scenario_switching():
    engine = SimulationEngine()
    engine.apply_scenario(TrafficScenario.HEAVY_NORTH_SOUTH)
    assert engine.config.arrival_rates["NORTH"] == 32.0
    assert engine.config.arrival_rates["SOUTH"] == 32.0
    assert engine.config.arrival_rates["EAST"] == 8.0

    engine.apply_scenario(TrafficScenario.HIGH_CONGESTION)
    assert engine.config.arrival_rates["NORTH"] == 35.0
    assert engine.config.arrival_rates["EAST"] == 35.0
