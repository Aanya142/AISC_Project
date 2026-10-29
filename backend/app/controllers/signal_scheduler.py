"""
Fail-Safe Signal Phase Scheduler for Traffic Intersections.
Guarantees mutually exclusive non-conflicting green phases, clearance intervals,
and enforces minimum/maximum green bounds.
"""

from typing import Dict, Any, Optional
from ..schemas.models import Phase, SignalState, ControlMode


class SignalScheduler:
    def __init__(
        self,
        min_green: float = 10.0,
        max_green: float = 60.0,
        yellow_duration: float = 3.0,
        all_red_duration: float = 2.0,
        fixed_green_ns: float = 30.0,
        fixed_green_ew: float = 30.0,
    ):
        self.min_green = min_green
        self.max_green = max_green
        self.yellow_duration = yellow_duration
        self.all_red_duration = all_red_duration
        self.fixed_green_ns = fixed_green_ns
        self.fixed_green_ew = fixed_green_ew

        # GA-optimized parameters (when available)
        self.ga_green_ns: Optional[float] = None
        self.ga_green_ew: Optional[float] = None

        # State tracking
        self.current_phase = Phase.NS_GREEN
        self.phase_time_elapsed = 0.0
        self.target_green_duration = self.fixed_green_ns
        self.mode = ControlMode.FUZZY_ADAPTIVE

    def reset(self):
        """Resets the scheduler to initial safe state."""
        self.current_phase = Phase.NS_GREEN
        self.phase_time_elapsed = 0.0
        self.target_green_duration = (
            self.ga_green_ns if (self.mode == ControlMode.FUZZY_GA_OPTIMIZED and self.ga_green_ns)
            else self.fixed_green_ns
        )

    def set_ga_timing(self, green_ns: float, green_ew: float):
        """Sets GA optimized green timings."""
        self.ga_green_ns = max(self.min_green, min(self.max_green, float(green_ns)))
        self.ga_green_ew = max(self.min_green, min(self.max_green, float(green_ew)))

    def get_signal_states(self) -> Dict[str, SignalState]:
        """
        Returns guaranteed mutually exclusive signal state for all directions.
        """
        if self.current_phase == Phase.NS_GREEN:
            return {
                "NORTH": SignalState.GREEN,
                "SOUTH": SignalState.GREEN,
                "EAST": SignalState.RED,
                "WEST": SignalState.RED,
            }
        elif self.current_phase == Phase.NS_YELLOW:
            return {
                "NORTH": SignalState.YELLOW,
                "SOUTH": SignalState.YELLOW,
                "EAST": SignalState.RED,
                "WEST": SignalState.RED,
            }
        elif self.current_phase == Phase.ALL_RED_1 or self.current_phase == Phase.ALL_RED_2:
            return {
                "NORTH": SignalState.RED,
                "SOUTH": SignalState.RED,
                "EAST": SignalState.RED,
                "WEST": SignalState.RED,
            }
        elif self.current_phase == Phase.EW_GREEN:
            return {
                "NORTH": SignalState.RED,
                "SOUTH": SignalState.RED,
                "EAST": SignalState.GREEN,
                "WEST": SignalState.GREEN,
            }
        elif self.current_phase == Phase.EW_YELLOW:
            return {
                "NORTH": SignalState.RED,
                "SOUTH": SignalState.RED,
                "EAST": SignalState.YELLOW,
                "WEST": SignalState.YELLOW,
            }
        return {
            "NORTH": SignalState.RED,
            "SOUTH": SignalState.RED,
            "EAST": SignalState.RED,
            "WEST": SignalState.RED,
        }

    def get_phase_duration(self) -> float:
        """Returns the total duration for the current phase."""
        if self.current_phase in (Phase.NS_GREEN, Phase.EW_GREEN):
            return self.target_green_duration
        elif self.current_phase in (Phase.NS_YELLOW, Phase.EW_YELLOW):
            return self.yellow_duration
        elif self.current_phase in (Phase.ALL_RED_1, Phase.ALL_RED_2):
            return self.all_red_duration
        return 30.0

    def step(self, dt: float, fuzzy_decision: Optional[Dict[str, Any]] = None):
        """
        Advances scheduler by dt seconds and handles state transitions.
        Ensures minimum and maximum green constraints are strictly obeyed.
        """
        self.phase_time_elapsed += dt

        if self.current_phase == Phase.NS_GREEN:
            # Check if green phase should terminate
            should_terminate = False

            if self.mode == ControlMode.FIXED_TIME:
                should_terminate = self.phase_time_elapsed >= self.fixed_green_ns
            elif self.mode == ControlMode.FUZZY_ADAPTIVE:
                # Minimum green must be satisfied
                if self.phase_time_elapsed >= self.min_green:
                    # If max green reached, must terminate
                    if self.phase_time_elapsed >= self.max_green:
                        should_terminate = True
                    elif fuzzy_decision:
                        # Opposing phase has significantly higher priority or queue has cleared
                        ew_priority = fuzzy_decision["phase_priorities"]["EW"]
                        ns_priority = fuzzy_decision["phase_priorities"]["NS"]
                        # Terminate if EW priority > NS priority + 15 or target green achieved
                        if (ew_priority > ns_priority + 10.0 and self.phase_time_elapsed >= self.target_green_duration) or (self.phase_time_elapsed >= self.target_green_duration):
                            should_terminate = True
            elif self.mode == ControlMode.FUZZY_GA_OPTIMIZED:
                # Base green from GA, micro-adjusted by fuzzy
                base_target = self.ga_green_ns if self.ga_green_ns else self.fixed_green_ns
                if self.phase_time_elapsed >= self.min_green:
                    if self.phase_time_elapsed >= min(self.max_green, base_target + 10.0):
                        should_terminate = True
                    elif self.phase_time_elapsed >= base_target:
                        if fuzzy_decision and fuzzy_decision["phase_priorities"]["EW"] > fuzzy_decision["phase_priorities"]["NS"]:
                            should_terminate = True

            if should_terminate:
                self.current_phase = Phase.NS_YELLOW
                self.phase_time_elapsed = 0.0

        elif self.current_phase == Phase.NS_YELLOW:
            if self.phase_time_elapsed >= self.yellow_duration:
                self.current_phase = Phase.ALL_RED_1
                self.phase_time_elapsed = 0.0

        elif self.current_phase == Phase.ALL_RED_1:
            if self.phase_time_elapsed >= self.all_red_duration:
                self.current_phase = Phase.EW_GREEN
                self.phase_time_elapsed = 0.0
                # Establish target green duration for EW
                if self.mode == ControlMode.FIXED_TIME:
                    self.target_green_duration = self.fixed_green_ew
                elif self.mode == ControlMode.FUZZY_ADAPTIVE and fuzzy_decision:
                    self.target_green_duration = max(self.min_green, min(self.max_green, fuzzy_decision.get("recommended_green", 30.0)))
                elif self.mode == ControlMode.FUZZY_GA_OPTIMIZED:
                    base = self.ga_green_ew if self.ga_green_ew else self.fixed_green_ew
                    # Fuzzy micro-extension within [-5, +5] based on queue urgency
                    if fuzzy_decision and fuzzy_decision["phase_priorities"]["EW"] > 60:
                        base = min(self.max_green, base + 5.0)
                    self.target_green_duration = max(self.min_green, min(self.max_green, base))
                else:
                    self.target_green_duration = self.fixed_green_ew

        elif self.current_phase == Phase.EW_GREEN:
            should_terminate = False

            if self.mode == ControlMode.FIXED_TIME:
                should_terminate = self.phase_time_elapsed >= self.fixed_green_ew
            elif self.mode == ControlMode.FUZZY_ADAPTIVE:
                if self.phase_time_elapsed >= self.min_green:
                    if self.phase_time_elapsed >= self.max_green:
                        should_terminate = True
                    elif fuzzy_decision:
                        ns_priority = fuzzy_decision["phase_priorities"]["NS"]
                        ew_priority = fuzzy_decision["phase_priorities"]["EW"]
                        if (ns_priority > ew_priority + 10.0 and self.phase_time_elapsed >= self.target_green_duration) or (self.phase_time_elapsed >= self.target_green_duration):
                            should_terminate = True
            elif self.mode == ControlMode.FUZZY_GA_OPTIMIZED:
                base_target = self.ga_green_ew if self.ga_green_ew else self.fixed_green_ew
                if self.phase_time_elapsed >= self.min_green:
                    if self.phase_time_elapsed >= min(self.max_green, base_target + 10.0):
                        should_terminate = True
                    elif self.phase_time_elapsed >= base_target:
                        if fuzzy_decision and fuzzy_decision["phase_priorities"]["NS"] > fuzzy_decision["phase_priorities"]["EW"]:
                            should_terminate = True

            if should_terminate:
                self.current_phase = Phase.EW_YELLOW
                self.phase_time_elapsed = 0.0

        elif self.current_phase == Phase.EW_YELLOW:
            if self.phase_time_elapsed >= self.yellow_duration:
                self.current_phase = Phase.ALL_RED_2
                self.phase_time_elapsed = 0.0

        elif self.current_phase == Phase.ALL_RED_2:
            if self.phase_time_elapsed >= self.all_red_duration:
                self.current_phase = Phase.NS_GREEN
                self.phase_time_elapsed = 0.0
                # Establish target green duration for NS
                if self.mode == ControlMode.FIXED_TIME:
                    self.target_green_duration = self.fixed_green_ns
                elif self.mode == ControlMode.FUZZY_ADAPTIVE and fuzzy_decision:
                    self.target_green_duration = max(self.min_green, min(self.max_green, fuzzy_decision.get("recommended_green", 30.0)))
                elif self.mode == ControlMode.FUZZY_GA_OPTIMIZED:
                    base = self.ga_green_ns if self.ga_green_ns else self.fixed_green_ns
                    if fuzzy_decision and fuzzy_decision["phase_priorities"]["NS"] > 60:
                        base = min(self.max_green, base + 5.0)
                    self.target_green_duration = max(self.min_green, min(self.max_green, base))
                else:
                    self.target_green_duration = self.fixed_green_ns
