import React, { useId, useMemo } from "react";
import bulldogLogo from "@/assets/BulldogFinance.png";

const COIN_ROWS = [
    { y: 190, xs: [84, 116, 148, 180, 212, 244, 276, 308], size: 34 },
    { y: 166, xs: [68, 100, 132, 164, 196, 228, 260, 292, 324], size: 32 },
    { y: 142, xs: [58, 92, 126, 160, 194, 228, 262, 296, 330], size: 30 },
    { y: 118, xs: [74, 108, 142, 176, 210, 244, 278, 312], size: 29 },
    { y: 94, xs: [98, 132, 166, 200, 234, 268, 302], size: 27 },
    { y: 72, xs: [122, 156, 190, 224, 258], size: 25 },
];

function buildCoins(progressPercent) {
    const normalized = Math.max(0, Math.min(100, Number(progressPercent) || 0));
    const maxCoins = COIN_ROWS.reduce((total, row) => total + row.xs.length, 0);
    const visibleCount = Math.round((normalized / 100) * maxCoins);
    const coins = [];

    COIN_ROWS.forEach((row, rowIndex) => {
        row.xs.forEach((x, index) => {
            coins.push({
                id: `${row.y}-${x}`,
                x: x + ((index + rowIndex) % 2 === 0 ? 0 : 5),
                y: row.y + ((index * 7 + rowIndex * 3) % 8),
                size: row.size,
                rotate: ((index * 19 + rowIndex * 11) % 34) - 17,
            });
        });
    });

    return coins.slice(0, visibleCount);
}

