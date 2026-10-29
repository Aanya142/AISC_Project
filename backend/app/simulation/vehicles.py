"""
Vehicle physics and kinematics simulation.
Implements safe car-following distance, deceleration at red lights, and queue tracking.
"""

from typing import Optional
import uuid
from ..schemas.models import Direction, VehicleModel, SignalState


class Vehicle:
    def __init__(
        self,
        direction: Direction,
        distance_to_stop: float = 120.0,
        speed: float = 10.0,
        color: Optional[str] = None,
        lane: int = 0,
    ):
        self.id = str(uuid.uuid4())[:8]
        self.direction = direction
        self.distance_to_stop = distance_to_stop  # meters to stop line (>0 approaching, <0 departed)
        self.speed = speed  # m/s
        self.max_speed = 12.0  # m/s (~43 km/h)
        self.acceleration = 2.5  # m/s^2
        self.deceleration = 3.5  # m/s^2
        self.length = 4.5  # meters
        self.min_gap = 6.0  # meters buffer between bumpers
        self.is_waiting = False
        self.wait_time = 0.0  # total seconds stopped
        self.has_crossed = False
        self.lane = lane

        if color:
            self.color = color
        else:
            colors = ["#38bdf8", "#818cf8", "#f472b6", "#fb923c", "#34d399", "#a78bfa"]
            idx = hash(self.id) % len(colors)
            self.color = colors[idx]

    def update(
        self,
        dt: float,
        signal_state: SignalState,
        leader: Optional["Vehicle"] = None,
    ):
        """
        Updates speed and position using car-following model and traffic light rules.
        """
        # Determine obstacle / stopping target
        target_distance = 999.0
        target_speed = self.max_speed

        # 1. Stop line obstacle if light is RED or YELLOW (when approaching)
        if self.distance_to_stop > 0:
            if signal_state == SignalState.RED:
                target_distance = self.distance_to_stop
                target_speed = 0.0
            elif signal_state == SignalState.YELLOW:
                # If close and fast, proceed; otherwise stop safely
                stopping_dist = (self.speed ** 2) / (2 * self.deceleration)
                if self.distance_to_stop > stopping_dist + 5.0:
                    target_distance = self.distance_to_stop
                    target_speed = 0.0

        # 2. Leader vehicle obstacle (car following)
        if leader is not None:
            gap_to_leader = (self.distance_to_stop - leader.distance_to_stop) - self.min_gap
            if gap_to_leader < target_distance:
                target_distance = max(0.0, gap_to_leader)
                target_speed = leader.speed

        # 3. Calculate acceleration/deceleration
        if target_distance <= 0.5 and target_speed <= 0.1:
            # Fully stopped behind leader or stop line
            self.speed = 0.0
        elif target_distance < 20.0:
            # Need to decelerate smoothly
            desired_speed = min(self.max_speed, max(0.0, (target_distance / 20.0) * target_speed + (target_distance / 25.0) * 4.0))
            if self.speed > desired_speed:
                self.speed = max(0.0, self.speed - self.deceleration * dt)
            else:
                self.speed = min(desired_speed, self.speed + self.acceleration * dt)
        else:
            # Free flow towards max speed
            self.speed = min(self.max_speed, self.speed + self.acceleration * dt)

        # 4. Update position
        self.distance_to_stop -= self.speed * dt

        # 5. Check crossing
        if self.distance_to_stop <= 0 and not self.has_crossed:
            self.has_crossed = True

        # 6. Track waiting time
        if self.distance_to_stop >= 0 and self.speed < 0.5:
            self.is_waiting = True
            self.wait_time += dt
        else:
            self.is_waiting = False

    def to_model(self) -> VehicleModel:
        return VehicleModel(
            id=self.id,
            direction=self.direction,
            distance_to_stop=round(self.distance_to_stop, 2),
            speed=round(self.speed, 2),
            is_waiting=self.is_waiting,
            wait_time=round(self.wait_time, 2),
            color=self.color,
            length=self.length,
            lane=self.lane,
        )
