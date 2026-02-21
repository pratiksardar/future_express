"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { Suspense } from "react";

function SkyboxSphere({ url }: { url: string }) {
    const texture = useTexture(url);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    // We render the material on the inside of the sphere (DoubleSide or BackSide).
    return (
        <mesh>
            <sphereGeometry args={[500, 60, 40]} />
            <meshBasicMaterial map={texture} side={THREE.BackSide} />
        </mesh>
    );
}

export function SkyboxViewer({ url }: { url: string }) {
    return (
        <div className="w-full h-full relative cursor-move">
            <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }}>
                <Suspense fallback={null}>
                    <SkyboxSphere url={url} />
                </Suspense>
                {/* OrbitControls allows looking around 360 degrees */}
                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    enableDamping
                    dampingFactor={0.05}
                    rotateSpeed={-0.5} // Invert controls for looking around
                />
            </Canvas>
        </div>
    );
}
