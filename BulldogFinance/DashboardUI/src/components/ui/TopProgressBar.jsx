import React, { useEffect, useRef, useState } from "react";
import { subscribe } from "@/services/progressBus.js";

// NProgress-style top bar: creeps toward 90% while requests are pending, then
// completes to 100% and fades out. Short requests (<120ms) never render, so
// the bar doesn't flicker for cache-fast responses.
const TRICKLE_MS = 300;
const TRICKLE_STEP = 8;
const SHOW_DELAY_MS = 120;
const FADE_MS = 250;

export default function TopProgressBar() {
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);
    const pendingRef = useRef(0);
    const showTimerRef = useRef(null);
    const trickleTimerRef = useRef(null);
    const fadeTimerRef = useRef(null);

    useEffect(() => {
        const clearTimers = () => {
            if (showTimerRef.current) clearTimeout(showTimerRef.current);
            if (trickleTimerRef.current) clearInterval(trickleTimerRef.current);
            if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
            showTimerRef.current = null;
            trickleTimerRef.current = null;
            fadeTimerRef.current = null;
        };

        const startTrickle = () => {
            if (trickleTimerRef.current) return;
            trickleTimerRef.current = setInterval(() => {
                setProgress((current) => {
                    if (current >= 90) return current;
                    const remaining = 90 - current;
                    return current + Math.max(1, Math.round((remaining * TRICKLE_STEP) / 100));
                });
            }, TRICKLE_MS);
        };

        const unsubscribe = subscribe((count) => {
            const prev = pendingRef.current;
            pendingRef.current = count;

            if (count > 0 && prev === 0) {
                if (fadeTimerRef.current) {
                    clearTimeout(fadeTimerRef.current);
                    fadeTimerRef.current = null;
                }
                setProgress(8);
                showTimerRef.current = setTimeout(() => {
                    setVisible(true);
                    startTrickle();
                }, SHOW_DELAY_MS);
            } else if (count === 0 && prev > 0) {
                if (showTimerRef.current) {
                    clearTimeout(showTimerRef.current);
                    showTimerRef.current = null;
                }
                if (trickleTimerRef.current) {
                    clearInterval(trickleTimerRef.current);
                    trickleTimerRef.current = null;
                }
                setProgress(100);
                fadeTimerRef.current = setTimeout(() => {
                    setVisible(false);
                    setProgress(0);
                    fadeTimerRef.current = null;
                }, FADE_MS);
            }
        });

        return () => {
            unsubscribe();
            clearTimers();
        };
    }, []);

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]"
            style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease-out` }}
        >
            <div
                className="h-full bg-[var(--brand)] shadow-[0_0_8px_var(--brand)]"
                style={{
                    width: `${progress}%`,
                    transition: "width 200ms ease-out",
                }}
            />
        </div>
    );
}