export default function BulldogPiggyBank({ progressPercent = 0, compact = false }) {
    const uniqueId = useId().replace(/:/g, "");
    const clipId = `${uniqueId}-bulldog-bank-clip`;
    const glassFillId = `${uniqueId}-glass-fill`;
    const glassStrokeId = `${uniqueId}-glass-stroke`;
    const coinGlowId = `${uniqueId}-coin-glow`;
    const softGlowId = `${uniqueId}-soft-glow`;
    const coins = useMemo(() => buildCoins(progressPercent), [progressPercent]);
    const normalized = Math.max(0, Math.min(100, Number(progressPercent) || 0));
    const shimmerOpacity = normalized >= 80 ? 0.58 : 0.28;

    return (
        <div className="relative mx-auto aspect-[1.55] w-full max-w-[32rem] overflow-visible">
            <svg
                viewBox="0 0 420 270"
                role="img"
                aria-label={`Bulldog savings bank ${normalized.toFixed(0)} percent full`}
                className="h-full w-full overflow-visible drop-shadow-[0_24px_34px_rgba(16,24,40,0.14)]"
            >
                <defs>
                    <clipPath id={clipId}>
                        <path d="M94 103 C98 81 118 67 142 70 L285 70 C331 70 363 100 363 145 C363 191 330 220 282 220 L128 220 C83 220 54 191 54 148 C54 126 68 110 94 103 Z" />
                        <path d="M63 116 C47 97 42 72 48 48 C72 57 91 74 101 97 Z" />
                        <path d="M120 88 C124 58 143 38 168 29 C176 57 171 79 154 99 Z" />
                        <path d="M70 128 C46 128 30 144 30 165 C30 188 48 202 74 198 C60 176 60 151 70 128 Z" />
                        <path d="M124 207 H176 V238 H124 Z" />
                        <path d="M260 207 H314 V238 H260 Z" />
                    </clipPath>
                    <linearGradient id={glassFillId} x1="47" x2="365" y1="34" y2="230" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#ffffff" stopOpacity="0.86" />
                        <stop offset="0.42" stopColor="#dff2ff" stopOpacity="0.34" />
                        <stop offset="1" stopColor="#eff4ff" stopOpacity="0.54" />
                    </linearGradient>
                    <linearGradient id={glassStrokeId} x1="57" x2="355" y1="36" y2="236" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#ffffff" />
                        <stop offset="0.48" stopColor="#84adff" stopOpacity="0.82" />
                        <stop offset="1" stopColor="#12b76a" stopOpacity="0.48" />
                    </linearGradient>
                    <radialGradient id={coinGlowId} cx="50%" cy="42%" r="66%">
                        <stop offset="0" stopColor="#fff7cc" stopOpacity="0.92" />
                        <stop offset="0.64" stopColor="#facc15" stopOpacity="0.38" />
                        <stop offset="1" stopColor="#f79009" stopOpacity="0" />
                    </radialGradient>
                    <filter id={softGlowId} x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feColorMatrix
                            in="blur"
                            type="matrix"
                            values="0 0 0 0 0.083 0 0 0 0 0.439 0 0 0 0 0.937 0 0 0 0.24 0"
                        />
                        <feMerge>
                            <feMergeNode />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <ellipse cx="214" cy="242" rx="150" ry="17" fill="#101828" opacity="0.1" />

                <g clipPath={`url(#${clipId})`}>
                    <rect x="18" y="24" width="362" height="218" fill={`url(#${glassFillId})`} opacity="0.5" />
                    <rect
                        x="24"
                        y={222 - normalized * 1.62}
                        width="350"
                        height={normalized * 1.62 + 22}
                        fill={`url(#${coinGlowId})`}
                        opacity={normalized > 0 ? 0.9 : 0}
                    />
                    {coins.map((coin, index) => (
                        <foreignObject
                            key={coin.id}
                            x={coin.x}
                            y={coin.y}
                            width={coin.size}
                            height={coin.size}
                            className={index >= coins.length - 2 ? "animate-in fade-in zoom-in-75 duration-500" : ""}
                            style={{
                                transformOrigin: `${coin.x + coin.size / 2}px ${coin.y + coin.size / 2}px`,
                                transform: `rotate(${coin.rotate}deg)`,
                            }}
                        >
                            <div
                                xmlns="http://www.w3.org/1999/xhtml"
                                className="h-full w-full rounded-full border border-amber-300 bg-amber-100 p-[2px] shadow-[inset_0_1px_3px_rgba(255,255,255,0.9),0_4px_8px_rgba(180,83,9,0.2)]"
                            >
                                <img
                                    src={bulldogLogo}
                                    alt=""
                                    className="h-full w-full rounded-full object-cover"
                                    draggable="false"
                                />
                            </div>
                        </foreignObject>
                    ))}
                    <path d="M34 45 C98 79 221 51 363 78" stroke="#ffffff" strokeWidth="18" opacity="0.36" />
                </g>

                <g filter={`url(#${softGlowId})`}>
                    <path
                        d="M94 103 C98 81 118 67 142 70 L285 70 C331 70 363 100 363 145 C363 191 330 220 282 220 L128 220 C83 220 54 191 54 148 C54 126 68 110 94 103 Z"
                        fill={`url(#${glassFillId})`}
                        fillOpacity="0.18"
                        stroke={`url(#${glassStrokeId})`}
                        strokeWidth="5"
                    />
                    <path
                        d="M63 116 C47 97 42 72 48 48 C72 57 91 74 101 97 Z"
                        fill="#eff8ff"
                        fillOpacity="0.34"
                        stroke={`url(#${glassStrokeId})`}
                        strokeWidth="5"
                    />
                    <path
                        d="M120 88 C124 58 143 38 168 29 C176 57 171 79 154 99 Z"
                        fill="#eff8ff"
                        fillOpacity="0.34"
                        stroke={`url(#${glassStrokeId})`}
                        strokeWidth="5"
                    />
                    <path
                        d="M70 128 C46 128 30 144 30 165 C30 188 48 202 74 198"
                        fill="none"
                        stroke={`url(#${glassStrokeId})`}
                        strokeLinecap="round"
                        strokeWidth="5"
                    />
                    <path
                        d="M124 207 H176 V238 H124 Z M260 207 H314 V238 H260 Z"
                        fill="#eff8ff"
                        fillOpacity="0.24"
                        stroke={`url(#${glassStrokeId})`}
                        strokeWidth="5"
                        strokeLinejoin="round"
                    />
                </g>

                <path d="M183 78 H276" stroke="#101828" strokeLinecap="round" strokeWidth="8" opacity="0.22" />
                <path d="M82 148 C91 156 100 156 110 148" stroke="#101828" strokeLinecap="round" strokeWidth="4" opacity="0.38" />
                <circle cx="85" cy="128" r="5" fill="#101828" opacity="0.55" />
                <ellipse cx="50" cy="153" rx="18" ry="12" fill="#ffffff" opacity="0.26" />
                <path
                    d="M105 88 C147 101 224 85 313 102"
                    stroke="#ffffff"
                    strokeLinecap="round"
                    strokeWidth="9"
                    opacity="0.52"
                />
                <path
                    d="M109 204 C151 212 238 211 301 200"
                    stroke="#175cd3"
                    strokeLinecap="round"
                    strokeWidth="4"
                    opacity="0.18"
                />
                {normalized >= 100 ? (
                    <g opacity="0.95">
                        <circle cx="335" cy="61" r="6" fill="#f79009" />
                        <circle cx="364" cy="92" r="4" fill="#12b76a" />
                        <circle cx="62" cy="62" r="4" fill="#1570ef" />
                        <path d="M344 33 L351 50 L369 52 L355 63 L359 81 L344 71 L329 81 L333 63 L319 52 L337 50 Z" fill="#facc15" />
                    </g>
                ) : null}
            </svg>

            <div
                className="pointer-events-none absolute inset-x-[10%] top-[8%] h-[42%] rounded-full bg-white blur-2xl"
                style={{ opacity: compact ? shimmerOpacity * 0.45 : shimmerOpacity }}
            />
        </div>
    );
}
