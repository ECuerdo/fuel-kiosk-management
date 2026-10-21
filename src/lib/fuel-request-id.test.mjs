// Run with: npm test   (Node 24 or newer; uses Node's built-in test runner, no extra packages)
import assert from "node:assert/strict";
import { test } from "node:test";

import { newRequestId, requestIdFor } from "./fuel-request-id.ts";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test("a new request ID has the shape of a random UUID", () => {
    assert.match(newRequestId(), UUID_V4);
});

test("two new request IDs differ", () => {
    assert.notEqual(newRequestId(), newRequestId());
});

test("the ID is built from the random bytes it is given", () => {
    const fill = (bytes) => { bytes.fill(0xff); return bytes; };
    assert.equal(newRequestId(fill), "ffffffff-ffff-4fff-bfff-ffffffffffff");
    const zero = (bytes) => { bytes.fill(0); return bytes; };
    assert.equal(newRequestId(zero), "00000000-0000-4000-8000-000000000000");
});

// Browsers only offer crypto.randomUUID on https pages and on localhost. The kiosk is opened over plain
// http (for example http://vtc:9998), where it is missing, so the ID must not depend on it.
test("a new request ID does not need crypto.randomUUID", () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true, writable: true });
    try {
        assert.match(newRequestId(), UUID_V4);
    } finally {
        Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true, writable: true });
    }
});

test("a repeated dispense (same card, same liters) keeps its request ID", () => {
    const first = requestIdFor(null, "0009000102", 1, () => "id-1");
    assert.equal(requestIdFor(first, "0009000102", 1, () => "id-2").requestId, "id-1");
});

test("a different card or a different amount gets a new request ID", () => {
    const first = requestIdFor(null, "0009000102", 1, () => "id-1");
    assert.equal(requestIdFor(first, "0009000103", 1, () => "id-2").requestId, "id-2");
    assert.equal(requestIdFor(first, "0009000102", 2, () => "id-3").requestId, "id-3");
});
