// Run with: npm test   (Node 24 or newer; uses Node's built-in test runner, no extra packages)
import assert from "node:assert/strict";
import { test } from "node:test";

import { AttemptLimiter, formatCountdown } from "./attempt-limiter.ts";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const KIOSK = "192.168.0.50";
const OTHER_KIOSK = "192.168.0.51";

// A clock the test moves forward by hand.
function clock() {
    let now = Date.parse("2026-10-08T03:00:00Z");
    return { now: () => now, advance: (ms) => { now += ms; } };
}

// The attendant login rule: 5 failures in 5 minutes pause logins for 5 minutes, doubling up to 15.
function loginLimiter(time) {
    return new AttemptLimiter({
        maximumFailures: 5, windowMs: 5 * MINUTE, firstPauseMs: 5 * MINUTE, longestPauseMs: 15 * MINUTE,
        calmDownMs: 24 * HOUR, now: time.now,
    });
}

// The dispenser rule: 5 unknown cards in 5 minutes pause the dispenser for 1 minute, never longer.
function dispenserLimiter(time) {
    return new AttemptLimiter({
        maximumFailures: 5, windowMs: 5 * MINUTE, firstPauseMs: MINUTE, longestPauseMs: MINUTE,
        calmDownMs: 24 * HOUR, now: time.now,
    });
}

function fail(limiter, key, times) {
    let last = 0;
    for (let i = 0; i < times; i++) {
        last = limiter.recordFailure(key);
    }
    return last;
}

test("four failures do not pause the kiosk and the fifth pauses it for five minutes", () => {
    const time = clock();
    const limiter = loginLimiter(time);

    assert.equal(fail(limiter, KIOSK, 4), 0);
    assert.equal(limiter.secondsUntilAllowed(KIOSK), 0);

    assert.equal(limiter.recordFailure(KIOSK), 300, "the fifth failure reports the pause in seconds");
    assert.equal(limiter.secondsUntilAllowed(KIOSK), 300);
});

test("the pause counts down and ends", () => {
    const time = clock();
    const limiter = loginLimiter(time);
    fail(limiter, KIOSK, 5);

    time.advance(4 * MINUTE + 15_000);
    assert.equal(limiter.secondsUntilAllowed(KIOSK), 45);

    time.advance(45_000);
    assert.equal(limiter.secondsUntilAllowed(KIOSK), 0);
});

test("failures older than five minutes no longer count", () => {
    const time = clock();
    const limiter = loginLimiter(time);
    fail(limiter, KIOSK, 4);

    time.advance(5 * MINUTE + 1000);

    assert.equal(limiter.recordFailure(KIOSK), 0);
    assert.equal(limiter.secondsUntilAllowed(KIOSK), 0);
});

test("a success in between does not reset the count", () => {
    const time = clock();
    const limiter = loginLimiter(time);

    fail(limiter, KIOSK, 4);
    // nothing is told to the limiter on a success: there is no reset to call
    assert.equal(typeof limiter.recordSuccess, "undefined");
    assert.equal(limiter.recordFailure(KIOSK), 300);
});

test("each repeat doubles the pause, up to fifteen minutes", () => {
    const time = clock();
    const limiter = loginLimiter(time);

    assert.equal(fail(limiter, KIOSK, 5), 300);
    time.advance(5 * MINUTE);
    assert.equal(fail(limiter, KIOSK, 5), 600);
    time.advance(10 * MINUTE);
    assert.equal(fail(limiter, KIOSK, 5), 900);
    time.advance(15 * MINUTE);
    assert.equal(fail(limiter, KIOSK, 5), 900, "never longer than fifteen minutes");
});

test("after 24 hours without a pause the next one is back to five minutes", () => {
    const time = clock();
    const limiter = loginLimiter(time);
    fail(limiter, KIOSK, 5);
    time.advance(5 * MINUTE);
    assert.equal(fail(limiter, KIOSK, 5), 600);

    time.advance(10 * MINUTE + 24 * HOUR);

    assert.equal(fail(limiter, KIOSK, 5), 300);
});

test("a pause that ended less than 24 hours ago still doubles the next one", () => {
    const time = clock();
    const limiter = loginLimiter(time);
    fail(limiter, KIOSK, 5);

    time.advance(5 * MINUTE + 23 * HOUR);

    assert.equal(fail(limiter, KIOSK, 5), 600);
});

test("failures during a pause are not counted and do not make it longer", () => {
    const time = clock();
    const limiter = loginLimiter(time);
    fail(limiter, KIOSK, 5);

    time.advance(2 * MINUTE);
    assert.equal(fail(limiter, KIOSK, 20), 0);
    assert.equal(limiter.secondsUntilAllowed(KIOSK), 180);

    time.advance(3 * MINUTE);
    assert.equal(limiter.secondsUntilAllowed(KIOSK), 0);
    assert.equal(fail(limiter, KIOSK, 4), 0, "the count starts from zero after the pause");
});

test("each kiosk is counted on its own", () => {
    const time = clock();
    const limiter = loginLimiter(time);

    fail(limiter, KIOSK, 5);
    fail(limiter, OTHER_KIOSK, 4);

    assert.equal(limiter.secondsUntilAllowed(KIOSK), 300);
    assert.equal(limiter.secondsUntilAllowed(OTHER_KIOSK), 0);
});

test("the dispenser pauses for one minute and never longer", () => {
    const time = clock();
    const limiter = dispenserLimiter(time);

    assert.equal(fail(limiter, KIOSK, 5), 60);
    time.advance(MINUTE);
    assert.equal(fail(limiter, KIOSK, 5), 60);
    time.advance(MINUTE);
    assert.equal(fail(limiter, KIOSK, 5), 60);
});

test("kiosks that stopped failing long ago are forgotten", () => {
    const time = clock();
    const limiter = loginLimiter(time);
    for (let i = 0; i < 300; i++) {
        limiter.recordFailure("10.0.0." + i);
    }

    time.advance(25 * HOUR);
    limiter.recordFailure(KIOSK);

    assert.equal(limiter.trackedKeys(), 1);
});

test("the wait is shown as minutes and seconds", () => {
    assert.equal(formatCountdown(45), "0:45");
    assert.equal(formatCountdown(60), "1:00");
    assert.equal(formatCountdown(299), "4:59");
    assert.equal(formatCountdown(900), "15:00");
    assert.equal(formatCountdown(5), "0:05");
    assert.equal(formatCountdown(0), "0:00");
    assert.equal(formatCountdown(-3), "0:00");
});
