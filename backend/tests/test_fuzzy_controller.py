"""
Tests for Mamdani Fuzzy Controller.
Validates membership functions, inference rules, boundary handling, and starvation prevention.
"""

import pytest
from app.controllers.fuzzy_controller import FuzzyController, trimf, trapmf


def test_membership_functions():
    assert trimf(10.0, 5.0, 10.0, 15.0) == 1.0
    assert trimf(5.0, 5.0, 10.0, 15.0) == 0.0
    assert trimf(7.5, 5.0, 10.0, 15.0) == 0.5
    assert trimf(2.0, 5.0, 10.0, 15.0) == 0.0
    assert trimf(18.0, 5.0, 10.0, 15.0) == 0.0

    assert trapmf(10.0, 5.0, 8.0, 12.0, 15.0) == 1.0
    assert trapmf(6.5, 5.0, 8.0, 12.0, 15.0) == 0.5
    assert trapmf(13.5, 5.0, 8.0, 12.0, 15.0) == 0.5
    assert trapmf(2.0, 5.0, 8.0, 12.0, 15.0) == 0.0


def test_low_traffic_low_wait():
    controller = FuzzyController(min_green=10.0, max_green=60.0)
    p, g, rules, memberships = controller.infer_directional(
        density=2.0, queue=0.0, wait_time=2.0
    )
    # Low demand should yield low priority and short green time
    assert 0.0 <= p <= 40.0
    assert controller.min_green <= g <= 25.0
    assert len(rules) > 0


def test_high_density_long_wait():
    controller = FuzzyController(min_green=10.0, max_green=60.0)
    p, g, rules, memberships = controller.infer_directional(
        density=28.0, queue=18.0, wait_time=55.0
    )
    # Heavy demand should yield high priority and long green
    assert p >= 70.0
    assert g >= 40.0
    assert any(r["rule_id"] in ("R1", "R2", "R4") for r in rules)


def test_long_wait_moderate_density():
    controller = FuzzyController(min_green=10.0, max_green=60.0)
    p, g, rules, memberships = controller.infer_directional(
        density=14.0, queue=8.0, wait_time=50.0
    )
    # Long wait should trigger starvation avoidance and boost priority
    assert p >= 60.0
    assert g >= 30.0


def test_boundary_and_extreme_values():
    controller = FuzzyController(min_green=10.0, max_green=60.0)
    # Zero boundary
    p_zero, g_zero, _, _ = controller.infer_directional(0.0, 0.0, 0.0)
    assert 0.0 <= p_zero <= 100.0
    assert controller.min_green <= g_zero <= controller.max_green

    # Extreme overflow boundary
    p_high, g_high, _, _ = controller.infer_directional(100.0, 100.0, 300.0)
    assert 0.0 <= p_high <= 100.0
    assert controller.min_green <= g_high <= controller.max_green
    assert p_high >= 75.0


def test_phase_decision_comparison():
    controller = FuzzyController(min_green=10.0, max_green=60.0)
    # NS heavily loaded, EW empty
    ns_in = {"density": 25.0, "queue": 15.0, "wait_time": 40.0}
    ew_in = {"density": 3.0, "queue": 1.0, "wait_time": 5.0}

    decision = controller.decide_phase(
        ns_metrics=ns_in,
        ew_metrics=ew_in,
        current_phase_name="EW_GREEN",
        current_phase_elapsed=15.0,
    )

    assert decision["selected_phase"] == "NS"
    assert decision["phase_priorities"]["NS"] > decision["phase_priorities"]["EW"]
    assert "North-South demands priority" in decision["reason"]
