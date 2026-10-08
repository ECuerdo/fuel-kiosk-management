// Pauses a kiosk after too many failed card taps in a short time.
//
// Failures are counted per key (the kiosk's network address) over a rolling window. Reaching the maximum
// starts a pause. Each further pause is twice as long as the one before, up to a longest pause, and the
// doubling starts over after a calm period with no pause. A successful tap does not reset the count.
// Everything is kept in memory: restarting the kiosk application clears all counts and pauses.

export type AttemptLimiterOptions = {
    maximumFailures: number;
    windowMs: number;
    firstPauseMs: number;
    longestPauseMs: number;
    calmDownMs: number;
    now?: () => number;
};

type KioskRecord = {
    failures: number[];
    pausedUntil: number;
    pausesSoFar: number;
};

export class AttemptLimiter {

    private readonly options: AttemptLimiterOptions;
    private readonly now: () => number;
    private readonly records = new Map<string, KioskRecord>();
    private lastCleanup: number;

    constructor(options: AttemptLimiterOptions) {
        this.options = options;
        this.now = options.now ?? Date.now;
        this.lastCleanup = this.now();
    }

    // Seconds until this kiosk may try again, rounded up; 0 when it is not paused.
    secondsUntilAllowed(key: string): number {
        const record = this.records.get(key);
        if (!record) {
            return 0;
        }
        const remainingMs = record.pausedUntil - this.now();
        return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
    }

    // Notes one failed tap. Returns the length of the pause in seconds when this failure started one,
    // otherwise 0. Failures that arrive during a pause are not counted and do not make it longer.
    recordFailure(key: string): number {
        const now = this.now();
        this.forgetQuietKiosks(now);

        let record = this.records.get(key);
        if (!record) {
            record = { failures: [], pausedUntil: 0, pausesSoFar: 0 };
            this.records.set(key, record);
        }
        if (now < record.pausedUntil) {
            return 0;
        }
        if (record.pausesSoFar > 0 && now - record.pausedUntil >= this.options.calmDownMs) {
            record.pausesSoFar = 0;
        }

        record.failures = record.failures.filter((at) => at > now - this.options.windowMs);
        record.failures.push(now);
        if (record.failures.length < this.options.maximumFailures) {
            return 0;
        }

        const pauseMs = Math.min(this.options.firstPauseMs * 2 ** record.pausesSoFar, this.options.longestPauseMs);
        record.failures = [];
        record.pausedUntil = now + pauseMs;
        record.pausesSoFar += 1;
        return Math.ceil(pauseMs / 1000);
    }

    // How many kiosks are being remembered right now.
    trackedKeys(): number {
        return this.records.size;
    }

    // Once per window, drops every kiosk that is not paused, has no failure inside the window, and whose
    // last pause ended longer ago than the calm period.
    private forgetQuietKiosks(now: number): void {
        if (now - this.lastCleanup < this.options.windowMs) {
            return;
        }
        this.lastCleanup = now;
        for (const [key, record] of this.records) {
            const hasRecentFailure = record.failures.some((at) => at > now - this.options.windowMs);
            const isPaused = now < record.pausedUntil;
            const stillEscalated = record.pausesSoFar > 0 && now - record.pausedUntil < this.options.calmDownMs;
            if (!hasRecentFailure && !isPaused && !stillEscalated) {
                this.records.delete(key);
            }
        }
    }
}

// A wait in seconds as minutes and seconds, for example 45 -> "0:45".
export function formatCountdown(seconds: number): string {
    const whole = Math.max(0, Math.floor(seconds));
    return Math.floor(whole / 60) + ":" + String(whole % 60).padStart(2, "0");
}
