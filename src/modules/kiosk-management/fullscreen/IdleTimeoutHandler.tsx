"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Optimized IdleTimeoutHandler
 * Uses a timestamp-based approach to avoid race conditions with standard setTimeout.
 */
export function IdleTimeoutHandler() {
    const router = useRouter();
    const pathname = usePathname();
    const lastActivityRef = useRef<number>(0);

    // Set to 2 minutes (120,000ms)
    const IDLE_THRESHOLD = 120000;

    const resetActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
    }, []);

    useEffect(() => {
        // Reset activity baseline whenever the route changes
        resetActivity();

        // No idle timeout on the main kiosk hub
        if (pathname === "/kiosk-management") return;

        const events = [
            "mousedown",
            "mousemove",
            "keydown",
            "keyup",
            "wheel",
            "scroll",
            "touchstart",
            "touchmove",
            "click",
            "input",
            "change",
            "submit"
        ];

        const handleActivity = () => {
            resetActivity();
        };

        // Use Capture phase for robust event detection
        events.forEach((event) => {
            window.addEventListener(event, handleActivity, { capture: true, passive: true });
        });

        // Check idle state every second
        const checkerInterval = setInterval(() => {
            const now = Date.now();

            // PAUSE LOGIC: 
            // 1. Check if the user is typing (focused on an input)
            const activeElement = document.activeElement;
            const isInputFocused =
                activeElement?.tagName === "INPUT" ||
                activeElement?.tagName === "TEXTAREA" ||
                activeElement?.getAttribute("contenteditable") === "true";

            // 2. Check if the application is "processing" (active spinners)
            const isProcessing = document.querySelector(".animate-spin") !== null;

            if (isInputFocused || isProcessing) {
                resetActivity();
                return;
            }

            const timeSinceLastActivity = now - lastActivityRef.current;

            if (timeSinceLastActivity >= IDLE_THRESHOLD) {
                // Check if a server-down overlay is blocking the app
                const isServerDown = document.getElementById("server-down-overlay");

                if (isServerDown) {
                    // Reset activity if server is down (wait another interval)
                    resetActivity();
                } else {
                    router.push("/kiosk-management");
                }
            }
        }, 1000);

        return () => {
            clearInterval(checkerInterval);
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity, { capture: true });
            });
        };
    }, [pathname, router, resetActivity]);

    return null;
}
