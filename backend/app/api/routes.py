"""
REST API Routes for Traffic Signal AI system.
"""

import asyncio
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from ..schemas.models import (
    SimulationState,
    SimulationConfig,
    TrafficScenario,
    ControlMode,
    GAConfig,
    GAResult,
    ComparisonResult,
    FuzzyDecisionModel,
)
from ..simulation.engine import SimulationEngine
from ..optimization.genetic_algorithm import GeneticAlgorithmOptimizer
from ..simulation.benchmark import run_head_to_head_comparison

router = APIRouter(prefix="/api")

# Singleton simulation engine instance shared across endpoints
engine = SimulationEngine()

# GA state tracking
ga_optimizer_instance: Optional[GeneticAlgorithmOptimizer] = None
latest_ga_result: Optional[GAResult] = None
ga_task: Optional[asyncio.Task] = None


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI Traffic Signal Optimization Backend",
        "version": "1.0.0",
        "simulation_running": engine.is_running,
    }


@router.get("/simulation/state", response_model=SimulationState)
def get_simulation_state():
    state = engine.get_state()
    # Attach latest GA result if available
    state.ga_result = latest_ga_result
    return state


@router.post("/simulation/start")
async def start_simulation():
    engine.start()
    return {"status": "started", "is_running": True}


@router.post("/simulation/pause")
async def pause_simulation():
    engine.pause()
    return {"status": "paused", "is_paused": True}


@router.post("/simulation/resume")
async def resume_simulation():
    engine.resume()
    return {"status": "resumed", "is_paused": False}


@router.post("/simulation/reset")
async def reset_simulation():
    engine.reset()
    return {"status": "reset", "is_running": engine.is_running}


class ConfigUpdateRequest(BaseModel):
    arrival_rates: Optional[Dict[str, float]] = None
    min_green: Optional[float] = None
    max_green: Optional[float] = None
    sim_speed: Optional[float] = None
    mode: Optional[ControlMode] = None
    fixed_green_ns: Optional[float] = None
    fixed_green_ew: Optional[float] = None
    seed: Optional[int] = None


@router.post("/simulation/config")
def update_config(config_req: ConfigUpdateRequest):
    if config_req.arrival_rates is not None:
        for k, v in config_req.arrival_rates.items():
            if k in engine.config.arrival_rates:
                engine.config.arrival_rates[k] = max(1.0, min(60.0, float(v)))
    if config_req.min_green is not None:
        engine.config.min_green = max(5.0, min(30.0, float(config_req.min_green)))
        engine.scheduler.min_green = engine.config.min_green
        engine.fuzzy_controller.min_green = engine.config.min_green
    if config_req.max_green is not None:
        engine.config.max_green = max(30.0, min(120.0, float(config_req.max_green)))
        engine.scheduler.max_green = engine.config.max_green
        engine.fuzzy_controller.max_green = engine.config.max_green
    if config_req.sim_speed is not None:
        engine.config.sim_speed = max(0.2, min(5.0, float(config_req.sim_speed)))
    if config_req.mode is not None:
        engine.set_mode(config_req.mode)
    if config_req.fixed_green_ns is not None:
        engine.config.fixed_green_ns = max(10.0, min(90.0, float(config_req.fixed_green_ns)))
        engine.scheduler.fixed_green_ns = engine.config.fixed_green_ns
    if config_req.fixed_green_ew is not None:
        engine.config.fixed_green_ew = max(10.0, min(90.0, float(config_req.fixed_green_ew)))
        engine.scheduler.fixed_green_ew = engine.config.fixed_green_ew

    return {"status": "updated", "config": engine.config}


class ScenarioRequest(BaseModel):
    scenario: TrafficScenario


@router.post("/simulation/scenario")
def set_scenario(scenario_req: ScenarioRequest):
    engine.apply_scenario(scenario_req.scenario)
    return {
        "status": "scenario_applied",
        "scenario": scenario_req.scenario,
        "arrival_rates": engine.config.arrival_rates,
    }


class FuzzyDecisionRequest(BaseModel):
    ns_density: float = 15.0
    ns_queue: float = 8.0
    ns_wait_time: float = 25.0
    ew_density: float = 10.0
    ew_queue: float = 4.0
    ew_wait_time: float = 12.0


@router.post("/controller/decision", response_model=FuzzyDecisionModel)
def evaluate_fuzzy_decision(req: FuzzyDecisionRequest):
    decision = engine.fuzzy_controller.decide_phase(
        ns_metrics={"density": req.ns_density, "queue": req.ns_queue, "wait_time": req.ns_wait_time},
        ew_metrics={"density": req.ew_density, "queue": req.ew_queue, "wait_time": req.ew_wait_time},
        current_phase_name=engine.scheduler.current_phase.value,
        current_phase_elapsed=engine.scheduler.phase_time_elapsed,
    )
    return FuzzyDecisionModel(
        timestamp=engine.sim_time,
        inputs=decision["inputs"],
        memberships=decision["memberships"],
        active_rules=decision["active_rules"],
        phase_priorities=decision["phase_priorities"],
        selected_phase=decision["selected_phase"],
        recommended_green=decision["recommended_green"],
        reason=decision["reason"],
    )


