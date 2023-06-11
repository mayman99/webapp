import * as THREE from 'three'
import { memo, useRef, forwardRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Grid, useGLTF, Center, AccumulativeShadows, RandomizedLight, Environment, CameraControls, PerspectiveCamera, Circle } from '@react-three/drei'
import { useControls, button, buttonGroup, folder } from 'leva'
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { createRoot } from 'react-dom/client'
import { Room } from '@mui/icons-material'
import { useLoader } from "@react-three/fiber";
import { appStates } from './DrawRoom'
import { RoomKeySegment } from './DrawRoom'
import Empty3DRoom from './Empty3DRoom'
import { Suspense } from "react";
import { Model3D } from './DrawRoom'

const { DEG2RAD } = THREE.MathUtils

type Edit3DCanvasProps = {
    setAppState: React.Dispatch<React.SetStateAction<appStates>>;
    RoomKeySegments: Array<RoomKeySegment>;
    models: Array<Model3D>;
};

export default function Room3DStage({ setAppState, RoomKeySegments, models }: Edit3DCanvasProps) {
    return (
        <Canvas style={{ width: "90vw", height: "90vh" }} shadows>
            <Scene setAppState={setAppState} models={models} RoomKeySegments={RoomKeySegments} />
            <Suspense fallback={null}>
                {models.map((model) => (
                    <Model path={model.path} />
                ))}
            </Suspense>
            <axesHelper args={[5]} />
        </Canvas>
    );
}

function Model({ path }: { path: string }) {
    const gltf = useLoader(GLTFLoader, path);
    return (
        <>
            <primitive object={gltf.scene} scale={1.2} position={[0, 0, 0]} />
        </>
    );
}

