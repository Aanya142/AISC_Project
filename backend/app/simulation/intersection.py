"""
Intersection geometry and 2D spatial coordinate mapping.
Defines road corridors, stop lines, signal positions, and coordinate transformations.
"""

from typing import Dict, Tuple
from ..schemas.models import Direction


class IntersectionGeometry:
    """
    Standard four-way orthogonal intersection geometry.
    World coordinates: origin (0, 0) at the center of the intersection conflict zone.
    Units: meters.
    """

    ROAD_WIDTH = 18.0  # 9m incoming half-road, 9m outgoing half-road
    LANE_WIDTH = 4.0
    STOP_LINE_OFFSET = 12.0  # meters from center to stop line
    APPROACH_LENGTH = 120.0  # meters of approach road visible
    DEPARTURE_LENGTH = 50.0  # meters after crossing before despawn

    @classmethod
    def get_stop_line_coord(cls, direction: Direction) -> Tuple[float, float]:
        """Returns (x, y) world coordinates of the stop line for a direction."""
        offset = cls.STOP_LINE_OFFSET
        if direction == Direction.NORTH:
            return (cls.LANE_WIDTH / 2.0, offset)  # moving South (+y to -y)
        elif direction == Direction.SOUTH:
            return (-cls.LANE_WIDTH / 2.0, -offset)  # moving North (-y to +y)
        elif direction == Direction.EAST:
            return (offset, -cls.LANE_WIDTH / 2.0)  # moving West (+x to -x)
        elif direction == Direction.WEST:
            return (-offset, cls.LANE_WIDTH / 2.0)  # moving East (-x to +x)
        return (0.0, 0.0)

    @classmethod
    def project_vehicle_to_world(
        cls, direction: Direction, distance_to_stop: float, lane: int = 0
    ) -> Tuple[float, float, float]:
        """
        Calculates world (x, y, heading_deg) given distance to stop line.
        Distance > 0: approaching stop line.
        Distance < 0: departed past stop line into/past intersection.
        """
        lane_offset = cls.LANE_WIDTH * 0.6 * (lane + 0.5)

        if direction == Direction.NORTH:
            # Traveling from top (+y) towards bottom (-y)
            x = lane_offset
            y = cls.STOP_LINE_OFFSET + distance_to_stop
            heading = 180.0  # facing south
        elif direction == Direction.SOUTH:
            # Traveling from bottom (-y) towards top (+y)
            x = -lane_offset
            y = -cls.STOP_LINE_OFFSET - distance_to_stop
            heading = 0.0  # facing north
        elif direction == Direction.EAST:
            # Traveling from right (+x) towards left (-x)
            x = cls.STOP_LINE_OFFSET + distance_to_stop
            y = -lane_offset
            heading = 270.0  # facing west
        elif direction == Direction.WEST:
            # Traveling from left (-x) towards right (+x)
            x = -cls.STOP_LINE_OFFSET - distance_to_stop
            y = lane_offset
            heading = 90.0  # facing east
        else:
            x, y, heading = 0.0, 0.0, 0.0

        return round(x, 2), round(y, 2), heading
