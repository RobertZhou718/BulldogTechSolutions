import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Html, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import bulldogLogo from "@/assets/BulldogFinance.png";

const MODEL_PATH = "/models/bulldog-piggy-bank.glb";
const MAX_COINS = 52;

function clampProgress(progressPercent) {
    return Math.max(0, Math.min(100, Number(progressPercent) || 0));
}

function buildCoinTargets(progressPercent) {
    const normalized = clampProgress(progressPercent);
    const visibleCount = Math.round((normalized / 100) * MAX_COINS);

    return Array.from({ length: visibleCount }, (_, index) => {
        const layer = Math.floor(index / 7);
        const slot = index % 7;
        const rowCount = Math.min(7, visibleCount - layer * 7);
        const rowWidth = (rowCount - 1) * 0.078;
        const rowOffset = layer % 2 === 0 ? 0 : 0.034;
        const x = slot * 0.078 - rowWidth / 2 + rowOffset;
        const z = ((index * 5) % 5 - 2) * 0.026;
        const y = -0.46 + layer * 0.045 + ((index * 11) % 4) * 0.004;

        return {
            id: `coin-${index}`,
            position: [x, y, z],
            rotation: [
                THREE.MathUtils.degToRad(82 + ((index * 13) % 16)),
                THREE.MathUtils.degToRad((index * 47) % 360),
                THREE.MathUtils.degToRad(((index * 29) % 50) - 25),
            ],
            delay: (index % 10) * 0.035,
        };
    });
}

function useReducedMotion() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const query = window.matchMedia("(prefers-reduced-motion: reduce)");
        const updatePreference = () => setPrefersReducedMotion(query.matches);

        updatePreference();
        query.addEventListener("change", updatePreference);

        return () => query.removeEventListener("change", updatePreference);
    }, []);

    return prefersReducedMotion;
}

function SceneCamera({ compact }) {
    const { camera } = useThree();

    useEffect(() => {
        camera.position.set(0.02, compact ? 0.08 : 0.06, compact ? 2.65 : 2.42);
        camera.lookAt(0, -0.04, 0);
        camera.updateProjectionMatrix();
    }, [camera, compact]);

    return null;
}

function BulldogModel({ compact }) {
    const { scene } = useGLTF(MODEL_PATH);
    const model = useMemo(() => scene.clone(true), [scene]);

    useMemo(() => {
        model.traverse((object) => {
            if (!object.isMesh) return;

            object.castShadow = true;
            object.receiveShadow = true;

            const sourceMaterial = Array.isArray(object.material) ? object.material[0] : object.material;
            object.material = new THREE.MeshPhysicalMaterial({
                map: sourceMaterial?.map || null,
                color: new THREE.Color("#eef8ff"),
                transparent: true,
                opacity: 0.34,
                transmission: 0.82,
                thickness: 0.24,
                ior: 1.48,
                roughness: 0.035,
                metalness: 0,
                clearcoat: 1,
                clearcoatRoughness: 0.04,
                envMapIntensity: 1.85,
                depthWrite: false,
                side: THREE.DoubleSide,
            });
        });
    }, [model]);

    return (
        <group scale={compact ? 0.98 : 1.16} position={[0, compact ? -0.05 : -0.04, 0]}>
            <primitive object={model} />
        </group>
    );
}

