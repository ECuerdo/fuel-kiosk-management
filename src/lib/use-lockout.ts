"use client";

import { useCallback, useEffect, useState } from "react";

// Counts down a pause on screen. lockFor(seconds) starts it; secondsLeft is 0 when the kiosk may try again.
export function useLockout() {
    const [lockedUntil, setLockedUntil] = useState(0);
    const [now, setNow] = useState(0);

    useEffect(() => {
        if (!lockedUntil) {
            return;
        }
        const timer = setInterval(() => {
            const current = Date.now();
            setNow(current);
            if (current >= lockedUntil) {
                setLockedUntil(0);
            }
        }, 250);
        return () => clearInterval(timer);
    }, [lockedUntil]);

    const lockFor = useCallback((seconds: number) => {
        const current = Date.now();
        setNow(current);
        setLockedUntil(current + seconds * 1000);
    }, []);

    const secondsLeft = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;
    return { secondsLeft, lockFor };
}
