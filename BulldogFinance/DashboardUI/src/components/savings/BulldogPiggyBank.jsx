import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider, CylinderCollider } from "@react-three/rapier";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import bulldogLogo from "@/assets/BulldogFinance.png";
import shakeIcon from "@/assets/ShakeIconButton.png";

RectAreaLightUniformsLib.init();

const MODEL_PATH = "/models/tripo_retopo_subdiv2.glb";
const MAX_COINS = 200;

// Coin spawn position above the slot: [x, y, z].
// Keep this aligned with the red slot colliders in BASIN_COLLIDERS.
const COIN_SLOT_DROP_POSITION = [0.16, 0.67, 0];
const COIN_SLOT_SPREAD = [0.018, 0.012, 0.018];
const COIN_INITIAL_LINEAR_VELOCITY = [0, -0.85, 0];
const COIN_INITIAL_ANGULAR_VELOCITY = [0.12, 0.18, 0.06];
const COIN_NEXT_DROP_Y = 0.42;
const COIN_DROP_RETRY_MS = 1600;
const COIN_QUEUE_PUMP_INTERVAL_MS = 80;
const COIN_SHAKE_IMPULSE = 0.00005;
const COIN_SHAKE_LIFT_IMPULSE = 0.00005;
const COIN_SHAKE_TORQUE = 0.00005;
const INITIAL_DROP_STORAGE_KEY = "bulldogPiggyBank.initialDropPlayed";
const BANK_SHAKE_BUTTON_COOLDOWN_MS = 80;
const BANK_SHAKE_DURATION_MS = 900;
const BANK_SHAKE_AMPLITUDE = 0.032;
const BANK_SHAKE_ROLL = 0.08;
const BANK_SHAKE_PITCH = 0.028;
const BANK_SHAKE_BUTTON_INTENSITY = 1.35;
const BANK_MODEL_SCALE = 1.12;
const BANK_COMPACT_SCALE = 0.98;
const GLASS_EDGE_SCALE = 1.012;
const SHOW_BASIN_COLLIDER_DEBUG = false;
const DEBUG_PROGRESS_PERCENT_OVERRIDE = null; // Set to a number to ignore actual progress and show a specific state for debugging.

const COIN_VARIANTS = [
    { radius: 0.075, height: 0.018, color: "#f5cf52", weight: 0.5 },
    { radius: 0.066, height: 0.016, color: "#d99a3a", weight: 0.3 },
    { radius: 0.084, height: 0.020, color: "#b8862e", weight: 0.2 },
];

// Container collider editor:
// position: [x, y, z] is the center of the collider.
// In the actual bulldog model, x = back/front. Positive x moves toward the front/head.
// y = vertical. Negative is lower, positive is higher.
// z = left/right when looking at the bulldog from the real front.
// args: [halfWidthX, halfHeightY, halfDepthZ]. Double these values for the visible full size.
// rotation tilts a collider in radians. Most position tuning should happen before changing rotation.
const BASIN_COLLIDERS = [
    { position: [-0.065, -0.505, 0], args: [0.315, 0.026, 0.24], color: "#38bdf8" },
    { position: [-0.38, -0.21, 0], args: [0.026, 0.30, 0.24], color: "#38bdf8" },
    { position: [0.25, -0.21, 0], args: [0.026, 0.30, 0.24], color: "#38bdf8" },
    { position: [-0.065, -0.21, 0.24], args: [0.315, 0.30, 0.026], color: "#38bdf8" },
    { position: [-0.065, -0.21, -0.24], args: [0.315, 0.30, 0.026], color: "#38bdf8" },
    { position: [-0.22, 0.105, 0], args: [0.16, 0.018, 0.24], color: "#38bdf8" },
    { position: [0.105, 0.105, 0.235], args: [0.165, 0.018, 0.015], color: "#38bdf8" },
    { position: [0.105, 0.105, -0.235], args: [0.165, 0.018, 0.015], color: "#38bdf8" },
    { position: [-0.02, 0.25, 0], args: [0.026, 0.12, 0.23], color: "#38bdf8" },
    { position: [0.34, 0.25, 0], args: [0.026, 0.12, 0.23], color: "#38bdf8" },
    { position: [0.16, 0.25, 0.23], args: [0.18, 0.12, 0.026], color: "#38bdf8" },
    { position: [0.16, 0.25, -0.23], args: [0.18, 0.12, 0.026], color: "#38bdf8" },
    { position: [-0.14, 0.16, 0.18], args: [0.16, 0.10, 0.022], rotation: [0.52, 0, 0], color: "#38bdf8" },
    { position: [-0.14, 0.16, -0.18], args: [0.16, 0.10, 0.022], rotation: [-0.52, 0, 0], color: "#38bdf8" },
    { position: [0.21, 0.16, 0.18], args: [0.13, 0.10, 0.022], rotation: [0.36, 0, 0], color: "#38bdf8" },
    { position: [0.21, 0.16, -0.18], args: [0.13, 0.10, 0.022], rotation: [-0.36, 0, 0], color: "#38bdf8" },
    { position: [0.015, 0.4, 0], args: [0.035, 0.022, 0.18], color: "#f97316" },
    { position: [0.305, 0.4, 0], args: [0.035, 0.022, 0.18], color: "#f97316" },
    { position: [0.16, 0.4, 0.15], args: [0.12, 0.022, 0.03], color: "#f97316" },
    { position: [0.16, 0.4, -0.15], args: [0.12, 0.022, 0.03], color: "#f97316" },
    { position: [0.052, 0.51, 0], args: [0.012, 0.10, 0.118], color: "#ef4444" },
    { position: [0.268, 0.51, 0], args: [0.012, 0.10, 0.118], color: "#ef4444" },
    { position: [0.16, 0.51, 0.118], args: [0.108, 0.10, 0.012], color: "#ef4444" },
    { position: [0.16, 0.51, -0.118], args: [0.108, 0.10, 0.012], color: "#ef4444" },
];

