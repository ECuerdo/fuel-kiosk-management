// Run with: npm test   (Node 24 or newer; uses Node's built-in test runner, no extra packages)
import assert from "node:assert/strict";
import { test } from "node:test";

import { toStoredPhilippineTime } from "./philippine-time.ts";

// A clock fixed at 16:20:11 Philippine time on 8 October 2026.
const NOW = () => Date.parse("2026-10-08T08:20:11.000Z");

test("a moment sent by the browser in UTC is stored as the Philippine clock time", () => {
    assert.equal(toStoredPhilippineTime("2026-10-08T08:20:11.123Z", NOW), "2026-10-08T16:20:11.000Z");
});

test("an evening moment in UTC lands on the next Philippine day", () => {
    assert.equal(toStoredPhilippineTime("2026-10-08T17:30:00.000Z", NOW), "2026-10-09T01:30:00.000Z");
});

test("the last evening of a year in UTC lands on New Year's Day", () => {
    assert.equal(toStoredPhilippineTime("2026-12-31T16:00:00.000Z", NOW), "2027-01-01T00:00:00.000Z");
});

test("a moment written with the +08:00 offset keeps its clock time", () => {
    assert.equal(toStoredPhilippineTime("2026-10-08T16:20:11+08:00", NOW), "2026-10-08T16:20:11.000Z");
});

test("a time with no zone is taken as Philippine clock time already", () => {
    assert.equal(toStoredPhilippineTime("2026-10-08T16:20:11", NOW), "2026-10-08T16:20:11.000Z");
    assert.equal(toStoredPhilippineTime("2026-10-08T16:20", NOW), "2026-10-08T16:20:00.000Z");
    assert.equal(toStoredPhilippineTime("2026-10-08 16:20:11", NOW), "2026-10-08T16:20:11.000Z");
});

test("no time given means now", () => {
    assert.equal(toStoredPhilippineTime(undefined, NOW), "2026-10-08T16:20:11.000Z");
    assert.equal(toStoredPhilippineTime(null, NOW), "2026-10-08T16:20:11.000Z");
    assert.equal(toStoredPhilippineTime("", NOW), "2026-10-08T16:20:11.000Z");
});

test("a value that is not a time means now", () => {
    assert.equal(toStoredPhilippineTime("not a time", NOW), "2026-10-08T16:20:11.000Z");
    assert.equal(toStoredPhilippineTime(12345, NOW), "2026-10-08T16:20:11.000Z");
});

test("the result does not depend on the time zone of the machine running the kiosk", () => {
    const before = process.env.TZ;
    try {
        for (const zone of ["UTC", "Asia/Manila", "America/Chicago"]) {
            process.env.TZ = zone;
            assert.equal(toStoredPhilippineTime("2026-10-08T08:20:11.000Z", NOW), "2026-10-08T16:20:11.000Z", zone);
            assert.equal(toStoredPhilippineTime("2026-10-08T16:20:11", NOW), "2026-10-08T16:20:11.000Z", zone);
        }
    } finally {
        if (before === undefined) { delete process.env.TZ; } else { process.env.TZ = before; }
    }
});
