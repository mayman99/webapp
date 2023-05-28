import * as THREE from 'three';
import { createRoot } from 'react-dom/client';
import React, { useRef, useState } from 'react';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { Euler, StringKeyframeTrack } from 'three';

export interface BoxProps {
  position: number[];
  // thickness, length, height
  rot: THREE.Euler;
  size: number[];
  meshRef?: React.Ref<THREE.Mesh>;
  color?: string;
}

export function Box(
  { position, size, rot, color, meshRef }: BoxProps,
  props: ThreeElements['mesh'],
) {
  const ref = useRef<THREE.Mesh>(null!);
  // ref.current.rotateY(0.1);

  return (
    <mesh
      {...props}
      position={[position[0], position[1], position[2]]}
      rotation={rot}
      ref={meshRef || ref}
    >
      <boxGeometry args={[size[0], size[1], size[2]]} />
      <meshStandardMaterial color={color || 'blue'} />
    </mesh>
  );
}