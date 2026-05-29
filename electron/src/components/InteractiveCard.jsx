import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows, Center, PresentationControls } from '@react-three/drei';
import * as THREE from 'three';

function Model({ url, rotation, scale }) {
  const { scene } = useGLTF(url);
  // Clone scene to avoid shared state issues if multiple instances
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  return <primitive object={clonedScene} rotation={rotation} scale={scale} />;
}

function Scene() {
  const LIMIT_X = Math.PI;  
  const LIMIT_Y = Math.PI;  
  
  const BASE_X = Math.PI / 2; 
  const BASE_Y = -Math.PI / 2; 

  const modelRef = useRef();
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  // Interactive rotations start at 0, independent of the model's resting orientation
  const targetRotation = useRef([0, 0, 0]);
  const currentRotation = useRef([0, 0, 0]);

  const handlePointerDown = (e) => {
    isDragging.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e) => {
    isDragging.current = false;
    e.target.releasePointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;

    targetRotation.current[1] += deltaX * 0.008; 
    targetRotation.current[0] += deltaY * 0.008;

    // Clamp limits around 0
    targetRotation.current[0] = Math.max(-LIMIT_X, Math.min(LIMIT_X, targetRotation.current[0]));
    targetRotation.current[1] = Math.max(-LIMIT_Y, Math.min(LIMIT_Y, targetRotation.current[1]));

    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  useFrame((state) => {
    if (!isDragging.current) {
      const springFactor = 0.08; 
      targetRotation.current[0] += (0 - targetRotation.current[0]) * springFactor;
      targetRotation.current[1] += (0 - targetRotation.current[1]) * springFactor;
    }

    currentRotation.current[0] += (targetRotation.current[0] - currentRotation.current[0]) * 0.3;
    currentRotation.current[1] += (targetRotation.current[1] - currentRotation.current[1]) * 0.3;

    if (modelRef.current) {
      // Apply rotation directly to avoid React state lag
      modelRef.current.rotation.x = currentRotation.current[0];
      modelRef.current.rotation.y = currentRotation.current[1];
      modelRef.current.rotation.z = currentRotation.current[2];
    }
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
      
      <group ref={modelRef}>
        <Center>
          <Model url="/USBC_key_v2.glb" rotation={[BASE_X, BASE_Y, 0]} scale={0.6} />
        </Center>
      </group>

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