function Coin({ target, logoTexture, reducedMotion }) {
    const groupRef = useRef(null);
    const materialRef = useRef(null);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        const targetPosition = target.position;
        const coinLift = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 1.2 + target.delay * 14) * 0.0025;

        groupRef.current.position.set(
            targetPosition[0],
            targetPosition[1] + coinLift,
            targetPosition[2],
        );
        groupRef.current.rotation.x = target.rotation[0];
        groupRef.current.rotation.y = target.rotation[1] + (reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.7 + target.delay) * 0.08);
        groupRef.current.rotation.z = target.rotation[2];

        if (materialRef.current) {
            materialRef.current.emissiveIntensity = THREE.MathUtils.damp(
                materialRef.current.emissiveIntensity,
                0.06,
                8,
                delta,
            );
        }
    });

    return (
        <group ref={groupRef}>
            <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.043, 0.043, 0.014, 42]} />
                <meshStandardMaterial
                    ref={materialRef}
                    color="#f5b841"
                    emissive="#9a5b00"
                    emissiveIntensity={0.08}
                    metalness={0.72}
                    roughness={0.26}
                />
            </mesh>
            <mesh position={[0, 0.0076, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.036, 42]} />
                <meshStandardMaterial
                    map={logoTexture}
                    color="#fff6d4"
                    metalness={0.18}
                    roughness={0.36}
                    polygonOffset
                    polygonOffsetFactor={-1}
                />
            </mesh>
            <mesh position={[0, -0.0076, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.036, 42]} />
                <meshStandardMaterial
                    map={logoTexture}
                    color="#fff6d4"
                    metalness={0.18}
                    roughness={0.36}
                    polygonOffset
                    polygonOffsetFactor={-1}
                />
            </mesh>
        </group>
    );
}

function CoinStack({ progressPercent, compact, reducedMotion }) {
    const logoTexture = useTexture(bulldogLogo);
    const coins = useMemo(() => buildCoinTargets(progressPercent), [progressPercent]);

    return (
        <group scale={compact ? 0.78 : 0.86} position={[0.03, compact ? -0.1 : -0.08, 0.03]}>
            {coins.map((coin) => (
                <Coin
                    key={coin.id}
                    target={coin}
                    logoTexture={logoTexture}
                    reducedMotion={reducedMotion}
                />
            ))}
        </group>
    );
}

function Celebration({ active, reducedMotion }) {
    const sparkleRef = useRef(null);

    useFrame((state) => {
        if (!sparkleRef.current || reducedMotion) return;
        sparkleRef.current.rotation.y = state.clock.elapsedTime * 0.8;
        sparkleRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.4) * 0.18;
    });

    if (!active) return null;

    return (
        <group ref={sparkleRef} position={[0.58, 0.48, 0.04]}>
            {[0, 1, 2, 3, 4].map((index) => (
                <mesh
                    key={index}
                    position={[
                        Math.cos(index * 1.25) * 0.16,
                        Math.sin(index * 1.7) * 0.08,
                        Math.sin(index) * 0.08,
                    ]}
                >
                    <sphereGeometry args={[index === 0 ? 0.026 : 0.018, 16, 16]} />
                    <meshStandardMaterial
                        color={index % 2 === 0 ? "#facc15" : "#12b76a"}
                        emissive={index % 2 === 0 ? "#f79009" : "#039855"}
                        emissiveIntensity={0.55}
                    />
                </mesh>
            ))}
        </group>
    );
}

function PiggyBankScene({ progressPercent, compact, reducedMotion }) {
    const groupRef = useRef(null);
    const normalized = clampProgress(progressPercent);

    useFrame((state) => {
        if (!groupRef.current) return;

        const idleLift = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.9) * 0.012;

        groupRef.current.rotation.y = reducedMotion ? -0.18 : state.clock.elapsedTime * 0.38 - 0.18;
        groupRef.current.position.y = idleLift;
    });

    return (
        <>
            <SceneCamera compact={compact} />
            <ambientLight intensity={0.78} />
            <directionalLight
                castShadow
                position={[2.4, 3.2, 3.4]}
                intensity={2.45}
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
            />
            <pointLight position={[-1.8, 1.2, 1.6]} intensity={1.05} color="#84caff" />
            <pointLight position={[1.6, 0.5, -1.5]} intensity={0.8} color="#ffffff" />
            <group ref={groupRef}>
                <CoinStack progressPercent={progressPercent} compact={compact} reducedMotion={reducedMotion} />
                <BulldogModel compact={compact} />
                <Celebration active={normalized >= 100} reducedMotion={reducedMotion} />
            </group>
            <ContactShadows
                position={[0, -0.56, 0]}
                opacity={0.22}
                scale={compact ? 1.45 : 1.7}
                blur={2.4}
                far={1.2}
            />
            <Environment preset="studio" />
        </>
    );
}

