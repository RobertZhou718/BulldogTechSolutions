import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider, CylinderCollider } from "@react-three/rapier";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import bulldogLogo from "@/assets/BulldogFinance.png";
import shakeIcon from "@/assets/ShakeIconButton.png";

RectAreaLightUniformsLib.init();

const MODEL_PATH = "/models/bulldog-piggy-bank.glb";
const MAX_COINS = 200;
const COIN_SPAWN_INTERVAL_MS = 60;
const COIN_SLOT_DROP_POSITION = [0.16, 0.62, 0.02];
const COIN_SLOT_SPREAD = [0.045, 0.018, 0.018];
const BANK_SHAKE_BUTTON_COOLDOWN_MS = 80;
const BANK_SHAKE_DURATION_MS = 900;
const BANK_SHAKE_AMPLITUDE = 0.032;
const BANK_SHAKE_ROLL = 0.08;
const BANK_SHAKE_PITCH = 0.028;
const BANK_SHAKE_BUTTON_INTENSITY = 1.35;
const BANK_MODEL_SCALE = 1.12;
const BANK_COMPACT_SCALE = 0.98;
const GLASS_EDGE_SCALE = 1.012;

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

function getBankShakeMotion(shakeState) {
    const startedAt = shakeState?.startedAt;
    if (startedAt === null || startedAt === undefined) return null;

    const elapsed = performance.now() - startedAt;
    if (elapsed >= BANK_SHAKE_DURATION_MS) {
        shakeState.startedAt = null;
        return null;
    }

    const phase = elapsed / BANK_SHAKE_DURATION_MS;
    const envelope = Math.sin(phase * Math.PI);
    const swing = Math.sin(phase * Math.PI * 8) * envelope;
    const counterSwing = Math.cos(phase * Math.PI * 7) * envelope * shakeState.direction;
    const intensity = shakeState.intensity || 1;

    return {
        x: swing * BANK_SHAKE_AMPLITUDE * intensity,
        z: counterSwing * BANK_SHAKE_AMPLITUDE * 0.42 * intensity,
        roll: swing * BANK_SHAKE_ROLL * intensity,
        pitch: counterSwing * BANK_SHAKE_PITCH * intensity,
    };
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
        camera.position.set(0.02, compact ? 0.08 : 0.06, compact ? 2.65 : 2.35);
        camera.lookAt(0, -0.04, 0);
        camera.updateProjectionMatrix();
    }, [camera, compact]);

    return null;
}

