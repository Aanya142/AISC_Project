"""
Safety and Conflict Prevention Tests for Signal Scheduler.
Validates zero conflicting green states, yellow/clearance integrity, and minimum/maximum constraints.
"""

import pytest
from app.schemas.models import Phase, SignalState, ControlMode
from app.controllers.signal_scheduler import SignalScheduler


def test_no_conflicting_greens_anywhere():
    scheduler = SignalScheduler(
        min_green=10.0,
        max_green=30.0,
        yellow_duration=3.0,
        all_red_duration=2.0,
    )

    # Step through 2 full cycles (120 seconds in small steps)
    dt = 0.5
    for _ in range(240):
        scheduler.step(dt)
        signals = scheduler.get_signal_states()

        ns_green = signals["NORTH"] == SignalState.GREEN or signals["SOUTH"] == SignalState.GREEN
        ew_green = signals["EAST"] == SignalState.GREEN or signals["WEST"] == SignalState.GREEN

        # Conflicting green is strictly prohibited
        assert not (ns_green and ew_green), f"Conflict at phase {scheduler.current_phase}: {signals}"


def test_yellow_and_clearance_transitions():
    scheduler = SignalScheduler(
        min_green=10.0,
        max_green=30.0,
        yellow_duration=3.0,
        all_red_duration=2.0,
        fixed_green_ns=15.0,
    )
    scheduler.mode = ControlMode.FIXED_TIME

    # Advance until NS green expires
    for _ in range(30):
        scheduler.step(0.5)

    assert scheduler.current_phase == Phase.NS_YELLOW
    signals = scheduler.get_signal_states()
    assert signals["NORTH"] == SignalState.YELLOW
    assert signals["EAST"] == SignalState.RED

    # Step through yellow duration (3.0s)
    for _ in range(6):
        scheduler.step(0.5)

    assert scheduler.current_phase == Phase.ALL_RED_1
    signals = scheduler.get_signal_states()
    assert all(s == SignalState.RED for s in signals.values())

    # Step through all-red duration (2.0s)
    for _ in range(4):
        scheduler.step(0.5)

    assert scheduler.current_phase == Phase.EW_GREEN
    signals = scheduler.get_signal_states()
    assert signals["EAST"] == SignalState.GREEN
    assert signals["NORTH"] == SignalState.RED


def test_minimum_green_enforcement():
    scheduler = SignalScheduler(min_green=10.0, max_green=40.0)
    scheduler.mode = ControlMode.FUZZY_ADAPTIVE

    # Create artificial high urgency for opposing EW phase immediately
    opposing_urgent_fuzzy = {
        "phase_priorities": {"NS": 10.0, "EW": 99.0},
        "recommended_green": 10.0,
    }

    # Step for 5 seconds (< min_green of 10s)
    for _ in range(10):
        scheduler.step(0.5, opposing_urgent_fuzzy)

    # Must stay NS_GREEN because min_green (10.0s) has not elapsed
    assert scheduler.current_phase == Phase.NS_GREEN
    assert scheduler.phase_time_elapsed < 10.0
