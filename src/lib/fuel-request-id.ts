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