async def _run_ga_background(config: GAConfig):
    global ga_optimizer_instance, latest_ga_result
    ga_optimizer_instance = GeneticAlgorithmOptimizer(
        config=config,
        min_green=engine.config.min_green,
        max_green=engine.config.max_green,
        yellow=engine.config.yellow_duration,
        all_red=engine.config.all_red_duration,
    )

    def on_update(res: GAResult):
        global latest_ga_result
        latest_ga_result = res

    result = await ga_optimizer_instance.run_async(progress_callback=on_update)
    latest_ga_result = result


@router.post("/optimization/start")
async def start_optimization(config: Optional[GAConfig] = None):
    global ga_task, latest_ga_result
    if ga_task and not ga_task.done():
        raise HTTPException(status_code=400, detail="Optimization is already running.")

    ga_config = config or GAConfig(scenario=engine.config.scenario)
    latest_ga_result = GAResult(
        is_running=True,
        progress=0.0,
        total_generations=ga_config.generations,
        scenario=ga_config.scenario.value,
    )
    ga_task = asyncio.create_task(_run_ga_background(ga_config))
    return {"status": "started", "config": ga_config}


@router.get("/optimization/status")
def get_optimization_status():
    global ga_optimizer_instance, latest_ga_result
    if ga_optimizer_instance and ga_optimizer_instance.is_running:
        return {
            "is_running": True,
            "progress": ga_optimizer_instance.progress,
            "current_generation": len(ga_optimizer_instance.history),
            "total_generations": ga_optimizer_instance.config.generations,
            "best_fitness": round(ga_optimizer_instance.best_fitness, 3),
        }
    if latest_ga_result:
        return {
            "is_running": False,
            "progress": 1.0,
            "current_generation": latest_ga_result.total_generations,
            "total_generations": latest_ga_result.total_generations,
            "best_fitness": latest_ga_result.best_fitness,
        }
    return {"is_running": False, "progress": 0.0, "message": "No optimization run yet"}


@router.get("/optimization/result", response_model=Optional[GAResult])
def get_optimization_result():
    return latest_ga_result


@router.post("/optimization/apply")
def apply_optimization():
    global latest_ga_result
    if not latest_ga_result or not latest_ga_result.optimized_timing:
        raise HTTPException(
            status_code=400, detail="No GA optimization results available to apply. Run optimization first."
        )

    timings = latest_ga_result.optimized_timing
    engine.scheduler.set_ga_timing(
        green_ns=timings["green_ns"],
        green_ew=timings["green_ew"],
    )
    engine.set_mode(ControlMode.FUZZY_GA_OPTIMIZED)
    latest_ga_result.applied = True

    return {
        "status": "applied",
        "mode": ControlMode.FUZZY_GA_OPTIMIZED,
        "applied_timings": timings,
    }


class ComparisonRequest(BaseModel):
    scenario: Optional[TrafficScenario] = None
    duration: float = 120.0


@router.post("/comparison/run", response_model=ComparisonResult)
def run_comparison(req: Optional[ComparisonRequest] = None):
    scenario = (req.scenario if req and req.scenario else engine.config.scenario)
    duration = req.duration if req else 120.0

    result = run_head_to_head_comparison(scenario=scenario, duration=duration)
    return result


@router.get("/metrics")
def get_metrics():
    state = engine.get_state()
    return {
        "total_vehicles_processed": state.total_vehicles_processed,
        "total_vehicles_waiting": state.total_vehicles_waiting,
        "avg_waiting_time": state.avg_waiting_time,
        "max_waiting_time": state.max_waiting_time,
        "avg_queue_length": state.avg_queue_length,
        "throughput": state.throughput,
        "congestion_level": state.congestion_level,
    }


@router.get("/decision/history")
def get_decision_history():
    """Returns the last 30 fuzzy controller decisions."""
    return {
        "history": engine.decision_history[-30:],
        "count": len(engine.decision_history),
    }


@router.get("/scheduler/state")
def get_scheduler_state():
    """Returns detailed signal scheduler state."""
    return {
        "current_phase": engine.scheduler.current_phase.value,
        "phase_time_elapsed": round(engine.scheduler.phase_time_elapsed, 2),
        "target_green_duration": round(engine.scheduler.target_green_duration, 2),
        "mode": engine.scheduler.mode.value,
        "min_green": engine.scheduler.min_green,
        "max_green": engine.scheduler.max_green,
        "yellow_duration": engine.scheduler.yellow_duration,
        "all_red_duration": engine.scheduler.all_red_duration,
        "fixed_green_ns": engine.scheduler.fixed_green_ns,
        "fixed_green_ew": engine.scheduler.fixed_green_ew,
        "ga_green_ns": engine.scheduler.ga_green_ns,
        "ga_green_ew": engine.scheduler.ga_green_ew,
        "countdown": round(max(0, engine.scheduler.get_phase_duration() - engine.scheduler.phase_time_elapsed), 1),
    }


@router.post("/optimization/cancel")
async def cancel_optimization():
    global ga_task, ga_optimizer_instance
    if ga_task and not ga_task.done():
        ga_task.cancel()
        if ga_optimizer_instance:
            ga_optimizer_instance.is_running = False
        return {"status": "cancelled"}
    return {"status": "not_running"}
