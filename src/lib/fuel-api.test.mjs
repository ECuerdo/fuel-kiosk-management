// Run with: npm test   (Node 24 or newer; uses Node's built-in test runner, no extra packages)
import assert from "node:assert/strict";
import { test } from "node:test";

import { attendantCardFromSession, fuelApiPost } from "./fuel-api.ts";
import { requestIdFor } from "./fuel-request-id.ts";

const CONFIG = { baseUrl: "http://fuel.test:8408", apiKey: "test-key-0123456789abcdefghij" };
const UNAVAILABLE = "Fuel service unavailable. Do not dispense.";

// A stand-in for fetch that records what it was asked and answers as told.
function fakeFetch(status, body) {
    const calls = [];
    const fn = async (url, init) => {
        calls.push({ url, init });
        return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
    };
    return { fn, calls };
}

test("sends the body as JSON to the service with the key in the X-API-Key header", async () => {
    const { fn, calls } = fakeFetch(200, { userId: 900112 });

    await fuelApiPost(CONFIG, "/api/fuel/balance", { cardNumber: "0009000112" }, fn);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://fuel.test:8408/api/fuel/balance");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers["X-API-Key"], CONFIG.apiKey);
    assert.equal(calls[0].init.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(calls[0].init.body), { cardNumber: "0009000112" });
    assert.ok(!calls[0].url.includes("0009000112"), "the card number must not be in the address");
});

test("a base address ending in a slash still builds a clean address", async () => {
    const { fn, calls } = fakeFetch(200, {});

    await fuelApiPost({ ...CONFIG, baseUrl: "http://fuel.test:8408/" }, "/api/fuel/balance", {}, fn);

    assert.equal(calls[0].url, "http://fuel.test:8408/api/fuel/balance");
});

test("passes the service's answer through: status and body", async () => {
    const created = { receiptNo: "D-2026-0001", remainingLiters: 15.0, alreadyRecorded: false };
    assert.deepEqual(await fuelApiPost(CONFIG, "/api/fuel/dispenses", {}, fakeFetch(201, created).fn),
        { status: 201, body: created });

    const refused = { code: "INSUFFICIENT_BALANCE", message: "Insufficient balance. Remaining: 3.50 L." };
    assert.deepEqual(await fuelApiPost(CONFIG, "/api/fuel/dispenses", {}, fakeFetch(409, refused).fn),
        { status: 409, body: refused });

    const notFound = { code: "CARD_NOT_FOUND", message: "No user is registered with this card" };
    assert.deepEqual(await fuelApiPost(CONFIG, "/api/fuel/balance", {}, fakeFetch(404, notFound).fn),
        { status: 404, body: notFound });
});

test("with no address or no key configured, nothing is sent and the kiosk is told the service is unavailable", async () => {
    for (const config of [{ baseUrl: undefined, apiKey: CONFIG.apiKey }, { baseUrl: CONFIG.baseUrl, apiKey: "" }]) {
        const { fn, calls } = fakeFetch(200, {});

        const result = await fuelApiPost(config, "/api/fuel/balance", {}, fn);

        assert.equal(calls.length, 0);
        assert.equal(result.status, 503);
        assert.equal(result.body.code, "FUEL_SERVICE_UNAVAILABLE");
        assert.equal(result.body.message, UNAVAILABLE);
    }
});

test("a service that cannot be reached is reported as unavailable, never as success", async () => {
    const failing = async () => { throw new TypeError("fetch failed"); };

    const result = await fuelApiPost(CONFIG, "/api/fuel/dispenses", {}, failing);

    assert.equal(result.status, 503);
    assert.equal(result.body.code, "FUEL_SERVICE_UNAVAILABLE");
    assert.equal(result.body.message, UNAVAILABLE);
});

test("a rejected key or a blocked address is reported as unavailable, without showing why on screen", async () => {
    for (const [status, code] of [[401, "UNAUTHORIZED"], [429, "TOO_MANY_ATTEMPTS"]]) {
        const result = await fuelApiPost(CONFIG, "/api/fuel/balance", {}, fakeFetch(status, { code, message: "x" }).fn);

        assert.equal(result.status, 503);
        assert.equal(result.body.code, "FUEL_SERVICE_UNAVAILABLE");
        assert.equal(result.body.message, UNAVAILABLE);
    }
});

test("an answer that is not JSON, or a server error, is reported as unavailable", async () => {
    for (const fetcher of [fakeFetch(200, "<html>not json</html>").fn, fakeFetch(500, { error: "boom" }).fn]) {
        const result = await fuelApiPost(CONFIG, "/api/fuel/balance", {}, fetcher);

        assert.equal(result.status, 503);
        assert.equal(result.body.message, UNAVAILABLE);
    }
});

test("a busy answer from the service is passed through so the same request can be sent again", async () => {
    const busy = { code: "BUSY", message: "The fuel service is busy. Send the same request again with the same requestId." };

    assert.deepEqual(await fuelApiPost(CONFIG, "/api/fuel/dispenses", {}, fakeFetch(503, busy).fn),
        { status: 503, body: busy });
});

test("the attendant's card number is read from the session value", () => {
    const session = Buffer.from(JSON.stringify({ userId: 900101, dept: 13, rfid: "0009000101" })).toString("base64");

    assert.equal(attendantCardFromSession(session), "0009000101");
});

test("a session without a card number, or one that cannot be read, gives no attendant card", () => {
    const older = Buffer.from(JSON.stringify({ userId: 900101, dept: 13 })).toString("base64");

    assert.equal(attendantCardFromSession(older), undefined);
    assert.equal(attendantCardFromSession("not-base64-json"), undefined);
    assert.equal(attendantCardFromSession(undefined), undefined);
    assert.equal(attendantCardFromSession(""), undefined);
});

test("a first attempt gets a new request ID", () => {
    const next = requestIdFor(null, "0009000112", 5, () => "id-1");

    assert.deepEqual(next, { requestId: "id-1", cardNumber: "0009000112", liters: 5 });
});

test("sending the same dispense again reuses its request ID, so it cannot be recorded twice", () => {
    const first = requestIdFor(null, "0009000112", 5, () => "id-1");

    assert.equal(requestIdFor(first, "0009000112", 5, () => "id-2").requestId, "id-1");
});

test("a different amount or a different card gets a new request ID", () => {
    const first = requestIdFor(null, "0009000112", 5, () => "id-1");

    assert.equal(requestIdFor(first, "0009000112", 6, () => "id-2").requestId, "id-2");
    assert.equal(requestIdFor(first, "0009000114", 5, () => "id-3").requestId, "id-3");
});