const SLOT_ESCAPE_GATE_COLLIDERS = [
    { position: [0.16, 0.635, 0], args: [0.135, 0.018, 0.135], color: "#a855f7" },
];

function clampProgress(progressPercent) {
    return Math.max(0, Math.min(100, Number(progressPercent) || 0));
}

function hasPlayedInitialDrop() {
    try {
        return window.sessionStorage.getItem(INITIAL_DROP_STORAGE_KEY) === "true";
    } catch {
        return false;
    }
}

function markInitialDropPlayed() {
    try {
        window.sessionStorage.setItem(INITIAL_DROP_STORAGE_KEY, "true");
    } catch {
        // Storage can be unavailable in private contexts; falling back to replay is acceptable.
    }
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

function seededUnit(seed, salt = 0) {
    return ((seed * 9301 + salt * 49297 + 233_280) % 233_280) / 233_280;
}

function createSettledCoins(count) {
    const xSlots = [-0.30, -0.17, -0.04, 0.09];
    const zSlots = [-0.13, 0, 0.13];
    const coinsPerLayer = xSlots.length * zSlots.length;
    const baseY = -0.465;
    const layerHeight = 0.024;

    return Array.from({ length: count }, (_, id) => {
        const layer = Math.floor(id / coinsPerLayer);
        const slot = id % coinsPerLayer;
        const variant = pickVariant(id);
        const xIndex = slot % xSlots.length;
        const zIndex = Math.floor(slot / xSlots.length);
        const xJitter = (seededUnit(id, 1) - 0.5) * 0.018;
        const zJitter = (seededUnit(id, 2) - 0.5) * 0.018;

        return {
            id,
            variant,
            spawnPos: [
                xSlots[xIndex] + xJitter,
                baseY + layer * layerHeight + seededUnit(id, 3) * 0.006,
                zSlots[zIndex] + zJitter,
            ],
            spawnRot: [
                (seededUnit(id, 4) - 0.5) * 0.04,
                seededUnit(id, 5) * Math.PI,
                (seededUnit(id, 6) - 0.5) * 0.04,
            ],
            initialLinearVelocity: [0, 0, 0],
            initialAngularVelocity: [0, 0, 0],
        };
    });
}

function getBankShakeMotion(shakeState) {
    const startedAt = shakeState?.startedAt;
    if (startedAt === null || startedAt === undefined) return null;

    const elapsed = performance.now() - startedAt;
    if (elapsed >= BANK_SHAKE_DURATION_MS) {
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

function DebugBasinCollider({ position, args, rotation, color }) {
    if (!SHOW_BASIN_COLLIDER_DEBUG) return null;

    return (
        <mesh position={position} rotation={rotation} renderOrder={20}>
            <boxGeometry args={[args[0] * 2, args[1] * 2, args[2] * 2]} />
            <meshBasicMaterial
                color={color}
                wireframe
                transparent
                opacity={0.72}
                depthTest={false}
            />
        </mesh>
    );
}

// Invisible closed volume inside the bulldog's belly. The slot opens only while
// a coin is actively dropping, then closes again to stop reverse escapes.
function BellyBasin({ shakeStateRef, slotOpen }) {
    const bodyRef = useRef(null);
    const rotationRef = useRef(new THREE.Quaternion());
    const colliders = slotOpen ? BASIN_COLLIDERS : [...BASIN_COLLIDERS, ...SLOT_ESCAPE_GATE_COLLIDERS];

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
            {colliders.map((collider, index) => (
                <React.Fragment key={index}>
                    <CuboidCollider
                        position={collider.position}
                        rotation={collider.rotation}
                        args={collider.args}
                    />
                    <DebugBasinCollider {...collider} />
                </React.Fragment>
            ))}
        </RigidBody>
    );
}

function PhysicsCoin({
    id,
    variant,
    spawnPos,
    spawnRot,
    initialLinearVelocity = COIN_INITIAL_LINEAR_VELOCITY,
    initialAngularVelocity = COIN_INITIAL_ANGULAR_VELOCITY,
    registerBody,
}) {
    const bodyRef = useRef(null);

    useEffect(() => registerBody(id, bodyRef), [id, registerBody]);

    return (
        <RigidBody
            ref={bodyRef}
            colliders={false}
            position={spawnPos}
            rotation={spawnRot}
            mass={0.04}
            friction={0.6}
            restitution={0.02}
            linearDamping={0.6}
            angularDamping={0.9}
            linearVelocity={initialLinearVelocity}
            angularVelocity={initialAngularVelocity}
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

function CoinPile({ progressPercent, shakeStateRef, manualShakeSignal }) {
    const targetCount = Math.round((clampProgress(progressPercent) / 100) * MAX_COINS);
    const [initialSettleInstantly] = useState(() => hasPlayedInitialDrop());
    const shouldSettleInstantlyRef = useRef(initialSettleInstantly);
    const [coins, setCoins] = useState(() => (
        initialSettleInstantly ? createSettledCoins(targetCount) : []
    ));
    const queueRef = useRef(0);
    const nextIdRef = useRef(coins.length);
    const coinCountRef = useRef(coins.length);
    const targetCountRef = useRef(targetCount);
    const activeDropIdRef = useRef(null);
    const dropFallbackTimerRef = useRef(null);
    const coinBodiesRef = useRef(new Map());
    const [slotOpen, setSlotOpen] = useState(false);

    const clearDropFallbackTimer = useCallback(() => {
        if (dropFallbackTimerRef.current === null) return;
        window.clearTimeout(dropFallbackTimerRef.current);
        dropFallbackTimerRef.current = null;
    }, []);

    const setActiveDropId = useCallback((id) => {
        activeDropIdRef.current = id;
        setSlotOpen(id !== null);
    }, []);

    const spawnNextCoinRef = useRef(null);

    const registerCoinBody = useCallback((id, bodyRef) => {
        const coinBodies = coinBodiesRef.current;
        coinBodies.set(id, bodyRef);
        return () => coinBodies.delete(id);
    }, []);

    const scheduleDropFallback = useCallback((id) => {
        clearDropFallbackTimer();
        dropFallbackTimerRef.current = window.setTimeout(() => {
            if (activeDropIdRef.current !== id) return;

            dropFallbackTimerRef.current = null;
            const body = coinBodiesRef.current.get(id)?.current;
            if (body?.translation().y <= COIN_NEXT_DROP_Y) {
                setActiveDropId(null);
                spawnNextCoinRef.current?.();
                return;
            }

            queueRef.current += 1;
            coinCountRef.current = Math.max(0, coinCountRef.current - 1);
            setActiveDropId(null);
            setCoins((prev) => prev.filter((coin) => coin.id !== id));
            spawnNextCoinRef.current?.();
        }, COIN_DROP_RETRY_MS);
    }, [clearDropFallbackTimer, setActiveDropId]);

    const spawnNextCoin = useCallback(() => {
        if (activeDropIdRef.current !== null || queueRef.current <= 0) return;

        const currentTarget = targetCountRef.current;
        if (coinCountRef.current >= currentTarget) {
            queueRef.current = 0;
            return;
        }

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

        setActiveDropId(id);
        scheduleDropFallback(id);
        setCoins((prev) => {
            const next = [...prev, { id, variant, spawnPos, spawnRot }];
            coinCountRef.current = next.length;
            return next;
        });
    }, [scheduleDropFallback, setActiveDropId]);

    useEffect(() => {
        spawnNextCoinRef.current = spawnNextCoin;
    }, [spawnNextCoin]);

    useEffect(() => {
        if (!manualShakeSignal) return;

        const direction = shakeStateRef.current?.direction || 1;
        coinBodiesRef.current.forEach((bodyRef, id) => {
            const body = bodyRef.current;
            if (!body) return;

            const sideJitter = seededUnit(id, manualShakeSignal) - 0.5;
            const liftJitter = seededUnit(id, manualShakeSignal + 11);
            const spinJitter = seededUnit(id, manualShakeSignal + 23) - 0.5;

            body.wakeUp?.();
            body.applyImpulse?.({
                x: direction * COIN_SHAKE_IMPULSE * (0.55 + liftJitter),
                y: COIN_SHAKE_LIFT_IMPULSE * liftJitter,
                z: sideJitter * COIN_SHAKE_IMPULSE,
            }, true);
            body.applyTorqueImpulse?.({
                x: spinJitter * COIN_SHAKE_TORQUE,
                y: direction * COIN_SHAKE_TORQUE,
                z: sideJitter * COIN_SHAKE_TORQUE,
            }, true);
        });
    }, [manualShakeSignal, shakeStateRef]);

    const handleDropComplete = useCallback((id) => {
        if (activeDropIdRef.current !== id) return;

        clearDropFallbackTimer();
        setActiveDropId(null);
        spawnNextCoin();
    }, [clearDropFallbackTimer, setActiveDropId, spawnNextCoin]);

    useFrame(() => {
        const activeId = activeDropIdRef.current;
        if (activeId === null) return;

        const body = coinBodiesRef.current.get(activeId)?.current;
        if (!body) return;

        if (body.translation().y <= COIN_NEXT_DROP_Y) {
            handleDropComplete(activeId);
        }
    });

    useEffect(() => {
        targetCountRef.current = targetCount;
        if (!shouldSettleInstantlyRef.current && targetCount > 0) {
            markInitialDropPlayed();
        }

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
        const interval = window.setInterval(() => {
            const currentTarget = targetCountRef.current;
            if (shouldSettleInstantlyRef.current) {
                if (coinCountRef.current !== currentTarget || queueRef.current > 0 || activeDropIdRef.current !== null) {
                    queueRef.current = 0;
                    clearDropFallbackTimer();
                    setActiveDropId(null);
                    setCoins(createSettledCoins(currentTarget));
                    coinCountRef.current = currentTarget;
                    nextIdRef.current = currentTarget;
                }
                return;
            }

            if (coinCountRef.current > currentTarget) {
                queueRef.current = 0;
                clearDropFallbackTimer();
                setActiveDropId(null);
                setCoins((prev) => {
                    const next = prev.slice(0, currentTarget);
                    coinCountRef.current = next.length;
                    return next;
                });
                return;
            }

            spawnNextCoin();
        }, COIN_QUEUE_PUMP_INTERVAL_MS);

        return () => window.clearInterval(interval);
    }, [targetCount, clearDropFallbackTimer, setActiveDropId, spawnNextCoin]);

    useEffect(() => clearDropFallbackTimer, [clearDropFallbackTimer]);

    return (
        <>
            <BellyBasin shakeStateRef={shakeStateRef} slotOpen={slotOpen} />
            {coins.map((coin) => (
                <PhysicsCoin
                    key={coin.id}
                    id={coin.id}
                    variant={coin.variant}
                    spawnPos={coin.spawnPos}
                    spawnRot={coin.spawnRot}
                    initialLinearVelocity={coin.initialLinearVelocity}
                    initialAngularVelocity={coin.initialAngularVelocity}
                    registerBody={registerCoinBody}
                />
            ))}
        </>
    );
}

function PiggyBankScene({ progressPercent, compact, reducedMotion, manualShakeSignal }) {
    const normalized = clampProgress(progressPercent);
    const shakeStateRef = useRef({ startedAt: null, direction: 1, intensity: 1 });
    const lastShakeAtRef = useRef(0);
    const bankScale = compact ? BANK_COMPACT_SCALE : BANK_MODEL_SCALE;

    const triggerBankShake = useCallback((cooldownMs, intensity = 1) => {
        const now = performance.now();
        if (now - lastShakeAtRef.current < cooldownMs) return;

        lastShakeAtRef.current = now;
        shakeStateRef.current.startedAt = now;
        shakeStateRef.current.direction = Math.random() > 0.5 ? 1 : -1;
        shakeStateRef.current.intensity = reducedMotion ? Math.min(intensity, 0.75) : intensity;
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
                <Physics gravity={[0, -3.2, 0]} timeStep={1 / 60}>
                    <CoinPile
                        progressPercent={normalized}
                        shakeStateRef={shakeStateRef}
                        manualShakeSignal={manualShakeSignal}
                    />
                </Physics>
                <BulldogModel compact={compact} shakeStateRef={shakeStateRef} />
            </group>
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
    const normalized = clampProgress(DEBUG_PROGRESS_PERCENT_OVERRIDE ?? progressPercent);
    const reducedMotion = useReducedMotion();
    const canShake = webGLReady;

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
