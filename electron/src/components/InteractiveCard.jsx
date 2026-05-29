import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows, Float, Center } from '@react-three/drei';
import * as THREE from 'three';

function Model({ url, rotation, scale }) {
  const { scene } = useGLTF(url);
  // Clone scene to avoid shared state issues if multiple instances
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  return <primitive object={clonedScene} rotation={rotation} scale={scale} />;
}

function Scene() {
  // Center values: flipped from previous to show logo + silver on right
  // Severely restrict limits so the user can never see the back of the device
  const LIMIT_X = Math.PI / 16; // ~11 degrees
  const LIMIT_Y = Math.PI / 12; // ~15 degrees
  
  // Adjusted baseline to flip the model
  const BASE_X = Math.PI / 2; 
  const BASE_Y = -Math.PI / 2; 
  
  const [rotation, setRotation] = useState([BASE_X, BASE_Y, 0]);
  const [isDragging, setIsDragging] = useState(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  const targetRotation = useRef([BASE_X, BASE_Y, 0]);
  const currentRotation = useRef([BASE_X, BASE_Y, 0]);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;

    // Apply movement (slower, more deliberate feel)
    targetRotation.current[1] += deltaX * 0.004; 
    targetRotation.current[0] += deltaY * 0.004;

    // Clamp to stricter limits from BASE
    targetRotation.current[0] = Math.max(BASE_X - LIMIT_X, Math.min(BASE_X + LIMIT_X, targetRotation.current[0]));
    targetRotation.current[1] = Math.max(BASE_Y - LIMIT_Y, Math.min(BASE_Y + LIMIT_Y, targetRotation.current[1]));

    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  useFrame(() => {
    if (!isDragging) {
      // Smoothly spring back to BASE orientation
      const springFactor = 0.06; 
      targetRotation.current[0] += (BASE_X - targetRotation.current[0]) * springFactor;
      targetRotation.current[1] += (BASE_Y - targetRotation.current[1]) * springFactor;
    }

    // Smooth interpolation for "creamy" rotation feel (snappier response)
    currentRotation.current[0] += (targetRotation.current[0] - currentRotation.current[0]) * 0.2;
    currentRotation.current[1] += (targetRotation.current[1] - currentRotation.current[1]) * 0.2;

    setRotation([...currentRotation.current]);
  });

  return (
    <group 
      position={[0, 0, 0]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerUp}
    >
      <ambientLight intensity={1.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} />
      <pointLight position={[-10, -10, -10]} intensity={1} />
      
      <Environment preset="city" />
      
      {/* Floating effect with extremely subtle rotation to prevent "awkward" angles */}
      <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.3}>
        <Center>
          <Model url="/USBC_key_v2.glb" rotation={rotation} scale={0.6} />
        </Center>
      </Float>

      {/* Outer soft shadow gradient */}
      <ContactShadows 
        position={[0, -1.8, 0]} 
        opacity={0.25} 
        scale={12} 
        blur={3} 
        far={5} 
        resolution={512}
      />
      {/* Inner dark core shadow */}
      <ContactShadows 
        position={[0, -1.8, 0]} 
        opacity={0.5} 
        scale={8} 
        blur={1} 
        far={5} 
        resolution={1024}
      />
    </group>
  );
}

export default React.memo(function InteractiveCard() {
  return (
    <div className="interactive-card-canvas" style={{ pointerEvents: 'auto', width: '600px', height: '100%' }}>
      <Canvas 
        key="zentap-canvas"
        camera={{ position: [0, -0.4, 5.2], fov: 45 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        shadows
      >
        <Scene />
      </Canvas>
    </div>
  );
});
