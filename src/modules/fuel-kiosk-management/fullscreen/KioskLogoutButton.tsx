"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

// A small log-out control shown on every kiosk screen. Asks first, so a stray tap does not end the session.
export function KioskLogoutButton() {
    const [loggingOut, setLoggingOut] = React.useState(false);

    const handleLogout = async () => {
        if (loggingOut || !window.confirm("Log out of the kiosk?")) {
            return;
        }
        setLoggingOut(true);
        try {
            await fetch("/api/auth/kiosk-logout", { method: "POST" });
        } finally {
            window.location.href = "/";
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            className="fixed bottom-3 right-3 z-40 gap-1.5 opacity-70 hover:opacity-100"
        >
            <LogOut className="h-3.5 w-3.5" />
            {loggingOut ? "Logging out..." : "Log out"}
        </Button>
    );
}
