"""
Pydantic data models and schemas for Traffic Signal AI system.
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class Direction(str, Enum):
    NORTH = "NORTH"
    SOUTH = "SOUTH"
    EAST = "EAST"
    WEST = "WEST"


class SignalState(str, Enum):
    RED = "RED"
    YELLOW = "YELLOW"
    GREEN = "GREEN"


class Phase(str, Enum):
    NS_GREEN = "NS_GREEN"
    NS_YELLOW = "NS_YELLOW"
    ALL_RED_1 = "ALL_RED_1"
    EW_GREEN = "EW_GREEN"
    EW_YELLOW = "EW_YELLOW"
    ALL_RED_2 = "ALL_RED_2"


class ControlMode(str, Enum):
    FIXED_TIME = "FIXED_TIME"
    FUZZY_ADAPTIVE = "FUZZY_ADAPTIVE"
    FUZZY_GA_OPTIMIZED = "FUZZY_GA_OPTIMIZED"


class TrafficScenario(str, Enum):
    BALANCED = "BALANCED"
    HEAVY_NORTH_SOUTH = "HEAVY_NORTH_SOUTH"
    HEAVY_EAST_WEST = "HEAVY_EAST_WEST"
    NORTH_SURGE = "NORTH_SURGE"
    HIGH_CONGESTION = "HIGH_CONGESTION"
    UNEVEN = "UNEVEN"
    EAST_SURGE = "EAST_SURGE"
    LOW_TRAFFIC = "LOW_TRAFFIC"


class VehicleModel(BaseModel):
    id: str
    direction: Direction
    distance_to_stop: float = Field(description="Distance to stop line in meters")
    speed: float = Field(description="Speed in meters/second")
    is_waiting: bool = False
    wait_time: float = 0.0
    color: str = "#3b82f6"
    length: float = 4.5
    lane: int = 0


class DirectionMetrics(BaseModel):
    direction: Direction
    queue_length: int = 0
    vehicle_count: int = 0
    avg_waiting_time: float = 0.0
    max_waiting_time: float = 0.0
    arrival_rate: float = 15.0  # vehicles per minute
    density: float = 0.0  # normalized or vehicles/km
    signal_state: SignalState = SignalState.RED
    priority_score: float = 0.0
    recommended_green: float = 25.0


class FuzzyRuleFiring(BaseModel):
    rule_id: str
    condition: str
    firing_strength: float
    consequent_priority: str
    consequent_green: str


class FuzzyDecisionModel(BaseModel):
    timestamp: float
    inputs: Dict[str, Dict[str, float]]
    memberships: Dict[str, Dict[str, Dict[str, float]]]
    active_rules: List[FuzzyRuleFiring]
    phase_priorities: Dict[str, float]
    selected_phase: str
    recommended_green: float
    reason: str


class SimulationConfig(BaseModel):
    arrival_rates: Dict[str, float] = Field(
        default_factory=lambda: {
            "NORTH": 15.0,
            "SOUTH": 15.0,
            "EAST": 15.0,
            "WEST": 15.0,
        }
    )
    min_green: float = 10.0
    max_green: float = 60.0
    yellow_duration: float = 3.0
    all_red_duration: float = 2.0
    fixed_green_ns: float = 30.0
    fixed_green_ew: float = 30.0
    sim_speed: float = 1.0
    mode: ControlMode = ControlMode.FUZZY_ADAPTIVE
    scenario: TrafficScenario = TrafficScenario.BALANCED


class GAConfig(BaseModel):
    population_size: int = Field(default=30, ge=2, le=100)
    generations: int = Field(default=20, ge=1, le=50)
    mutation_rate: float = Field(default=0.15, ge=0.01, le=0.5)
    crossover_rate: float = Field(default=0.8, ge=0.4, le=1.0)
    scenario: TrafficScenario = TrafficScenario.BALANCED


class GenerationStat(BaseModel):
    generation: int
    best_fitness: float
    avg_fitness: float
    best_chromosome: List[float]


class GAResult(BaseModel):
    is_running: bool = False
    progress: float = 0.0
    current_generation: int = 0
    total_generations: int = 20
    best_fitness: float = 0.0
    avg_fitness: float = 0.0
    history: List[GenerationStat] = []
    best_chromosome: Optional[List[float]] = None
    optimized_timing: Optional[Dict[str, float]] = None
    applied: bool = False
    scenario: str = "BALANCED"


class SimulationState(BaseModel):
    timestamp: float
    is_running: bool
    is_paused: bool
    mode: ControlMode
    scenario: TrafficScenario
    current_phase: Phase
    phase_time_elapsed: float
    phase_duration: float
    countdown: float
    directions: Dict[str, DirectionMetrics]
    vehicles: List[VehicleModel]
    total_vehicles_processed: int
    total_vehicles_waiting: int
    avg_waiting_time: float
    max_waiting_time: float
    avg_queue_length: float
    throughput: float  # vehicles/min
    congestion_level: str
    active_fuzzy_decision: Optional[FuzzyDecisionModel] = None
    ga_result: Optional[GAResult] = None


class BenchmarkMetrics(BaseModel):
    total_vehicles_processed: int
    total_waiting_time: float
    avg_waiting_time: float
    max_waiting_time: float
    avg_queue_length: float
    throughput: float


class ComparisonResult(BaseModel):
    scenario: TrafficScenario
    duration_seconds: float
    fixed_metrics: BenchmarkMetrics
    fuzzy_metrics: BenchmarkMetrics
    fuzzy_ga_metrics: BenchmarkMetrics
    fuzzy_vs_fixed_improvement: Dict[str, float]
    ga_vs_fixed_improvement: Dict[str, float]
