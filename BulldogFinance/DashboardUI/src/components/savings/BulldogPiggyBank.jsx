import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider, CylinderCollider } from "@react-three/rapier";
import * as THREE from "three";
import bulldogLogo from "@/assets/BulldogFinance.png";

const MODEL_PATH = "/models/bulldog-piggy-bank.glb";
const MAX_COINS = 200;
const COIN_SPAWN_INTERVAL_MS = 60;
const COIN_DROP_Y = 0.55;

const COIN_VARIANTS = [
    { radius: 0.075, height: 0.018, color: "#f5cf52", weight: 0.5 },
    { radius: 0.066, height: 0.016, color: "#d99a3a", weight: 0.3 },
    { radius: 0.084, height: 0.020, color: "#b8862e", weight: 0.2 },
];

function clampProgress(progressPercent) {
    return Math.max(0, Math.min(100, Number(progressPercent) || 0));
}

function pickVariant(seed) {
    const r = ((seed * 9301 + 49297) % 233280) / 233280;
    let acc = 0;
    for (const variant of COIN_VARIANTS) {
        acc += variant.weight;
        if (r < acc) return variant;
    }
    return COIN_VARIANTS[0];
}

function useReducedMotion() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const query = window.matchMedia("(prefers-reduced-motion: reduce)");
        const update = () => setPrefersReducedMotion(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
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

            const name = (object.name || "").toLowerCase();
            const isDarkDetail = /eye|pupil|nose|nostril|slot/.test(name);

            if (isDarkDetail) {
                object.material = new THREE.MeshPhysicalMaterial({
                    color: new THREE.Color("#0b0b0f"),
                    metalness: 0.2,
                    roughness: 0.18,
                    clearcoat: 1,
                    clearcoatRoughness: 0.08,
                });
                return;
            }

            const sourceMaterial = Array.isArray(object.material) ? object.material[0] : object.material;
            object.material = new THREE.MeshPhysicalMaterial({
                map: sourceMaterial?.map || null,
                color: new THREE.Color("#f4faff"),
                transparent: true,
                opacity: 0.22,
                transmission: 0.96,
                thickness: 0.42,
                ior: 1.5,
                roughness: 0.02,
                metalness: 0,
                clearcoat: 1,
                clearcoatRoughness: 0.02,
                envMapIntensity: 2.1,
                depthWrite: false,
                side: THREE.DoubleSide,
                attenuationColor: new THREE.Color("#dceeff"),
                attenuationDistance: 1.4,
            });
        });
    }, [model]);

    return (
        <group scale={compact ? 0.98 : 1.16} position={[0, compact ? -0.05 : -0.04, 0]}>
            <primitive object={model} />
        </group>
    );
}

// Invisible basin inside the bulldog's belly so coins pile up instead of falling through.
// Floor + 4 walls roughly tracing the inner cavity.
function BellyBasin() {
    // Length (X) extended 1.6x toward the rear (-X). Width (Z) extended 1.5x symmetrically.
    // X range: -0.506 ~ +0.23 (length 0.736). Z range: -0.27 ~ +0.27 (width 0.54).
    return (
        <RigidBody type="fixed" colliders={false} friction={0.8} restitution={0.02}>
            <CuboidCollider position={[-0.138, -0.5, 0]} args={[0.368, 0.02, 0.27]} />
            <CuboidCollider position={[0.30, 0.0, 0]} args={[0.02, 0.5, 0.27]} />
            <CuboidCollider position={[-0.500, 0.0, 0]} args={[0.02, 0.5, 0.27]} />
            <CuboidCollider position={[-0.138, 0.0, 0.28]} args={[0.368, 0.5, 0.02]} />
            <CuboidCollider position={[-0.138, 0.0, -0.28]} args={[0.368, 0.5, 0.02]} />
        </RigidBody>
    );
}

function PhysicsCoin({ variant, spawnPos, spawnRot }) {
    return (
        <RigidBody
            colliders={false}
            position={spawnPos}
            rotation={spawnRot}
            mass={0.04}
            friction={0.6}
            restitution={0.02}
            linearDamping={0.6}
            angularDamping={0.9}
            ccd={false}
        >
            <CylinderCollider args={[variant.height / 2, variant.radius]} />
            <mesh castShadow receiveShadow>
                <cylinderGeometry args={[variant.radius, variant.radius, variant.height, 14]} />
                <meshStandardMaterial
                    color={variant.color}
                    metalness={0.78}
                    roughness={0.32}
                />
            </mesh>
        </RigidBody>
    );
}

function CoinPile({ progressPercent }) {
    const targetCount = Math.round((clampProgress(progressPercent) / 100) * MAX_COINS);
    const [coins, setCoins] = useState([]);
    const queueRef = useRef(0);
    const nextIdRef = useRef(0);

    useEffect(() => {
        const pending = queueRef.current;
        const total = coins.length + pending;

        if (targetCount > total) {
            queueRef.current += targetCount - total;
        } else if (targetCount < coins.length) {
            queueRef.current = 0;
            setCoins((prev) => prev.slice(0, targetCount));
        } else if (targetCount < total) {
            queueRef.current = Math.max(0, targetCount - coins.length);
        }
    }, [targetCount, coins.length]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (queueRef.current <= 0) return;
            const batchSize = Math.min(queueRef.current, queueRef.current > 20 ? 5 : 1);
            queueRef.current -= batchSize;
            const newCoins = [];
            for (let i = 0; i < batchSize; i++) {
                const id = nextIdRef.current++;
                const variant = pickVariant(id);
                const spawnPos = [
                    -0.1 + (Math.random() - 0.5) * 0.55,
                    COIN_DROP_Y + Math.random() * 0.05 + i * 0.022,
                    (Math.random() - 0.5) * 0.15,
                ];
                const spawnRot = [
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                ];
                newCoins.push({ id, variant, spawnPos, spawnRot });
            }
            setCoins((prev) => [...prev, ...newCoins]);
        }, COIN_SPAWN_INTERVAL_MS);

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <BellyBasin />
            {coins.map((coin) => (
                <PhysicsCoin
                    key={coin.id}
                    variant={coin.variant}
                    spawnPos={coin.spawnPos}
                    spawnRot={coin.spawnRot}
                />
            ))}
        </>
    );
}

function Celebration({ active }) {
    if (!active) return null;

    return (
        <group position={[0, 0.62, 0.04]}>
            {[0, 1, 2, 3, 4].map((index) => (
                <mesh
                    key={index}
                    position={[
                        Math.cos(index * 1.25) * 0.18,
                        Math.sin(index * 1.7) * 0.06,
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
    const normalized = clampProgress(progressPercent);

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
            <Physics gravity={[0, -3.2, 0]} timeStep={1 / 60} paused={reducedMotion}>
                <CoinPile progressPercent={normalized} />
            </Physics>
            <BulldogModel compact={compact} />
            <Celebration active={normalized >= 100} />
            <ContactShadows
                position={[0, -0.56, 0]}
                opacity={0.22}
                scale={compact ? 1.45 : 1.7}
                blur={2.4}
                far={1.2}
            />
            <Environment preset="studio" />
            <OrbitControls
                enableZoom={false}
                enablePan={false}
                enableDamping
                dampingFactor={0.12}
                rotateSpeed={0.9}
                target={[0, -0.04, 0]}
                minPolarAngle={Math.PI / 2.6}
                maxPolarAngle={Math.PI / 1.7}
            />
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