const Scene = forwardRef<THREE.Mesh, Edit3DCanvasProps>((props, ref) => {
    const { setAppState, RoomKeySegments, models } = props;
    const meshRef = useRef<any>();
    const cameraControlsRef = useRef<any>();
    const { camera } = useThree();

    // All same options as the original "basic" example: https://yomotsu.github.io/camera-controls/examples/basic.html
    const {
        minDistance,
        enabled,
        verticalDragToForward,
        dollyToCursor,
        infinityDolly
    } = useControls({
        thetaGrp: buttonGroup({
            label: 'rotate theta',
            opts: {
                '+45º': () => cameraControlsRef.current?.rotate(45 * DEG2RAD, 0, true),
                '-90º': () => cameraControlsRef.current?.rotate(-90 * DEG2RAD, 0, true),
                '+360º': () => cameraControlsRef.current?.rotate(360 * DEG2RAD, 0, true)
            }
        }),
        phiGrp: buttonGroup({
            label: 'rotate phi',
            opts: {
                '+20º': () => cameraControlsRef.current?.rotate(0, 20 * DEG2RAD, true),
                '-40º': () => cameraControlsRef.current?.rotate(0, -40 * DEG2RAD, true)
            }
        }),
        truckGrp: buttonGroup({
            label: 'truck',
            opts: {
                '(1,0)': () => cameraControlsRef.current?.truck(1, 0, true),
                '(0,1)': () => cameraControlsRef.current?.truck(0, 1, true),
                '(-1,-1)': () => cameraControlsRef.current?.truck(-1, -1, true)
            }
        }),
        dollyGrp: buttonGroup({
            label: 'dolly',
            opts: {
                '1': () => cameraControlsRef.current?.dolly(1, true),
                '-1': () => cameraControlsRef.current?.dolly(-1, true)
            }
        }),
        zoomGrp: buttonGroup({
            label: 'zoom',
            opts: {
                '/2': () => cameraControlsRef.current?.zoom(camera.zoom / 2, true),
                '/-2': () => cameraControlsRef.current?.zoom(-camera.zoom / 2, true)
            }
        }),
        minDistance: { value: 0 },
        moveTo: folder(
            {
                vec1: { value: [3, 5, 2], label: 'vec' },
                'moveTo(…vec)': button((get) => cameraControlsRef.current?.moveTo(...get('moveTo.vec1'), true))
            },
            { collapsed: true }
        ),
        'fitToBox(mesh)': button(() => cameraControlsRef.current?.fitToBox(meshRef.current, true)),
        setPosition: folder(
            {
                vec2: { value: [-5, 2, 1], label: 'vec' },
                'setPosition(…vec)': button((get) => cameraControlsRef.current?.setPosition(...get('setPosition.vec2'), true))
            },
            { collapsed: true }
        ),
        setTarget: folder(
            {
                vec3: { value: [3, 0, -3], label: 'vec' },
                'setTarget(…vec)': button((get) => cameraControlsRef.current?.setTarget(...get('setTarget.vec3'), true))
            },
            { collapsed: true }
        ),
        setLookAt: folder(
            {
                vec4: { value: [1, 2, 3], label: 'position' },
                vec5: { value: [1, 1, 0], label: 'target' },
                'setLookAt(…position, …target)': button((get) =>
                    cameraControlsRef.current?.setLookAt(...get('setLookAt.vec4'), ...get('setLookAt.vec5'), true)
                )
            },
            { collapsed: true }
        ),
        lerpLookAt: folder(
            {
                vec6: { value: [-2, 0, 0], label: 'posA' },
                vec7: { value: [1, 1, 0], label: 'tgtA' },
                vec8: { value: [0, 2, 5], label: 'posB' },
                vec9: { value: [-1, 0, 0], label: 'tgtB' },
                t: { value: Math.random(), label: 't', min: 0, max: 1 },
                'f(…posA,…tgtA,…posB,…tgtB,t)': button((get) => {
                    return cameraControlsRef.current?.lerpLookAt(
                        ...get('lerpLookAt.vec6'),
                        ...get('lerpLookAt.vec7'),
                        ...get('lerpLookAt.vec8'),
                        ...get('lerpLookAt.vec9'),
                        get('lerpLookAt.t'),
                        true
                    );
                })
            },
            { collapsed: true }
        ),
        saveState: button(() => cameraControlsRef.current?.saveState()),
        reset: button(() => cameraControlsRef.current?.reset(true)),
        enabled: { value: true, label: 'controls on' },
        verticalDragToForward: { value: false, label: 'vert. drag to move forward' },
        dollyToCursor: { value: false, label: 'dolly to cursor' },
        infinityDolly: { value: false, label: 'infinity dolly' }
    });

    return (
        <>
            <group position-y={-0.5}>
                <Center top>
                    <Empty3DRoom RoomKeySegments={RoomKeySegments} ref={meshRef} />
                </Center>
                <Ground />
                <Shadows />
                <CameraControls
                    ref={cameraControlsRef}
                    minDistance={minDistance}
                    enabled={enabled}
                    verticalDragToForward={verticalDragToForward}
                    dollyToCursor={dollyToCursor}
                    infinityDolly={infinityDolly}

                />
                <Environment preset="city" />
            </group>
        </>
    );
});

function Ground() {
    const gridConfig = {
        cellSize: 0.5,
        cellThickness: 0.5,
        cellColor: '#6f6f6f',
        sectionSize: 3,
        sectionThickness: 1,
        sectionColor: '#9d4b4b',
        fadeDistance: 30,
        fadeStrength: 1,
        followCamera: false,
        infiniteGrid: true
    };
    return <Grid position={[0, -0.01, 0]} args={[10.5, 10.5]} {...gridConfig} />;
}

const Shadows = memo(() => (
    <AccumulativeShadows temporal frames={100} color="#9d4b4b" colorBlend={0.5} alphaTest={0.9} scale={20}>
        <RandomizedLight amount={8} radius={4} position={[5, 5, -10]} />
    </AccumulativeShadows>
));
