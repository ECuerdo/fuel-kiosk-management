// How the kiosk talks to the fuel service. Used on the server side only: the key never reaches the browser.

export type FuelApiConfig = { baseUrl: string | undefined; apiKey: string | undefined };

export type FuelApiResult = { status: number; body: unknown };

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

const TIMEOUT_MS = 15_000;

// What the kiosk shows whenever the service cannot give a real answer. Never treated as success.
const UNAVAILABLE: FuelApiResult = {
    status: 503,
    body: { code: "FUEL_SERVICE_UNAVAILABLE", message: "Fuel service unavailable. Do not dispense." },
};

// Sends one request to the fuel service and returns its status and JSON body.
// Answers the kiosk can act on (200, 201, 400, 404, 409 and the service's own "busy" 503) are passed through.
// Anything else - not configured, unreachable, key rejected, address blocked, a server error, a body that is
// not JSON - comes back as "unavailable". The reason is logged on the server and not shown on screen.
export async function fuelApiPost(config: FuelApiConfig, path: string, payload: unknown,
                                  fetcher: Fetcher = fetch): Promise<FuelApiResult> {
    if (!config.baseUrl || !config.apiKey) {
        console.error("[fuel-api] SPRING_API_BASE_URL or FUEL_API_KEY is not set");
        return UNAVAILABLE;
    }
    const url = config.baseUrl.replace(/\/+$/, "") + path;

    let response: Response;
    try {
        response = await fetcher(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-API-Key": config.apiKey },
            body: JSON.stringify(payload),
            cache: "no-store",
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
    } catch (error) {
        console.error(`[fuel-api] ${path} could not be reached:`, error);
        return UNAVAILABLE;
    }

    let body: unknown;
    try {
        body = await response.json();
    } catch {
        console.error(`[fuel-api] ${path} answered ${response.status} with a body that is not JSON`);
        return UNAVAILABLE;
    }

    const isBusy = response.status === 503 && (body as { code?: string } | null)?.code === "BUSY";
    if (response.status === 401 || response.status === 429 || (response.status >= 500 && !isBusy)) {
        console.error(`[fuel-api] ${path} answered ${response.status}:`, body);
        return UNAVAILABLE;
    }
    return { status: response.status, body };
}

// The card number of the logged-in attendant, kept in the kiosk session at login.
// Sessions created before the card number was stored there have none.
export function attendantCardFromSession(sessionValue: string | undefined): string | undefined {
    if (!sessionValue) {
        return undefined;
    }
    try {
        const session = JSON.parse(Buffer.from(sessionValue, "base64").toString("utf8")) as { rfid?: unknown };
        return typeof session.rfid === "string" && session.rfid.trim() ? session.rfid.trim() : undefined;
    } catch {
        return undefined;
    }
}
