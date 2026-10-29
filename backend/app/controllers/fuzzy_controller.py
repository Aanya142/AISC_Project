"""
Mamdani-style Fuzzy Logic Inference Engine for Adaptive Traffic Signal Optimization.
Fully transparent, mathematical implementation without external blackbox dependencies.
"""

from typing import Dict, List, Tuple, Any
import numpy as np


def trimf(x: float, a: float, b: float, c: float) -> float:
    """Triangular membership function."""
    if b == a and x <= b:
        return 1.0
    if c == b and x >= b:
        return 1.0
    if x <= a or x >= c:
        return 0.0
    if a < x <= b:
        return (x - a) / (b - a) if b != a else 1.0
    if b < x < c:
        return (c - x) / (c - b) if c != b else 1.0
    return 0.0


def trapmf(x: float, a: float, b: float, c: float, d: float) -> float:
    """Trapezoidal membership function."""
    if x <= a or x >= d:
        return 0.0
    if b <= x <= c:
        return 1.0
    if a < x < b:
        return (x - a) / (b - a) if b != a else 1.0
    if c < x < d:
        return (d - x) / (d - c) if d != c else 1.0
    return 0.0


class FuzzyController:
    """
    Evaluates traffic urgency using real Mamdani fuzzy inference.
    Inputs:
      - Traffic Density (vehicles in road approach, 0 to 30)
      - Queue Length (vehicles stopped, 0 to 20)
      - Waiting Time (average stopped time in seconds, 0 to 60)
    Outputs:
      - Priority Score (0 to 100)
      - Recommended Green Duration (10s to 60s)
    """

    def __init__(self, min_green: float = 10.0, max_green: float = 60.0):
        self.min_green = min_green
        self.max_green = max_green

        # Output universes for defuzzification
        self.priority_universe = np.linspace(0.0, 100.0, 201)
        self.green_universe = np.linspace(min_green, max_green, 151)

    # ------------------- Fuzzification -------------------
    def fuzzify_density(self, density: float) -> Dict[str, float]:
        """Membership degrees for traffic density."""
        d = max(0.0, min(35.0, float(density)))
        return {
            "low": trapmf(d, 0.0, 0.0, 4.0, 10.0),
            "medium": trimf(d, 7.0, 15.0, 22.0),
            "high": trapmf(d, 18.0, 25.0, 35.0, 40.0),
        }

    def fuzzify_queue(self, queue: float) -> Dict[str, float]:
        """Membership degrees for queue length."""
        q = max(0.0, min(25.0, float(queue)))
        return {
            "short": trapmf(q, 0.0, 0.0, 2.0, 6.0),
            "medium": trimf(q, 4.0, 10.0, 16.0),
            "long": trapmf(q, 12.0, 18.0, 25.0, 30.0),
        }

    def fuzzify_wait(self, wait_sec: float) -> Dict[str, float]:
        """Membership degrees for average waiting time."""
        w = max(0.0, min(80.0, float(wait_sec)))
        return {
            "short": trapmf(w, 0.0, 0.0, 6.0, 16.0),
            "moderate": trimf(w, 12.0, 28.0, 44.0),
            "long": trapmf(w, 35.0, 50.0, 80.0, 100.0),
        }

    # ------------------- Output Membership Functions -------------------
    def output_priority_membership(self, term: str, y: np.ndarray) -> np.ndarray:
        term = term.lower()
        if term == "low":
            return np.array([trimf(v, 0.0, 15.0, 35.0) for v in y])
        elif term == "medium":
            return np.array([trimf(v, 25.0, 50.0, 75.0) for v in y])
        elif term == "high":
            return np.array([trimf(v, 65.0, 80.0, 95.0) for v in y])
        elif term == "very_high":
            return np.array([trapmf(v, 80.0, 92.0, 100.0, 100.0) for v in y])
        return np.zeros_like(y)

    def output_green_membership(self, term: str, y: np.ndarray) -> np.ndarray:
        term = term.lower()
        span = self.max_green - self.min_green
        g_low = self.min_green
        g_mid = self.min_green + 0.45 * span
        g_high = self.max_green

        if term == "short":
            return np.array([trapmf(v, g_low - 5.0, g_low, g_low + 0.2 * span, g_mid) for v in y])
        elif term == "medium":
            return np.array([trimf(v, g_low + 0.15 * span, g_mid, g_high - 0.1 * span) for v in y])
        elif term == "long":
            return np.array([trapmf(v, g_mid, g_high - 0.2 * span, g_high, g_high + 5.0) for v in y])
        return np.zeros_like(y)

    # ------------------- Rule Evaluation -------------------
    def evaluate_rules(
        self,
        mu_d: Dict[str, float],
        mu_q: Dict[str, float],
        mu_w: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """
        Evaluates Mamdani rule base using min-operator for conjunction.
        """
        rules = []

        def add_rule(
            rid: str,
            cond_desc: str,
            firing: float,
            p_out: str,
            g_out: str
        ):
            if firing > 0.001:
                rules.append({
                    "rule_id": rid,
                    "condition": cond_desc,
                    "firing_strength": round(float(firing), 4),
                    "consequent_priority": p_out,
                    "consequent_green": g_out,
                })

        # Rule 1: IF density is HIGH AND wait is LONG -> priority VERY_HIGH, green LONG
        add_rule("R1", "density HIGH & wait LONG",
                 min(mu_d["high"], mu_w["long"]),
                 "very_high", "long")

        # Rule 2: IF density is HIGH AND queue is LONG -> green LONG, priority HIGH
        add_rule("R2", "density HIGH & queue LONG",
                 min(mu_d["high"], mu_q["long"]),
                 "high", "long")

        # Rule 3: IF density is LOW AND wait is SHORT -> green SHORT, priority LOW
        add_rule("R3", "density LOW & wait SHORT",
                 min(mu_d["low"], mu_w["short"]),
                 "low", "short")

        # Rule 4: IF waiting time is LONG -> increase priority to VERY_HIGH
        add_rule("R4", "wait LONG (Starvation mitigation)",
                 mu_w["long"],
                 "very_high", "medium")

        # Rule 5: IF density is MEDIUM AND wait is MODERATE -> green MEDIUM, priority MEDIUM
        add_rule("R5", "density MEDIUM & wait MODERATE",
                 min(mu_d["medium"], mu_w["moderate"]),
                 "medium", "medium")

        # Rule 6: IF queue is LONG AND density is MEDIUM -> priority HIGH, green MEDIUM
        add_rule("R6", "queue LONG & density MEDIUM",
                 min(mu_q["long"], mu_d["medium"]),
                 "high", "medium")

        # Rule 7: IF wait is MODERATE AND queue is LONG -> priority HIGH, green LONG
        add_rule("R7", "wait MODERATE & queue LONG",
                 min(mu_w["moderate"], mu_q["long"]),
                 "high", "long")

        # Rule 8: IF density is LOW AND queue is SHORT -> priority LOW, green SHORT
        add_rule("R8", "density LOW & queue SHORT",
                 min(mu_d["low"], mu_q["short"]),
                 "low", "short")

        # Rule 9: IF density is HIGH AND queue is MEDIUM -> priority HIGH, green MEDIUM
        add_rule("R9", "density HIGH & queue MEDIUM",
                 min(mu_d["high"], mu_q["medium"]),
                 "high", "medium")

        # Rule 10: IF density is MEDIUM AND queue is SHORT -> priority MEDIUM, green SHORT
        add_rule("R10", "density MEDIUM & queue SHORT",
                 min(mu_d["medium"], mu_q["short"]),
                 "medium", "short")

        # Rule 11: IF queue is LONG AND wait is SHORT -> priority HIGH, green MEDIUM
        add_rule("R11", "queue LONG & wait SHORT",
                 min(mu_q["long"], mu_w["short"]),
                 "high", "medium")

        # Rule 12: IF queue is SHORT AND wait is MODERATE -> priority MEDIUM, green SHORT
        add_rule("R12", "queue SHORT & wait MODERATE",
                 min(mu_q["short"], mu_w["moderate"]),
                 "medium", "short")

        # Rule 13: IF density is MEDIUM AND queue is MEDIUM -> priority MEDIUM, green MEDIUM
        add_rule("R13", "density MEDIUM & queue MEDIUM",
                 min(mu_d["medium"], mu_q["medium"]),
                 "medium", "medium")

        return rules

    # ------------------- Defuzzification -------------------
    def defuzzify_centroid(self, y_values: np.ndarray, mu_values: np.ndarray, default_val: float) -> float:
        """Calculates Center of Gravity (Centroid) defuzzification."""
        denom = np.sum(mu_values)
        if denom < 1e-6:
            return float(default_val)
        num = np.sum(y_values * mu_values)
        return float(num / denom)

    def infer_directional(
        self,
        density: float,
        queue: float,
        wait_time: float
    ) -> Tuple[float, float, List[Dict[str, Any]], Dict[str, Any]]:
        """
        Runs complete inference for a single direction or aggregated stream.
        Returns: (priority_score, recommended_green, fired_rules, memberships)
        """
        mu_d = self.fuzzify_density(density)
        mu_q = self.fuzzify_queue(queue)
        mu_w = self.fuzzify_wait(wait_time)

        fired_rules = self.evaluate_rules(mu_d, mu_q, mu_w)

        # Aggregate output sets using max-min inference
        priority_agg = np.zeros_like(self.priority_universe)
        green_agg = np.zeros_like(self.green_universe)

        for rule in fired_rules:
            strength = rule["firing_strength"]
            p_shape = self.output_priority_membership(rule["consequent_priority"], self.priority_universe)
            g_shape = self.output_green_membership(rule["consequent_green"], self.green_universe)

            # Mamdani implication (min clipping)
            p_clipped = np.minimum(strength, p_shape)
            g_clipped = np.minimum(strength, g_shape)

            # Max aggregation
            priority_agg = np.maximum(priority_agg, p_clipped)
            green_agg = np.maximum(green_agg, g_clipped)

        # Defuzzification
        default_green = (self.min_green + self.max_green) / 2.0
        priority = self.defuzzify_centroid(self.priority_universe, priority_agg, default_val=30.0)
        green_time = self.defuzzify_centroid(self.green_universe, green_agg, default_val=default_green)

        # Ensure safety bounds
        green_time = max(self.min_green, min(self.max_green, green_time))
        priority = max(0.0, min(100.0, priority))

        memberships = {
            "density": {k: round(v, 4) for k, v in mu_d.items()},
            "queue": {k: round(v, 4) for k, v in mu_q.items()},
            "wait_time": {k: round(v, 4) for k, v in mu_w.items()},
        }

        return priority, green_time, fired_rules, memberships

    def decide_phase(
        self,
        ns_metrics: Dict[str, float],
        ew_metrics: Dict[str, float],
        current_phase_name: str,
        current_phase_elapsed: float
    ) -> Dict[str, Any]:
        """
        Full two-phase decision comparing North-South vs East-West.
        """
        p_ns, g_ns, rules_ns, mem_ns = self.infer_directional(
            ns_metrics.get("density", 0.0),
            ns_metrics.get("queue", 0.0),
            ns_metrics.get("wait_time", 0.0)
        )

        p_ew, g_ew, rules_ew, mem_ew = self.infer_directional(
            ew_metrics.get("density", 0.0),
            ew_metrics.get("queue", 0.0),
            ew_metrics.get("wait_time", 0.0)
        )

        # Add starvation safety boost: if a direction has waited very long without green
        if ns_metrics.get("wait_time", 0.0) > 45.0:
            p_ns = min(100.0, p_ns + 15.0)
        if ew_metrics.get("wait_time", 0.0) > 45.0:
            p_ew = min(100.0, p_ew + 15.0)

        # Select higher priority phase
        if p_ns >= p_ew:
            selected_phase = "NS"
            recommended_green = g_ns
            leading_rules = rules_ns
            reason = f"North-South demands priority ({p_ns:.1f} vs EW {p_ew:.1f}) based on queue={ns_metrics.get('queue', 0):.0f}, wait={ns_metrics.get('wait_time', 0):.1f}s"
        else:
            selected_phase = "EW"
            recommended_green = g_ew
            leading_rules = rules_ew
            reason = f"East-West demands priority ({p_ew:.1f} vs NS {p_ns:.1f}) based on queue={ew_metrics.get('queue', 0):.0f}, wait={ew_metrics.get('wait_time', 0):.1f}s"

        return {
            "inputs": {
                "NS": {k: round(float(v), 2) for k, v in ns_metrics.items()},
                "EW": {k: round(float(v), 2) for k, v in ew_metrics.items()},
            },
            "memberships": {
                "NS": mem_ns,
                "EW": mem_ew,
            },
            "active_rules": leading_rules,
            "phase_priorities": {
                "NS": round(p_ns, 2),
                "EW": round(p_ew, 2),
            },
            "selected_phase": selected_phase,
            "recommended_green": round(recommended_green, 1),
            "reason": reason,
        }
