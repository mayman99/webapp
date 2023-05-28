import * as THREE from 'three'
import { createRoot } from 'react-dom/client'
import React, { useRef, useState } from 'react'
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber'
import { Room, Segment } from '@mui/icons-material'
import { appStates } from './DrawRoom'
import { RoomKeySegment } from './DrawRoom'
import { Box } from './Box'

// function WallShapeSegmentBuilder(RoomKeySegments) {
//     const wallSegments = [];
//     // for (let i = 0; i < RoomKeySegments.length; i++) {
//     //     console.log(RoomKeySegments[i]);
//     //     const shape = new THREE.Shape();
//     //     shape.moveTo(RoomKeySegments[i].x1, RoomKeySegments[i].y1);
//     //     shape.lineTo(RoomKeySegments[i].x1, RoomKeySegments[i].y1 + RoomKeySegments[i].y2);
//     //     shape.lineTo(RoomKeySegments[i].x1 + RoomKeySegments[i].x2, RoomKeySegments[i].y1 + RoomKeySegments[i].y2);
//     //     shape.lineTo(RoomKeySegments[i].x1 + RoomKeySegments[i].x2, RoomKeySegments[i].y1);
//     //     shape.lineTo(RoomKeySegments[i].x1, RoomKeySegments[i].y1);
//     //     wallSegments.push(shape);
//     // }
//     const shape = new THREE.Shape();
//     shape.moveTo(-1.2, 0);
//     shape.lineTo(-1.2, 0 );
//     shape.lineTo(-1.2 + 1.2, 0);
//     shape.lineTo(-1.2 + 1.2, 0);
//     shape.lineTo(-1.2, 0);
//     wallSegments.push(shape);
//     return wallSegments;
// }

export interface WallSegment {
    position: number[];
    width: number;
    height: number;
    depth: number;
    rot: THREE.Euler;
}

function distance(x1, x2, y1, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

function midPoint(x1, x2, y1, y2) {
    return [(x2 + x1) / 2, (y2 + y1) / 2];
}

function graphToWalls(RoomKeySegments: RoomKeySegment[]) {
    const walls_ = [] as WallSegment[];
    let minx = 999;
    let miny = 999;
    for (const seg of RoomKeySegments) {
        const x1 = seg.x1/10;
        const y1 = seg.y1/10;
        const x2 = seg.x2/10;
        const y2 = seg.y2/10;

        if (x1 < minx) {
            minx = x1;
        }

        if (y1 < miny) {
            miny = y1;
        }

        const depth = distance(x1, x2, y1, y2);
        const midpoint = midPoint(x1, x2, y1, y2);
        const width = 0.5;
        const heigt = 10;
        const position = midpoint.concat(heigt / 2);
        const v = new THREE.Vector3(x1 - x2, 0, y1 - y2);
        v.normalize();
        const b = v.angleTo(new THREE.Vector3(0, 0, 1));
        const rot = new THREE.Euler(0, 0, b);
        walls_.push({
            position: position,
            width: width,
            height: heigt,
            depth: depth,
            rot: rot,
        } as WallSegment);
    }
    return { walls_, minx, miny };
}

interface WallsProps {
    wallSegments: WallSegment[];
}

function Walls({ wallSegments }: WallsProps) {
    return wallSegments.map((wall, i) => (
        <mesh key={i} position={[wall.position[0], wall.position[1], wall.position[2]]}>
            <boxGeometry args={[wall.depth, wall.height, wall.width]} />
            <meshStandardMaterial color="orange" />
        </mesh>
    ));
}

type Edit3DCanvasProps = {
    RoomKeySegments: Array<RoomKeySegment>;
    ref?: React.Ref<THREE.Mesh>;
};

// forward ref so that we can access the mesh
const Empty3DRoom = React.forwardRef<THREE.Mesh, Edit3DCanvasProps & ThreeElements['mesh']>((props, ref) => {
    const { RoomKeySegments } = props;
    const { walls_ } = graphToWalls(RoomKeySegments);
    
    return (
        <mesh {...props} ref={ref} userData={{ depth: 5 }}>
            {walls_.map((wall, i) => (
                <Box
                    key={i}
                    rot={walls_[i].rot}
                    size={[walls_[i].width, walls_[i].depth, walls_[i].height]}
                    position={[walls_[i].position[0], walls_[i].position[1], walls_[i].position[2]]}
                ></Box>
            ))}
        </mesh>
    )
});

export default Empty3DRoom;