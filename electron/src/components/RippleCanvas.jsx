import { useEffect, useRef, useState } from 'react';
import './RippleCanvas.css';

/*
 * A single wave that travels out from wherever it was triggered and off the
 * edges of the screen. Fired when a session actually starts, from the middle
 * of the Start Session button.
 *
 * Canvas 2D rather than a shader: it is one soft ring, and this way the effect
 * costs nothing until it runs.
 */
const DURATION = 1100;
const RING = 0.16;      // ring thickness as a share of the current radius
const PINK = '255, 143, 150';

/** Ease out so the wave leaves quickly and settles as it goes. */
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export default function RippleCanvas() {
  const canvasRef = useRef(null);
  const [running, setRunning] = useState(false);
  const waveRef = useRef(null);

  useEffect(() => {
    const onTrigger = (e) => {
      const { x, y } = e.detail || {};
      waveRef.current = {
        x: Number.isFinite(x) ? x : window.innerWidth / 2,
        y: Number.isFinite(y) ? y : window.innerHeight / 2,
        start: performance.now(),
      };
      setRunning(true);
    };
    window.addEventListener('ripple-trigger', onTrigger);
    return () => window.removeEventListener('ripple-trigger', onTrigger);
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const wave = waveRef.current;
    // Far enough to clear the corner furthest from the origin.
    const reach = Math.hypot(
      Math.max(wave.x, width - wave.x),
      Math.max(wave.y, height - wave.y),
    );

    let frame;
    const draw = (now) => {
      const t = Math.min(1, (now - wave.start) / DURATION);
      const radius = easeOut(t) * reach * 1.05;
      const thickness = Math.max(28, radius * RING);
      const inner = Math.max(0, radius - thickness);
      const outer = radius + thickness * 0.6;
      // Full strength as it leaves, gone by the time it reaches the corners.
      const strength = (1 - t) * 0.55;

      ctx.clearRect(0, 0, width, height);
      if (outer > 0 && strength > 0.002) {
        const g = ctx.createRadialGradient(wave.x, wave.y, inner, wave.x, wave.y, outer);
        g.addColorStop(0, `rgba(${PINK}, 0)`);
        g.addColorStop(0.55, `rgba(${PINK}, ${strength})`);
        g.addColorStop(0.75, `rgba(255, 255, 255, ${strength * 0.7})`);
        g.addColorStop(1, `rgba(${PINK}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      }

      if (t < 1) {
        frame = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, width, height);
        setRunning(false);
      }
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return (
    <canvas
      ref={canvasRef}
      className="ripple-canvas"
      style={{ display: running ? 'block' : 'none' }}
    />
  );
}
