import React, { useRef, useEffect } from 'react';

export default function IntersectionSimulation({ state }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Retina support
    const dpr = window.devicePixelRatio || 1;

    // Background
    ctx.clearRect(0, 0, width, height);

    // Dark terrain
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, width, height);

    // Subtle background grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const cx = width / 2;
    const cy = height / 2;
    const roadWidth = 140; // Total road width in pixels (70px per half)
    const halfRoad = roadWidth / 2;
    const stopOffset = 80; // Distance from center to stop line

    // 1. Draw Roads (Asphalt)
    ctx.fillStyle = '#1e293b';
    // Vertical road (North-South)
    ctx.fillRect(cx - halfRoad, 0, roadWidth, height);
    // Horizontal road (East-West)
    ctx.fillRect(0, cy - halfRoad, width, roadWidth);

    // Road borders
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    // North corners
    ctx.strokeRect(0, 0, cx - halfRoad, cy - halfRoad);
    ctx.strokeRect(cx + halfRoad, 0, width - (cx + halfRoad), cy - halfRoad);
    // South corners
    ctx.strokeRect(0, cy + halfRoad, cx - halfRoad, height - (cy + halfRoad));
    ctx.strokeRect(cx + halfRoad, cy + halfRoad, width - (cx + halfRoad), height - (cy + halfRoad));

    // Corner curb roundings
    ctx.fillStyle = '#334155';
    const rCurb = 14;
    // NW
    ctx.fillRect(cx - halfRoad - rCurb, cy - halfRoad - rCurb, rCurb, rCurb);
    // NE
    ctx.fillRect(cx + halfRoad, cy - halfRoad - rCurb, rCurb, rCurb);
    // SW
    ctx.fillRect(cx - halfRoad - rCurb, cy + halfRoad, rCurb, rCurb);
    // SE
    ctx.fillRect(cx + halfRoad, cy + halfRoad, rCurb, rCurb);

    // 2. Yellow Center Line (Dashed)
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);

    // North center line
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, cy - stopOffset);
    ctx.stroke();

    // South center line
    ctx.beginPath();
    ctx.moveTo(cx, cy + stopOffset);
    ctx.lineTo(cx, height);
    ctx.stroke();

    // West center line
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(cx - stopOffset, cy);
    ctx.stroke();

    // East center line
    ctx.beginPath();
    ctx.moveTo(cx + stopOffset, cy);
    ctx.lineTo(width, cy);
    ctx.stroke();

    ctx.setLineDash([]); // Reset dash

    // 3. Zebra Crosswalks
    const drawCrosswalk = (startX, startY, endX, endY, isVertical) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      const stripes = 8;
      if (isVertical) {
        const stripeWidth = roadWidth / (stripes * 2);
        for (let i = 0; i < stripes; i++) {
          ctx.fillRect(startX + i * stripeWidth * 2, startY, stripeWidth, 18);
        }
      } else {
        const stripeHeight = roadWidth / (stripes * 2);
        for (let i = 0; i < stripes; i++) {
          ctx.fillRect(startX, startY + i * stripeHeight * 2, 18, stripeHeight);
        }
      }
    };

    drawCrosswalk(cx - halfRoad, cy - stopOffset + 8, 0, 0, true); // North
    drawCrosswalk(cx - halfRoad, cy + stopOffset - 26, 0, 0, true); // South
    drawCrosswalk(cx - stopOffset + 8, cy - halfRoad, 0, 0, false); // West
    drawCrosswalk(cx + stopOffset - 26, cy - halfRoad, 0, 0, false); // East

    // 4. White Solid Stop Lines
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;

    // North Stop Line (incoming right half: x in [cx, cx + halfRoad])
    ctx.beginPath();
    ctx.moveTo(cx, cy - stopOffset);
    ctx.lineTo(cx + halfRoad, cy - stopOffset);
    ctx.stroke();

    // South Stop Line (incoming left half: x in [cx - halfRoad, cx])
    ctx.beginPath();
    ctx.moveTo(cx - halfRoad, cy + stopOffset);
    ctx.lineTo(cx, cy + stopOffset);
    ctx.stroke();

    // East Stop Line (incoming bottom half: y in [cy, cy + halfRoad])
    ctx.beginPath();
    ctx.moveTo(cx + stopOffset, cy);
    ctx.lineTo(cx + stopOffset, cy + halfRoad);
    ctx.stroke();

    // West Stop Line (incoming top half: y in [cy - halfRoad, cy])
    ctx.beginPath();
    ctx.moveTo(cx - stopOffset, cy - halfRoad);
    ctx.lineTo(cx - stopOffset, cy);
    ctx.stroke();

    // 5. Draw Traffic Lights on Stop Lines
    const signals = state?.directions || {};
    const drawLightHead = (x, y, stateColor) => {
      ctx.save();
      // Outer box
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Bulb
      let bulbColor = '#ef4444';
      let glowColor = 'rgba(239, 68, 68, 0.6)';
      if (stateColor === 'GREEN') {
        bulbColor = '#10b981';
        glowColor = 'rgba(16, 185, 129, 0.6)';
      } else if (stateColor === 'YELLOW') {
        bulbColor = '#f59e0b';
        glowColor = 'rgba(245, 158, 11, 0.6)';
      }

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;
      ctx.fillStyle = bulbColor;
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    };

    drawLightHead(cx + halfRoad + 14, cy - stopOffset, signals.NORTH?.signal_state || 'RED');
    drawLightHead(cx - halfRoad - 14, cy + stopOffset, signals.SOUTH?.signal_state || 'RED');
    drawLightHead(cx + stopOffset, cy + halfRoad + 14, signals.EAST?.signal_state || 'RED');
    drawLightHead(cx - stopOffset, cy - halfRoad - 14, signals.WEST?.signal_state || 'RED');

    // 6. Draw Vehicles
    if (state?.vehicles) {
      const scaleMetersToPixels = 2.4; // 1 meter = 2.4 pixels

      state.vehicles.forEach((veh) => {
        let vx = 0;
        let vy = 0;
        let angle = 0;
        const distPx = veh.distance_to_stop * scaleMetersToPixels;

        if (veh.direction === 'NORTH') {
          // Moves South (+y) in right lane
          vx = cx + halfRoad / 2;
          vy = cy - stopOffset - distPx;
          angle = Math.PI / 2; // facing down
        } else if (veh.direction === 'SOUTH') {
          // Moves North (-y) in left lane
          vx = cx - halfRoad / 2;
          vy = cy + stopOffset + distPx;
          angle = -Math.PI / 2; // facing up
        } else if (veh.direction === 'EAST') {
          // Moves West (-x) in bottom lane
          vx = cx + stopOffset + distPx;
          vy = cy + halfRoad / 2;
          angle = Math.PI; // facing left
        } else if (veh.direction === 'WEST') {
          // Moves East (+x) in top lane
          vx = cx - stopOffset - distPx;
          vy = cy - halfRoad / 2;
          angle = 0; // facing right
        }

        // Render Vehicle Body
        ctx.save();
        ctx.translate(vx, vy);
        ctx.rotate(angle);

        const vLength = 24;
        const vWidth = 14;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(-vLength / 2 + 2, -vWidth / 2 + 2, vLength, vWidth);

        // Body
        ctx.fillStyle = veh.color || '#38bdf8';
        ctx.beginPath();
        ctx.roundRect(-vLength / 2, -vWidth / 2, vLength, vWidth, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Windshield
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(vLength / 6, -vWidth / 2 + 2, 4, vWidth - 4);
        ctx.fillRect(-vLength / 3, -vWidth / 2 + 2, 3, vWidth - 4);

        // Headlights (Front: +x in local rotation)
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(vLength / 2 - 2, -vWidth / 2 + 2, 2, 3);
        ctx.fillRect(vLength / 2 - 2, vWidth / 2 - 5, 2, 3);

        // Brake lights (Back: -x in local rotation)
        if (veh.is_waiting || veh.speed < 1.0) {
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 8;
          ctx.fillStyle = '#ef4444';
        } else {
          ctx.fillStyle = '#7f1d1d';
        }
        ctx.fillRect(-vLength / 2, -vWidth / 2 + 2, 2, 3);
        ctx.fillRect(-vLength / 2, vWidth / 2 - 5, 2, 3);

        ctx.restore();
      });
    }

    // 7. Center Phase & Countdown HUD + ALL-RED Clearance
    const isAllRed = state?.current_phase === 'ALL_RED_1' || state?.current_phase === 'ALL_RED_2';

    // All-Red clearance box overlay in intersection center
    if (isAllRed) {
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
      ctx.fillRect(cx - halfRoad, cy - halfRoad, roadWidth, roadWidth);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(cx - halfRoad, cy - halfRoad, roadWidth, roadWidth);
      ctx.setLineDash([]);

      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ALL-RED CLEARANCE INTERVAL', cx, cy - 42);
      ctx.restore();
    }

    ctx.save();
    let hudColor = '#38bdf8';
    if (state?.current_phase?.includes('GREEN')) hudColor = '#10b981';
    else if (state?.current_phase?.includes('YELLOW')) hudColor = '#f59e0b';
    else if (state?.current_phase?.includes('RED')) hudColor = '#ef4444';

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = hudColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Countdown Text
    ctx.fillStyle = hudColor;
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const countdown = state?.countdown !== undefined ? Math.ceil(state.countdown) : '--';
    ctx.fillText(`${countdown}s`, cx, cy - 4);

    // Current Phase Text
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px Inter, sans-serif';
    const phaseLabel = state?.current_phase ? state.current_phase.replace(/_/g, ' ') : 'STANDBY';
    ctx.fillText(phaseLabel, cx, cy + 12);
    ctx.restore();

    // 8. Direction Labels & Queue Badges
    const drawDirectionTag = (label, x, y, queueCount, waitSec) => {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x - 42, y - 18, 84, 36, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y - 4);

      ctx.fillStyle = queueCount > 5 ? '#f87171' : '#38bdf8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`Q: ${queueCount} | ${waitSec}s`, x, y + 10);
      ctx.restore();
    };

    drawDirectionTag('NORTH', cx + halfRoad / 2, 28, signals.NORTH?.queue_length || 0, Math.round(signals.NORTH?.avg_waiting_time || 0));
    drawDirectionTag('SOUTH', cx - halfRoad / 2, height - 28, signals.SOUTH?.queue_length || 0, Math.round(signals.SOUTH?.avg_waiting_time || 0));
    drawDirectionTag('WEST', 48, cy - halfRoad / 2, signals.WEST?.queue_length || 0, Math.round(signals.WEST?.avg_waiting_time || 0));
    drawDirectionTag('EAST', width - 48, cy + halfRoad / 2, signals.EAST?.queue_length || 0, Math.round(signals.EAST?.avg_waiting_time || 0));

  }, [state]);

  return (
    <div className="relative w-full aspect-square max-w-[620px] mx-auto rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl bg-[#0b1120]">
      <canvas
        ref={canvasRef}
        width={620}
        height={620}
        className="w-full h-full block"
      />
    </div>
  );
}
