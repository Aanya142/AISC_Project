"""
Tests for FastAPI Endpoints using TestClient.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.models import TrafficScenario, ControlMode

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "simulation_running" in data


def test_simulation_lifecycle_endpoints():
    r_start = client.post("/api/simulation/start")
    assert r_start.status_code == 200
    assert r_start.json()["is_running"] is True

    r_pause = client.post("/api/simulation/pause")
    assert r_pause.status_code == 200
    assert r_pause.json()["is_paused"] is True

    r_resume = client.post("/api/simulation/resume")
    assert r_resume.status_code == 200
    assert r_resume.json()["is_paused"] is False

    r_reset = client.post("/api/simulation/reset")
    assert r_reset.status_code == 200


def test_simulation_state_endpoint():
    response = client.get("/api/simulation/state")
    assert response.status_code == 200
    state = response.json()
    assert "current_phase" in state
    assert "directions" in state
    assert "NORTH" in state["directions"]
    assert "SOUTH" in state["directions"]
    assert "EAST" in state["directions"]
    assert "WEST" in state["directions"]
    assert "throughput" in state


def test_scenario_update_endpoint():
    response = client.post("/api/simulation/scenario", json={"scenario": "HEAVY_NORTH_SOUTH"})
    assert response.status_code == 200
    data = response.json()
    assert data["scenario"] == "HEAVY_NORTH_SOUTH"
    assert data["arrival_rates"]["NORTH"] == 32.0


def test_fuzzy_decision_endpoint():
    response = client.post(
        "/api/controller/decision",
        json={
            "ns_density": 22.0,
            "ns_queue": 12.0,
            "ns_wait_time": 35.0,
            "ew_density": 5.0,
            "ew_queue": 1.0,
            "ew_wait_time": 4.0,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["selected_phase"] == "NS"
    assert data["phase_priorities"]["NS"] > data["phase_priorities"]["EW"]
    assert len(data["active_rules"]) > 0


def test_comparison_endpoint():
    response = client.post("/api/comparison/run", json={"scenario": "BALANCED", "duration": 20.0})
    assert response.status_code == 200
    comp = response.json()
    assert "fixed_metrics" in comp
    assert "fuzzy_metrics" in comp
    assert "fuzzy_ga_metrics" in comp
    assert "fuzzy_vs_fixed_improvement" in comp
