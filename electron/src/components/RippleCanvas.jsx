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

        const scene = new THREE.Scene();

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        let initialWidth = window.innerWidth || 800;
        let initialHeight = window.innerHeight || 600;

        // Configure renderer for transparency
        const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        renderer.setClearColor(0x000000, 0); // Clear with completely transparent black
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

            void main() {
                vec2 uv = vUv;
                
                // Protect against division by zero if iframe height is initially 0
                float resY = max(u_resolution.y, 1.0);
                vec2 aspect = vec2(u_resolution.x / resY, 1.0);
                vec2 p = uv * aspect;

                // Start with a flat normal pointing straight up
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
                            
                            // Accumulate gradient into the XY components of the normal
                            vec2 grad = (dir / (dist + 0.0001)) * dw_dd * amplitude;
                            total_normal.xy -= grad; 
                        }
                    }
                }

                // Calculate how much the surface is tilted
                float deviation = length(total_normal.xy);
                float mask = smoothstep(0.005, 0.04, deviation); // 0 when flat, 1 when rippling

                // LIGHTING
                vec3 light_dir = normalize(vec3(0.5, 0.8, 1.0));
                vec3 view_dir = vec3(0.0, 0.0, 1.0);
                vec3 half_vector = normalize(light_dir + view_dir);

                // 1. Chromatic Aberration in Highlights (Fake prism effect for glass)
                vec3 normal_r = normalize(vec3(total_normal.xy * 1.15, 1.0));
                vec3 normal_g = normalize(vec3(total_normal.xy * 1.00, 1.0));
                vec3 normal_b = normalize(vec3(total_normal.xy * 0.85, 1.0));

                float spec_r = pow(max(dot(normal_r, half_vector), 0.0), 72.0);
                float spec_g = pow(max(dot(normal_g, half_vector), 0.0), 72.0);
                float spec_b = pow(max(dot(normal_b, half_vector), 0.0), 72.0);
                
                vec3 spec_color = vec3(spec_r, spec_g, spec_b);
                float max_spec = max(spec_r, max(spec_g, spec_b));

                // 2. Directional Volume (Shadow vs Light)
                vec3 normal_for_lighting = normalize(total_normal);
                float diff = dot(normal_for_lighting, light_dir);
                float flat_diff = dot(vec3(0.0, 0.0, 1.0), light_dir);
                float light_delta = diff - flat_diff; // Positive = facing light, Negative = facing away

                // Soft subtle lighting
                float lit_side = max(light_delta, 0.0) * 1.2;
                float dark_side = max(-light_delta, 0.0) * 0.5; // Very soft, elegant shadow

                vec3 shadow_color = vec3(0.4, 0.45, 0.5); // Cool, slate glass shadow
                vec3 highlight_color = vec3(1.0, 1.0, 1.0);

                // Combine the base glass tint
                vec3 base_color = mix(shadow_color, highlight_color, lit_side / (lit_side + dark_side + 0.0001));
                float base_alpha = lit_side + dark_side;

                // Combine base color and chromatic specular highlights
                vec3 final_color = base_color + spec_color;
                float final_alpha = clamp(base_alpha + max_spec, 0.0, 1.0);

                // Apply mask so flat areas are 100% transparent
                final_alpha *= mask;

                gl_FragColor = vec4(final_color, final_alpha);
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
            uniforms: uniforms,
            transparent: true // Tell Three.js this material is transparent
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // State Tracking
        const clock = new THREE.Clock();
        const activeRipples = []; // Array to store {x, y, start_time}

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