function LoadingBank({ normalized }) {
    return (
        <Html center>
            <div className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-semibold text-[var(--text-muted)] shadow-sm backdrop-blur">
                {normalized.toFixed(0)}%
            </div>
        </Html>
    );
}

function WebGLFallback({ normalized, compact }) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="relative aspect-square w-[68%] max-w-72 rounded-full border border-white/70 bg-[radial-gradient(circle_at_35%_25%,#ffffff,#dff2ff_42%,#b2ddff)] shadow-[inset_0_18px_42px_rgba(255,255,255,0.85),0_24px_50px_rgba(16,24,40,0.14)]">
                <div
                    className="absolute bottom-[12%] left-[12%] right-[12%] rounded-b-full bg-[linear-gradient(180deg,#fde68a,#f59e0b)] transition-all duration-700"
                    style={{ height: `${Math.max(8, normalized * 0.68)}%` }}
                />
                <div className="absolute inset-[18%] rounded-full border border-white/80 bg-white/20" />
                <img
                    src={bulldogLogo}
                    alt=""
                    className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full object-cover shadow-md"
                    draggable="false"
                />
                {!compact && normalized >= 100 ? (
                    <div className="absolute right-2 top-5 size-4 rounded-full bg-[#facc15] shadow-[0_0_18px_rgba(250,204,21,0.8)]" />
                ) : null}
            </div>
        </div>
    );
}

function supportsWebGL() {
    try {
        if (typeof window === "undefined" || typeof document === "undefined") return false;

        const canvas = document.createElement("canvas");
        return Boolean(
            window.WebGLRenderingContext &&
            (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
        );
    } catch {
        return false;
    }
}

export default function BulldogPiggyBank({ progressPercent = 0, compact = false }) {
    const [webGLReady, setWebGLReady] = useState(() => supportsWebGL());
    const normalized = clampProgress(progressPercent);
    const reducedMotion = useReducedMotion();
    const shimmerOpacity = normalized >= 80 ? 0.58 : 0.28;

    return (
        <div
            className="relative mx-auto aspect-[1.4] w-full max-w-[36rem] overflow-visible"
            role="img"
            aria-label={`Bulldog savings bank ${normalized.toFixed(0)} percent full`}
        >
            {webGLReady ? (
                <Canvas
                    shadows
                    dpr={[1, compact ? 1.35 : 1.6]}
                    camera={{ fov: compact ? 34 : 32, near: 0.1, far: 20 }}
                    gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
                    className="h-full w-full overflow-visible drop-shadow-[0_24px_34px_rgba(16,24,40,0.14)]"
                    onCreated={({ gl }) => {
                        gl.outputColorSpace = THREE.SRGBColorSpace;
                        gl.toneMapping = THREE.ACESFilmicToneMapping;
                        gl.toneMappingExposure = 1.08;
                    }}
                    onError={() => setWebGLReady(false)}
                >
                    <Suspense fallback={<LoadingBank normalized={normalized} />}>
                        <PiggyBankScene
                            progressPercent={normalized}
                            compact={compact}
                            reducedMotion={reducedMotion}
                        />
                    </Suspense>
                </Canvas>
            ) : (
                <WebGLFallback normalized={normalized} compact={compact} />
            )}

            <div
                className="pointer-events-none absolute inset-x-[10%] top-[8%] h-[42%] rounded-full bg-white blur-2xl"
                style={{ opacity: compact ? shimmerOpacity * 0.45 : shimmerOpacity }}
            />
        </div>
    );
}

useGLTF.preload(MODEL_PATH);
