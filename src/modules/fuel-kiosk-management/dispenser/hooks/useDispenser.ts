import { useState, useCallback, useRef } from "react";
import { UserFuelBalance, DispenseRequest, DispenserStep } from "../types";
import { fetchProvider, LockoutError } from "../providers/fetchProvider";
import { useLockout } from "@/lib/use-lockout";
import { toast } from "sonner";
import { PendingDispense, requestIdFor } from "@/lib/fuel-request-id";

export function useDispenser() {
    const [step, setStep] = useState<DispenserStep>("RFID_INPUT");
    const [rfid, setRfid] = useState<string>("");
    const [userBalance, setUserBalance] = useState<UserFuelBalance | null>(null);
    const [litersToDispense, setLitersToDispense] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [dispenseSuccessData, setDispenseSuccessData] = useState<{
        dispensedLiters: number;
        docNo: string;
        userName: string;
        remainingLiters: number;
    } | null>(null);

    // Counts down on screen when the card entry is paused after too many unknown cards.
    const { secondsLeft: lockoutSeconds, lockFor } = useLockout();

    // The dispense last sent, kept so that sending it again reuses the same request ID.
    const pendingDispense = useRef<PendingDispense | null>(null);

    const resetState = useCallback(() => {
        pendingDispense.current = null;
        setStep("RFID_INPUT");
        setRfid("");
        setUserBalance(null);
        setLitersToDispense("");
        setLoading(false);
        setError(null);
        setDispenseSuccessData(null);
    }, []);

    const handleVerifyRfid = async (scannedRfid: string) => {
        if (!scannedRfid.trim()) {
            toast.error("Please enter or scan an RFID card");
            return;
        }
        if (lockoutSeconds > 0) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const balance = await fetchProvider.getUserFuelBalance(scannedRfid.trim());
            setUserBalance(balance);
            setRfid(scannedRfid.trim());
            setLitersToDispense("");
            setStep("DISPENSE_NUMPAD");
            toast.success(`Welcome, ${balance.firstName} ${balance.lastName}!`);
        } catch (err: unknown) {
            if (err instanceof LockoutError) {
                // The countdown on screen replaces the error message.
                lockFor(err.retryAfterSeconds);
                setError(null);
                return;
            }
            const msg = err instanceof Error ? err.message : "RFID card verification failed.";
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDispense = async () => {
        if (!userBalance) {
            toast.error("No active user session.");
            return;
        }

        const liters = parseFloat(litersToDispense);
        if (isNaN(liters) || liters <= 0) {
            toast.error("Please enter a valid amount of liters to dispense.");
            return;
        }

        if (liters > userBalance.remainingLiters) {
            toast.error(`Cannot dispense more than remaining balance of ${userBalance.remainingLiters.toFixed(2)} Liters.`);
            return;
        }

        setLoading(true);
        try {
            // Same card and same liters as the last attempt reuse its request ID, so a retry after a
            // timeout returns the first record instead of storing a second one.
            pendingDispense.current = requestIdFor(pendingDispense.current, userBalance.rfid, liters,
                () => crypto.randomUUID());
            const req: DispenseRequest = {
                cardNumber: userBalance.rfid,
                liters,
                requestId: pendingDispense.current.requestId,
            };

            const res = await fetchProvider.dispenseFuel(req);
            pendingDispense.current = null;

            setDispenseSuccessData({
                dispensedLiters: res.liters,
                docNo: res.docNo,
                userName: `${userBalance.firstName} ${userBalance.lastName}`,
                remainingLiters: res.remainingLiters,
            });

            setStep("SUCCESS");
            if (res.alreadyRecorded) {
                toast.info(`Already recorded. Doc No ${res.docNo}.`);
            } else {
                toast.success(`Successfully dispensed ${res.liters.toFixed(2)} L!`);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Fuel service unavailable. Do not dispense.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return {
        step,
        rfid,
        setRfid,
        userBalance,
        litersToDispense,
        setLitersToDispense,
        loading,
        error,
        dispenseSuccessData,
        lockoutSeconds,
        handleVerifyRfid,
        handleDispense,
        resetState,
    };
}
