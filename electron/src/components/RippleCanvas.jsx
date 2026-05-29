import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './RippleCanvas.css';

export default function RippleCanvas() {
    const containerRef = useRef(null);
    const [visible, setVisible] = useState(false);

    // All Three.js state stored in refs to survive re-renders
    const stateRef = useRef(null);

    // Initialize Three.js scene once on mount
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // --- EXACT COPY OF USER'S CODE BELOW ---

        const scene = new THREE.Scene();

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        let initialWidth = window.innerWidth || 800;
        let initialHeight = window.innerHeight || 600;

        const renderer = new THREE.WebGLRenderer({ antialias: false });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(initialWidth, initialHeight);
        container.appendChild(renderer.domElement);

        // Define GLSL Shaders
        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                // Use standard Three.js projection for safety
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform int u_num_ripples;
            uniform vec3 u_ripples[20]; // vec3(x, y, start_time)

            varying vec2 vUv;

            // Procedural background to refract (a sleek, light gradient)
            vec3 get_background(vec2 uv) {
                vec3 color_bottom = vec3(0.4, 0.0, 0.8); // Purple
                vec3 color_top = vec3(0.0, 0.6, 1.0);   // Blue
                return mix(color_bottom, color_top, uv.y);
            }

            void main() {
                vec2 uv = vUv;
                
                // Protect against division by zero if iframe height is initially 0
                float resY = max(u_resolution.y, 1.0);
                vec2 aspect = vec2(u_resolution.x / resY, 1.0);
                vec2 p = uv * aspect;

                vec3 total_normal = vec3(0.0, 0.0, 1.0);

                // Calculate wave interference for all active ripples
                for (int i = 0; i < 20; i++) {
                    // Fix 3: Safer conditional block for older WebGL implementations instead of 'break'
                    if (i < u_num_ripples) {
                        vec2 center = u_ripples[i].xy * aspect;
                        float t = u_time - u_ripples[i].z;

                        if (t > 0.0 && t < 0.8) { // Ripple lifetime is 0.8s max
                            vec2 dir = p - center;
                            float dist = length(dir);

                            float speed = 1.5;
                            float wave_radius = t * speed;
                            float thickness = 0.08 + (t * 0.05); // Ring gets wider as it expands
                            
                            float dist_diff = dist - wave_radius;
                            
                            // Single smooth pulse (derivative of a Gaussian)
                            float gaussian = exp(-pow(dist_diff / thickness, 2.0));
                            float dw_dd = -(dist_diff / (thickness * thickness)) * gaussian;
                            
                            // Fade out cleanly
                            float fade = 1.0 - smoothstep(0.0, 0.8, t);
                            float amplitude = 0.015 * fade;
                            
                            vec2 grad = (dir / (dist + 0.0001)) * dw_dd * amplitude;
                            total_normal.xy -= grad; 
                        }
                    }
                }

                total_normal = normalize(total_normal);

                // OPTICS: Refraction & Chromatic Aberration
                float refraction_strength = 0.10; 
                vec2 refract_r = uv + total_normal.xy * (refraction_strength * 1.1);
                vec2 refract_g = uv + total_normal.xy * (refraction_strength * 1.0);
                vec2 refract_b = uv + total_normal.xy * (refraction_strength * 0.9);

                vec3 color;
                color.r = get_background(refract_r).r;
                color.g = get_background(refract_g).g;
                color.b = get_background(refract_b).b;

                // LIGHTING: Glass Highlights
                vec3 light_dir = normalize(vec3(0.5, 0.8, 1.0));
                vec3 view_dir = vec3(0.0, 0.0, 1.0);
                
                float diff = max(dot(total_normal, light_dir), 0.0);
                vec3 half_vector = normalize(light_dir + view_dir);
                float spec = pow(max(dot(total_normal, half_vector), 0.0), 64.0);

                vec3 glass_tint = vec3(0.98, 0.98, 1.0); // More neutral tint
                color = (color * glass_tint * (0.8 + 0.2 * diff)) + (vec3(1.0) * spec * 0.3);

                gl_FragColor = vec4(color, 1.0);
            }
        `;

        // Create uniforms corresponding to the original Python code
        const maxRipples = 20;
        const uniformRipples = [];
        for (let i = 0; i < maxRipples; i++) {
            uniformRipples.push(new THREE.Vector3(0, 0, 0));
        }

        const uniforms = {
            u_time: { value: 0.0 },
            u_resolution: { value: new THREE.Vector2(initialWidth, initialHeight) },
            u_num_ripples: { value: 0 },
            u_ripples: { value: uniformRipples }
        };

        // Create a full-screen plane geometry and apply the custom ShaderMaterial
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: uniforms
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // State Tracking
        const clock = new THREE.Clock();
        const activeRipples = []; // Array to store {x, y, start_time}

        // --- END OF EXACT COPY ---

        // Store everything in ref
        stateRef.current = {
            renderer, scene, camera, uniforms, clock,
            activeRipples, maxRipples, geometry, material
        };

        // Window Resize Handler
        const handleResize = () => {
            const w = window.innerWidth || 800;
            const h = window.innerHeight || 600;
            renderer.setSize(w, h);
            uniforms.u_resolution.value.set(w, h);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            geometry.dispose();
            material.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);

    // Listen for ripple-trigger events to show overlay and spawn ripple
    useEffect(() => {
        const handleTrigger = (e) => {
            const state = stateRef.current;
            if (!state) return;

            const { x, y } = e.detail;
            // Invert Y axis because GLSL coordinates start with 0.0 at the bottom
            const ny = 1.0 - y;
            const currentTime = state.clock.getElapsedTime();

            state.activeRipples.push({ x: x, y: ny, time: currentTime });

            if (state.activeRipples.length > state.maxRipples) {
                state.activeRipples.shift();
            }

            setVisible(true);
        };

        window.addEventListener('ripple-trigger', handleTrigger);
        return () => window.removeEventListener('ripple-trigger', handleTrigger);
    }, []);

    // Animation loop - only runs when visible
    useEffect(() => {
        if (!visible) return;
        let animFrame;

        const animate = () => {
            const state = stateRef.current;
            if (!state) return;

            const currentTime = state.clock.getElapsedTime();
            state.uniforms.u_time.value = currentTime;

            // Cleanup expired ripples (older than 0.8s)
            while (state.activeRipples.length > 0 && (currentTime - state.activeRipples[0].time) > 0.8) {
                state.activeRipples.shift();
            }

            // If no ripples left, hide the overlay
            if (state.activeRipples.length === 0) {
                setVisible(false);
                return;
            }

            // Sync JS array to GLSL Uniforms
            state.uniforms.u_num_ripples.value = state.activeRipples.length;
            for (let i = 0; i < state.maxRipples; i++) {
                if (i < state.activeRipples.length) {
                    state.uniforms.u_ripples.value[i].set(
                        state.activeRipples[i].x,
                        state.activeRipples[i].y,
                        state.activeRipples[i].time
                    );
                } else {
                    state.uniforms.u_ripples.value[i].set(0, 0, 0);
                }
            }

            state.renderer.render(state.scene, state.camera);
            animFrame = requestAnimationFrame(animate);
        };

        animFrame = requestAnimationFrame(animate);
        return () => {
            if (animFrame) cancelAnimationFrame(animFrame);
        };
    }, [visible]);

    return (
        <div
            ref={containerRef}
            className="ripple-canvas-wrapper"
            style={{ display: visible ? 'block' : 'none' }}
        />
    );
}
