"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// A small log-out control shown on every kiosk screen. Asks first, so a stray tap does not end the session.
export function KioskLogoutButton() {
    const [confirming, setConfirming] = React.useState(false);
    const [loggingOut, setLoggingOut] = React.useState(false);

    const handleLogout = async () => {
        if (loggingOut) {
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
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirming(true)}
                disabled={loggingOut}
                className="fixed bottom-3 right-3 z-40 gap-1.5 opacity-70 hover:opacity-100"
            >
                <LogOut className="h-3.5 w-3.5" />
                {loggingOut ? "Logging out..." : "Log out"}
            </Button>

            <AlertDialog open={confirming} onOpenChange={setConfirming}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Log out of the kiosk?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The kiosk returns to the login screen. An attendant has to tap a card to use it again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Stay logged in</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleLogout}>
                            Log out
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
