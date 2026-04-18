import { useState, useEffect, useCallback } from 'react';
import './RippleCanvas.css';

export default function RippleCanvas() {
    const [ripples, setRipples] = useState([]);

    const spawnRipple = useCallback((x, y) => {
        const id = Date.now() + Math.random();
        setRipples(prev => [...prev, { id, x, y }]);
        // Remove after animation completes
        setTimeout(() => {
            setRipples(prev => prev.filter(r => r.id !== id));
        }, 1200);
    }, []);

    useEffect(() => {
        const handleTrigger = (e) => {
            const { x, y } = e.detail;
            const px = x * window.innerWidth;
            const py = y * window.innerHeight;
            spawnRipple(px, py);
        };

        window.addEventListener('ripple-trigger', handleTrigger);
        return () => window.removeEventListener('ripple-trigger', handleTrigger);
    }, [spawnRipple]);

    return (
        <div className="ripple-canvas-wrapper">
            {ripples.map(r => {
                // Calculate the max distance from the click point to any corner
                const maxDist = Math.max(
                    Math.hypot(r.x, r.y),
                    Math.hypot(window.innerWidth - r.x, r.y),
                    Math.hypot(r.x, window.innerHeight - r.y),
                    Math.hypot(window.innerWidth - r.x, window.innerHeight - r.y)
                );
                const diameter = maxDist * 2.5;
                return (
                    <div
                        key={r.id}
                        className="ripple-wave"
                        style={{
                            left: r.x,
                            top: r.y,
                            width: diameter,
                            height: diameter,
                        }}
                    />
                );
            })}
        </div>
    );
}