function BulldogModel({ compact, shakeStateRef }) {
    const { scene } = useGLTF(MODEL_PATH);
    const groupRef = useRef(null);
    const model = useMemo(() => scene.clone(true), [scene]);
    const edgeModel = useMemo(() => scene.clone(true), [scene]);
    const baseY = compact ? -0.05 : -0.04;

    useMemo(() => {
        model.traverse((object) => {
            if (!object.isMesh) return;

            object.castShadow = true;
            object.receiveShadow = true;

            const name = (object.name || "").toLowerCase();
            const isDarkDetail = /eye|pupil|nose|nostril|slot/.test(name);

            if (isDarkDetail) {
                object.material = new THREE.MeshPhysicalMaterial({
                    color: new THREE.Color("#03050a"),
                    metalness: 0.04,
                    roughness: 0.08,
                    clearcoat: 1,
                    clearcoatRoughness: 0.02,
                    envMapIntensity: 2.2,
                });
                return;
            }

            const sourceMaterial = Array.isArray(object.material) ? object.material[0] : object.material;
            object.material = new THREE.MeshPhysicalMaterial({
                map: sourceMaterial?.map || null,
                color: new THREE.Color("#f8fcff"),
                transparent: true,
                opacity: 0.54,
                transmission: 0.58,
                thickness: 1.18,
                ior: 1.47,
                roughness: 0.018,
                metalness: 0,
                clearcoat: 1,
                clearcoatRoughness: 0.006,
                envMapIntensity: 5,
                reflectivity: 0.82,
                specularIntensity: 1,
                specularColor: new THREE.Color("#ffffff"),
                depthWrite: false,
                side: THREE.DoubleSide,
                attenuationColor: new THREE.Color("#d5e8f7"),
                attenuationDistance: 0.42,
            });
        });
    }, [model]);

    useMemo(() => {
        edgeModel.traverse((object) => {
            if (!object.isMesh) return;

            const name = (object.name || "").toLowerCase();
            const isDarkDetail = /eye|pupil|nose|nostril|slot/.test(name);
            if (isDarkDetail) {
                object.visible = false;
                return;
            }

            object.castShadow = false;
            object.receiveShadow = false;
            object.material = new THREE.MeshBasicMaterial({
                color: new THREE.Color("#d7e8f7"),
                transparent: true,
                opacity: 0.24,
                depthWrite: false,
                side: THREE.BackSide,
            });
        });
    }, [edgeModel]);

    useFrame(() => {
        const group = groupRef.current;
        if (!group) return;

        const motion = getBankShakeMotion(shakeStateRef.current);
        if (!motion) {
            group.position.set(0, baseY, 0);
            group.rotation.set(0, 0, 0);
            return;
        }

        group.position.set(motion.x, baseY, motion.z);
        group.rotation.set(motion.pitch, 0, motion.roll);
    });

    return (
        <group ref={groupRef} position={[0, baseY, 0]}>
            <primitive object={edgeModel} scale={GLASS_EDGE_SCALE} />
            <primitive object={model} />
        </group>
    );
}

// Invisible closed volume inside the bulldog's belly. The segmented lid leaves
// a narrow slot chute so new coins can enter while settled coins stay contained.
function BellyBasin({ shakeStateRef }) {
    const bodyRef = useRef(null);
    const rotationRef = useRef(new THREE.Quaternion());

    useFrame(() => {
        const body = bodyRef.current;
        if (!body) return;

        const motion = getBankShakeMotion(shakeStateRef.current);
        if (!motion) {
            body.setNextKinematicTranslation({ x: 0, y: 0, z: 0 });
            body.setNextKinematicRotation({ x: 0, y: 0, z: 0, w: 1 });
            return;
        }

        rotationRef.current.setFromEuler(new THREE.Euler(motion.pitch, 0, motion.roll));
        body.setNextKinematicTranslation({ x: motion.x, y: 0, z: motion.z });
        body.setNextKinematicRotation(rotationRef.current);
    });

    return (
        <RigidBody
            ref={bodyRef}
            type="kinematicPosition"
            colliders={false}
            friction={0.82}
            restitution={0.01}
        >
            <CuboidCollider position={[-0.105, -0.5, 0]} args={[0.315, 0.02, 0.27]} />
            <CuboidCollider position={[0.24, 0.0, 0]} args={[0.02, 0.5, 0.27]} />
            <CuboidCollider position={[-0.430, 0.0, 0]} args={[0.02, 0.5, 0.27]} />
            <CuboidCollider position={[-0.105, 0.0, 0.28]} args={[0.315, 0.5, 0.02]} />
            <CuboidCollider position={[-0.105, 0.0, -0.28]} args={[0.315, 0.5, 0.02]} />

            <CuboidCollider position={[-0.205, 0.52, 0]} args={[0.215, 0.02, 0.27]} />
            <CuboidCollider position={[0.235, 0.52, 0]} args={[0.025, 0.02, 0.27]} />
            <CuboidCollider position={[0.13, 0.52, 0.19]} args={[0.10, 0.02, 0.09]} />
            <CuboidCollider position={[0.13, 0.52, -0.19]} args={[0.10, 0.02, 0.09]} />

            <CuboidCollider position={[0.000, 0.62, 0]} args={[0.012, 0.10, 0.11]} />
            <CuboidCollider position={[0.255, 0.62, 0]} args={[0.012, 0.10, 0.11]} />
            <CuboidCollider position={[0.13, 0.62, 0.115]} args={[0.125, 0.10, 0.012]} />
            <CuboidCollider position={[0.13, 0.62, -0.115]} args={[0.125, 0.10, 0.012]} />
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
            ccd
        >
            <CylinderCollider args={[variant.height / 2, variant.radius]} />
            <mesh castShadow receiveShadow>
                <cylinderGeometry args={[variant.radius, variant.radius, variant.height, 14]} />
                <meshStandardMaterial
                    color={variant.color}
                    metalness={0.86}
                    roughness={0.22}
                    envMapIntensity={1.6}
                />
            </mesh>
        </RigidBody>
    );
}

