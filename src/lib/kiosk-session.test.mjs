// Run with: npm test   (Node 24 or newer; uses Node's built-in test runner, no extra packages)
import assert from "node:assert/strict";
import { test } from "node:test";

import { createSession, readSession, KIOSK_SESSION_MS } from "./kiosk-session.ts";

const SECRET = "a-test-secret-of-at-least-32-characters";
const OTHER_SECRET = "another-secret-of-at-least-32-characters";
const NOW = Date.parse("2026-10-08T03:00:00Z");
const ATTENDANT = { userId: 900101, dept: 13, rfid: "0009000101" };

test("a session that was just created is read back with what was put in it", async () => {
    const token = await createSession("kiosk", ATTENDANT, KIOSK_SESSION_MS, SECRET, NOW);

    const session = await readSession("kiosk", token, SECRET, NOW + 1000);

    assert.equal(session.userId, 900101);
    assert.equal(session.dept, 13);
    assert.equal(session.rfid, "0009000101");
});

test("the kiosk session lasts 12 hours", async () => {
    assert.equal(KIOSK_SESSION_MS, 12 * 60 * 60 * 1000);
    const token = await createSession("kiosk", ATTENDANT, KIOSK_SESSION_MS, SECRET, NOW);

    assert.ok(await readSession("kiosk", token, SECRET, NOW + KIOSK_SESSION_MS - 1000), "valid just before 12 hours");
    assert.equal(await readSession("kiosk", token, SECRET, NOW + KIOSK_SESSION_MS), null, "expired at 12 hours");
});

test("a session whose contents were changed is refused", async () => {
    const token = await createSession("kiosk", { userId: 900111, dept: 8, rfid: "0009000111" }, KIOSK_SESSION_MS, SECRET, NOW);
    const [, signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ kind: "kiosk", userId: 900111, dept: 13, rfid: "0009000111", exp: NOW + KIOSK_SESSION_MS }))
        .toString("base64url");

    assert.equal(await readSession("kiosk", `${forgedPayload}.${signature}`, SECRET, NOW), null);
});

test("a session signed with a different secret is refused", async () => {
    const token = await createSession("kiosk", ATTENDANT, KIOSK_SESSION_MS, OTHER_SECRET, NOW);

    assert.equal(await readSession("kiosk", token, SECRET, NOW), null);
});

test("the old unsigned cookie format is refused", async () => {
    const oldStyle = Buffer.from(JSON.stringify({ userId: 900101, dept: 13, timestamp: NOW })).toString("base64");

    assert.equal(await readSession("kiosk", oldStyle, SECRET, NOW), null);
    assert.equal(await readSession("inbound", "true", SECRET, NOW), null);
});

test("a session made for one area is not accepted for another", async () => {
    const inbound = await createSession("inbound", ATTENDANT, 30 * 60 * 1000, SECRET, NOW);

    assert.equal(await readSession("kiosk", inbound, SECRET, NOW), null);
    assert.ok(await readSession("inbound", inbound, SECRET, NOW));
});

test("a missing, empty or garbled value is refused", async () => {
    for (const value of [undefined, "", "abc", "a.b", "a.b.c", "....", "%%%.%%%"]) {
        assert.equal(await readSession("kiosk", value, SECRET, NOW), null, `value [${value}]`);
    }
});

test("without a secret of at least 32 characters no session is created and none is accepted", async () => {
    const good = await createSession("kiosk", ATTENDANT, KIOSK_SESSION_MS, SECRET, NOW);

    for (const secret of [undefined, "", "too-short"]) {
        await assert.rejects(() => createSession("kiosk", ATTENDANT, KIOSK_SESSION_MS, secret, NOW));
        assert.equal(await readSession("kiosk", good, secret, NOW), null);
    }
});
