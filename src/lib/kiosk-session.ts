// Signed kiosk sessions. Works in both the middleware and the API routes.
//
// A session value is "<contents>.<signature>". The contents can be read by anyone but cannot be changed or
// made up without the server's secret (KIOSK_SESSION_SECRET), because the signature would no longer match.

export type SessionKind = "kiosk" | "inbound";

export type SessionData = { userId: number; dept: number | string; rfid: string };

type SignedContents = SessionData & { kind: SessionKind; exp: number };

// The kiosk login lasts one shift; the extra unlock of the inbound / outbound area lasts 30 minutes.
export const KIOSK_SESSION_MS = 12 * 60 * 60 * 1000;
export const INBOUND_SESSION_MS = 30 * 60 * 1000;

const MINIMUM_SECRET_LENGTH = 32;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Creates the value to store in the session cookie. Fails when the secret is missing or too short,
// so a kiosk that is not set up properly lets nobody in instead of letting everybody in.
export async function createSession(kind: SessionKind, data: SessionData, lifetimeMs: number,
                                    secret: string | undefined, now: number = Date.now()): Promise<string> {
    const key = await signingKey(secret);
    if (!key) {
        throw new Error("KIOSK_SESSION_SECRET is missing or shorter than " + MINIMUM_SECRET_LENGTH + " characters");
    }
    const contents: SignedContents = { kind, userId: data.userId, dept: data.dept, rfid: data.rfid, exp: now + lifetimeMs };
    const encoded = toBase64Url(encoder.encode(JSON.stringify(contents)));
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encoded));
    return encoded + "." + toBase64Url(new Uint8Array(signature));
}

// The session's contents, or null when the value is missing, was not signed by this server, was changed,
// has expired, or was made for a different area of the kiosk.
export async function readSession(kind: SessionKind, token: string | undefined, secret: string | undefined,
                                  now: number = Date.now()): Promise<SessionData | null> {
    const key = await signingKey(secret);
    if (!key || !token) {
        return null;
    }
    const parts = token.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return null;
    }
    try {
        const valid = await crypto.subtle.verify("HMAC", key, fromBase64Url(parts[1]), encoder.encode(parts[0]));
        if (!valid) {
            return null;
        }
        const contents = JSON.parse(decoder.decode(fromBase64Url(parts[0]))) as Partial<SignedContents>;
        if (contents.kind !== kind || typeof contents.exp !== "number" || now >= contents.exp
            || typeof contents.userId !== "number" || typeof contents.rfid !== "string") {
            return null;
        }
        return { userId: contents.userId, dept: contents.dept ?? "", rfid: contents.rfid };
    } catch {
        return null;
    }
}

async function signingKey(secret: string | undefined): Promise<CryptoKey | null> {
    if (!secret || secret.length < MINIMUM_SECRET_LENGTH) {
        return null;
    }
    return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false,
        ["sign", "verify"]);
}

function toBase64Url(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
