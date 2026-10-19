// Safe to use in the browser: no secrets and nothing server-only in this file.

export type PendingDispense = { requestId: string; cardNumber: string; liters: number };

// The request ID to send with a dispense. Sending the same dispense again (same card, same liters) reuses
// the earlier ID, so the service returns the first record instead of storing a second one.
export function requestIdFor(previous: PendingDispense | null, cardNumber: string, liters: number,
                             makeId: () => string): PendingDispense {
    if (previous && previous.cardNumber === cardNumber && previous.liters === liters) {
        return previous;
    }
    return { requestId: makeId(), cardNumber, liters };
}

// A new random request ID (UUID version 4). Built from crypto.getRandomValues rather than
// crypto.randomUUID: browsers only offer randomUUID on https pages and on localhost, and the kiosk is
// opened over plain http.
export function newRequestId(
    fillRandom: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes)): string {
    const bytes = fillRandom(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
