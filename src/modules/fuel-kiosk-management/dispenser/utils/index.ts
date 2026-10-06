export function formatLiters(amount: number): string {
    return amount.toFixed(2);
}

export function formatDateTime(isoString?: string): string {
    if (!isoString) return new Date().toLocaleString();
    try {
        const date = new Date(isoString);
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    } catch {
        return isoString;
    }
}
