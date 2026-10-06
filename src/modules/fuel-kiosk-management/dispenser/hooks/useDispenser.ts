import { useState, useCallback } from "react";
import { UserFuelBalance, DispenseRequest, DispenserStep } from "../types";
import { fetchProvider } from "../providers/fetchProvider";
import { toast } from "sonner";

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

    const resetState = useCallback(() => {
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
            const req: DispenseRequest = {
                userId: userBalance.userId,
                docNo: userBalance.docNo,
                liter: liters,
                rfid: userBalance.rfid,
                createdBy: userBalance.userId,
            };

            const res = await fetchProvider.dispenseFuel(req);

            const generatedDocNo = res.record?.doc_no || res.docNo || userBalance.docNo;
            const updatedRemaining = Math.max(0, userBalance.remainingLiters - liters);

            setDispenseSuccessData({
                dispensedLiters: liters,
                docNo: generatedDocNo,
                userName: `${userBalance.firstName} ${userBalance.lastName}`,
                remainingLiters: updatedRemaining,
            });

            setStep("SUCCESS");
            toast.success(`Successfully dispensed ${liters.toFixed(2)} L!`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to record fuel dispensing.";
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
        handleVerifyRfid,
        handleDispense,
        resetState,
    };
}
