'use client';

import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

function RobotArm() {
  const baseGroupRef = useRef<THREE.Group>(null);
  const elbowGroupRef = useRef<THREE.Group>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const elbowAngleRef = useRef(0.3);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(() => {
    if (baseGroupRef.current) {
      baseGroupRef.current.rotation.y += 0.004;
    }
    if (elbowGroupRef.current) {
      const targetAngle = mouseRef.current.x * 0.4;
      elbowAngleRef.current += (targetAngle - elbowAngleRef.current) * 0.03;
      elbowGroupRef.current.rotation.z = elbowAngleRef.current;
    }
  });

  // Visible dark-green links — lower metalness so diffuse light hits them
  const linkMat = <meshStandardMaterial color="#1a2e1a" roughness={0.5} metalness={0.3} />;
  const jointMat = <meshStandardMaterial color="#003010" roughness={0.2} metalness={0.5} emissive="#00ff41" emissiveIntensity={1.5} />;
  const eeMat   = <meshStandardMaterial color="#002010" roughness={0.2} metalness={0.5} emissive="#00ff41" emissiveIntensity={2.0} />;

  return (
    <group ref={baseGroupRef} scale={1.3}>
      {/* Base joint sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[7, 16, 16]} />
        {jointMat}
      </mesh>

      {/* Link 1 */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, -40, 0]}>
          <boxGeometry args={[8, 80, 8]} />
          {linkMat}
        </mesh>

        {/* Elbow joint */}
        <mesh position={[0, -80, 0]}>
          <sphereGeometry args={[7, 16, 16]} />
          {jointMat}
        </mesh>

        <pointLight position={[0, -80, 0]} color="#00ff41" intensity={5} distance={160} />

        {/* Link 2 */}
        <group ref={elbowGroupRef} position={[0, -80, 0]}>
          <mesh position={[0, -30, 0]}>
            <boxGeometry args={[6, 60, 6]} />
            {linkMat}
          </mesh>

          {/* End effector */}
          <mesh position={[0, -60, 0]}>
            <sphereGeometry args={[6, 16, 16]} />
            {eeMat}
          </mesh>

          <pointLight position={[0, -60, 0]} color="#00ff41" intensity={3} distance={120} />
        </group>
      </group>
    </group>
  );
}

export default function RobotArmCanvas() {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      camera={{ fov: 50, position: [0, -40, 220] }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.25} />
      {/* Key light — white, above and to the side */}
      <directionalLight position={[150, 200, 150]} intensity={0.7} color="#ffffff" />
      {/* Green fill light — gives the links a green tint on the other side */}
      <directionalLight position={[-150, 100, 200]} intensity={0.5} color="#00ff41" />
      {/* Rim light — catches edges from below */}
      <directionalLight position={[0, -200, -100]} intensity={0.25} color="#003010" />
      <RobotArm />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.08}
          luminanceSmoothing={0.9}
          intensity={1.4}
        />
      </EffectComposer>
    </Canvas>
  );
}
