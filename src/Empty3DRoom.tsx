import * as THREE from 'three'
import { createRoot } from 'react-dom/client'
import React, { useRef, useState } from 'react'
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber'
import { Room, Segment } from '@mui/icons-material'
import { appStates } from './DrawRoom'
import { RoomKeySegment } from './DrawRoom'
import { Box } from './Box'
import { useLoader } from "@react-three/fiber";

function WallShapeSegmentBuilder(RoomKeySegments) {
    const wallSegments = [];
    for (let i = 0; i < RoomKeySegments.length; i++) {
        console.log(RoomKeySegments[i]);
        const shape = new THREE.Shape();
        shape.moveTo(RoomKeySegments[i].x1, RoomKeySegments[i].y1);
        shape.lineTo(RoomKeySegments[i].x1, RoomKeySegments[i].y1 + RoomKeySegments[i].y2);
        shape.lineTo(RoomKeySegments[i].x1 + RoomKeySegments[i].x2, RoomKeySegments[i].y1 + RoomKeySegments[i].y2);
        shape.lineTo(RoomKeySegments[i].x1 + RoomKeySegments[i].x2, RoomKeySegments[i].y1);
        shape.lineTo(RoomKeySegments[i].x1, RoomKeySegments[i].y1);
        wallSegments.push(shape);
    }
    return wallSegments;
}

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
    console.log('room walls: ', RoomKeySegments);
    const walls_ = [] as WallSegment[];
    let minx = 999;
    let miny = 999;
    for (const seg of RoomKeySegments) {
        const x1 = seg.x1 / 10;
        const y1 = seg.y1 / 10;
        const x2 = seg.x2 / 10;
        const y2 = seg.y2 / 10;

        if (x1 < minx) {
            minx = x1;
        }

        if (y1 < miny) {
            miny = y1;
        }

        const depth = distance(x1, x2, y1, y2);
        const midpoint = midPoint(x1, x2, y1, y2);
        const width = 0.5;
        const heigt = 15;
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

type Edit3DCanvasProps = {
    RoomKeySegments: Array<RoomKeySegment>;
    ref?: React.Ref<THREE.Mesh>;
};

// CHat gpt walls
// const WallSeg = () => {
//     const wallsRef = useRef();
//     // Load the wall texture
//     const wallTexture = useLoader(THREE.TextureLoader, '/wall_texture.jpg');

//     return (
//       <mesh ref={wallsRef}>
//         <planeGeometry args={[8, 3]} />
//         <meshBasicMaterial map={wallTexture} />
//       </mesh>
//     );
//   };

//   const Walls = ({ startPoint, endPoint }) => {

//     // Calculate dimensions
//     const length = distance(startPoint.x1, endPoint.x2, startPoint.y1, endPoint.y2);
//     const height = 3; // Customize the height as needed

//     // Create the wall geometry
//     const geometry = new THREE.BoxGeometry(length, height, 0.1); // Customize the depth as needed

//     // Create the wall material
//     const material = new THREE.MeshBasicMaterial({ color: 'red' }); // Customize the material as needed

//     // Calculate position and rotation
//     const position = new THREE.Vector3().addVectors(startPoint, endPoint).divideScalar(2);
//     const direction = new THREE.Vector3().subVectors(endPoint, startPoint);
//     const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(startPoint, endPoint, camera.up)),"XYZ");

//     return <mesh geometry={geometry} material={material} position={position} rotation={rotation} />;
//   };

const ChatGPTWalls = ({ sp, ep }) => {

    const cameraUp = new THREE.Vector3(0, 0, 1);
    const endPoint = new THREE.Vector3(ep[0], ep[1], 0);
    const startPoint = new THREE.Vector3(sp[0], sp[1], 0);
    // Calculate dimensions
    const length = startPoint.distanceTo(endPoint);
    const height = 30; // Customize the height as needed

    // Create the wall geometry
    const widthSegments = 10; // Control the resolution of the wall
    const heightSegments = 10; // Control the resolution of the wall
    const geometry = new THREE.PlaneGeometry(length, height, widthSegments, heightSegments);

    // Create the wall material
    const material = new THREE.MeshBasicMaterial({ color: 'red' }); // Customize the material as needed

    // Calculate position and rotation
    const position = new THREE.Vector3().addVectors(startPoint, endPoint).divideScalar(2);
    const direction = new THREE.Vector3().subVectors(endPoint, startPoint);
    const rotation = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(startPoint, endPoint, cameraUp)),
        'XYZ'
    );

    return <mesh geometry={geometry} material={material} position={position} rotation={rotation} />;
};

const createPlaneFromPoints = (points) => {
    const plane = new THREE.Plane();
    const normal = new THREE.Vector3();
    const centroid = new THREE.Vector3();

    // Calculate centroid of the points
    for (let i = 0; i < points.length; i++) {
        centroid.add(points[i]);
    }
    centroid.divideScalar(points.length);

    // Compute the normal of the plane using the first three points
    const v1 = new THREE.Vector3().subVectors(points[1], points[0]);
    const v2 = new THREE.Vector3().subVectors(points[2], points[0]);
    normal.crossVectors(v1, v2).normalize();

    // Set the plane's normal and constant values
    plane.setFromNormalAndCoplanarPoint(normal, centroid);

    return plane;
};

const createShapeFromPolygon = (points) => {
    const shape = new THREE.Shape();
  
    // Create the shape by connecting the polygon points
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].y);
    }
  
    return shape;
  };

function PlanFromPoints({ points }: { points: THREE.Vector3[] }) {
    // Create a plane from the points
    const shape = createShapeFromPolygon(points);
    const wallTexture = useLoader(THREE.TextureLoader, '/floor_texture.jpg');

    return (
        <mesh>
        <extrudeGeometry args={[shape, { depth: 1, bevelEnabled: false }]} />
        <meshBasicMaterial map={wallTexture} />        
      </mesh>
    );
  };

// convert room key segments to vectors
const RoomKeySegmentsToVectors = (RoomKeySegments: Array<RoomKeySegment>) => {
    const vectors: Array<THREE.Vector3> = [];
    RoomKeySegments.forEach((segment) => {
        vectors.push(new THREE.Vector3(segment.x1/10, segment.y1/10, 0));
        vectors.push(new THREE.Vector3(segment.x2/10, segment.y2/10, 0));
    });
    return vectors;
}

// forward ref so that we can access the mesh
const Empty3DRoom = React.forwardRef<THREE.Mesh, Edit3DCanvasProps & ThreeElements['mesh']>((props, ref) => {
    const { RoomKeySegments } = props;
    const points = RoomKeySegmentsToVectors(RoomKeySegments);
    const { walls_ } = graphToWalls(RoomKeySegments);
    const wallTexture = useLoader(THREE.TextureLoader, '/wall_texture.jpg');
    const material = new THREE.MeshStandardMaterial({ map: wallTexture }); // Use the texture as the map

    return (
        <mesh {...props} ref={ref} userData={{ depth: 5 }}>
            {walls_.map((wall, i) => (
                <Box
                    key={i}
                    rot={walls_[i].rot}
                    size={[walls_[i].width, walls_[i].depth, walls_[i].height]}
                    position={[walls_[i].position[0], walls_[i].position[1], walls_[i].position[2]]}
                    material={material}
                ></Box>
            ))}
            <PlanFromPoints points={points} />
        </mesh>
    )
});

export default Empty3DRoom;