function CoinPile({ progressPercent, shakeStateRef }) {
    const targetCount = Math.round((clampProgress(progressPercent) / 100) * MAX_COINS);
    const [coins, setCoins] = useState([]);
    const queueRef = useRef(0);
    const nextIdRef = useRef(0);
    const coinCountRef = useRef(0);
    const targetCountRef = useRef(targetCount);

    useEffect(() => {
        targetCountRef.current = targetCount;
        const pending = queueRef.current;
        const total = coinCountRef.current + pending;

        if (targetCount > total) {
            queueRef.current += targetCount - total;
        } else if (targetCount < coinCountRef.current) {
            queueRef.current = 0;
        } else if (targetCount < total) {
            queueRef.current = Math.max(0, targetCount - coinCountRef.current);
        }
    }, [targetCount]);

    useEffect(() => {
        const interval = setInterval(() => {
            const currentTarget = targetCountRef.current;
            if (coinCountRef.current > currentTarget) {
                setCoins((prev) => {
                    const next = prev.slice(0, currentTarget);
                    coinCountRef.current = next.length;
                    return next;
                });
                return;
            }

            if (queueRef.current <= 0) return;
            queueRef.current -= 1;
            const id = nextIdRef.current++;
            const variant = pickVariant(id);
            const spawnPos = [
                COIN_SLOT_DROP_POSITION[0] + (Math.random() - 0.5) * COIN_SLOT_SPREAD[0],
                COIN_SLOT_DROP_POSITION[1] + Math.random() * COIN_SLOT_SPREAD[1],
                COIN_SLOT_DROP_POSITION[2] + (Math.random() - 0.5) * COIN_SLOT_SPREAD[2],
            ];
            const spawnRot = [
                Math.PI / 2 + (Math.random() - 0.5) * 0.28,
                Math.random() * Math.PI,
                (Math.random() - 0.5) * 0.18,
            ];
            setCoins((prev) => {
                const next = [...prev, { id, variant, spawnPos, spawnRot }];
                coinCountRef.current = next.length;
                return next;
            });
        }, COIN_SPAWN_INTERVAL_MS);

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <BellyBasin shakeStateRef={shakeStateRef} />
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

function PiggyBankScene({ progressPercent, compact, reducedMotion, manualShakeSignal }) {
    const normalized = clampProgress(progressPercent);
    const shakeStateRef = useRef({ startedAt: null, direction: 1, intensity: 1 });
    const lastShakeAtRef = useRef(0);
    const bankScale = compact ? BANK_COMPACT_SCALE : BANK_MODEL_SCALE;

    const triggerBankShake = useCallback((cooldownMs, intensity = 1) => {
        if (reducedMotion) return;

        const now = performance.now();
        if (now - lastShakeAtRef.current < cooldownMs) return;

        lastShakeAtRef.current = now;
        shakeStateRef.current.startedAt = now;
        shakeStateRef.current.direction = Math.random() > 0.5 ? 1 : -1;
        shakeStateRef.current.intensity = intensity;
    }, [reducedMotion]);

    useEffect(() => {
        if (!manualShakeSignal) return;
        triggerBankShake(BANK_SHAKE_BUTTON_COOLDOWN_MS, BANK_SHAKE_BUTTON_INTENSITY);
    }, [manualShakeSignal, triggerBankShake]);

    return (
        <>
            <SceneCamera compact={compact} />
            <ambientLight intensity={0.22} />
            <hemisphereLight args={["#ffffff", "#d7e7f7", 0.72]} />
            <directionalLight
                castShadow
                position={[0.2, 4.6, 1.3]}
                intensity={1.75}
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
            />
            <rectAreaLight position={[-0.72, 2.25, 1.15]} rotation={[-0.78, -0.24, -0.08]} width={0.18} height={1.35} intensity={6.2} color="#ffffff" />
            <rectAreaLight position={[0.74, 2.05, 1.02]} rotation={[-0.82, 0.28, 0.1]} width={0.16} height={1.12} intensity={4.4} color="#eef8ff" />
            <rectAreaLight position={[0, 2.65, 0.2]} rotation={[-Math.PI / 2, 0, 0]} width={1.25} height={0.34} intensity={3.6} color="#ffffff" />
            <spotLight position={[0, 3.2, 1.35]} angle={0.5} penumbra={0.74} intensity={1.2} color="#ffffff" />
            <group scale={bankScale}>
                <Physics gravity={[0, -3.2, 0]} timeStep={1 / 60} paused={reducedMotion}>
                    <CoinPile progressPercent={normalized} shakeStateRef={shakeStateRef} />
                </Physics>
                <BulldogModel compact={compact} shakeStateRef={shakeStateRef} />
            </group>
            <Celebration active={normalized >= 100} />
            <ContactShadows
                position={[0, -0.56, 0]}
                opacity={0.46}
                scale={compact ? 1.22 : 1.46}
                blur={1.85}
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
    const [manualShakeSignal, setManualShakeSignal] = useState(0);
    const normalized = clampProgress(progressPercent);
    const reducedMotion = useReducedMotion();
    const canShake = webGLReady && !reducedMotion;

    return (
        <div className={`${compact ? "mx-auto aspect-[1.4] max-w-[36rem]" : "h-full min-h-[24rem]"} relative isolate w-full overflow-visible`}>
            <div
                className="relative h-full w-full"
                role="img"
                aria-label={`Bulldog savings bank ${normalized.toFixed(0)} percent full`}
            >
                {webGLReady ? (
                    <Canvas
                        shadows
                        dpr={[1, compact ? 1.35 : 1.6]}
                        camera={{ fov: compact ? 34 : 48, near: 0.1, far: 20 }}
                        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
                        className="h-full w-full overflow-visible"
                        onCreated={({ gl }) => {
                            gl.outputColorSpace = THREE.SRGBColorSpace;
                            gl.toneMapping = THREE.ACESFilmicToneMapping;
                            gl.toneMappingExposure = 0.96;
                        }}
                        onError={() => setWebGLReady(false)}
                    >
                        <Suspense fallback={<LoadingBank normalized={normalized} />}>
                            <PiggyBankScene
                                progressPercent={normalized}
                                compact={compact}
                                reducedMotion={reducedMotion}
                                manualShakeSignal={manualShakeSignal}
                            />
                        </Suspense>
                    </Canvas>
                ) : (
                    <WebGLFallback normalized={normalized} compact={compact} />
                )}
            </div>

            <button
                type="button"
                className={`${compact ? "left-3 top-3 size-10" : "left-4 top-4 size-12"} absolute z-20 inline-flex items-center justify-center rounded-full border border-white/18 bg-white/12 shadow-[0_12px_28px_rgba(2,8,23,0.24)] backdrop-blur-md transition hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 disabled:cursor-not-allowed disabled:opacity-45`}
                aria-label="Shake coins"
                title="Shake coins"
                disabled={!canShake}
                onClick={() => setManualShakeSignal((value) => value + 1)}
            >
                <img
                    src={shakeIcon}
                    alt=""
                    className={`${compact ? "size-7" : "size-9"} object-contain drop-shadow-[0_1px_2px_rgba(255,255,255,0.28)]`}
                    draggable="false"
                />
            </button>
        </div>
    );
}

useGLTF.preload(MODEL_PATH);
