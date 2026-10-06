"use client";

import React from "react";
import { useDispenser } from "./hooks/useDispenser";
import { RFIDScannerInput } from "./components/RFIDScannerInput";
import { UserBalanceCard } from "./components/UserBalanceCard";
import { FuelNumpad } from "./components/FuelNumpad";
import { DispenserReceiptModal } from "./components/DispenserReceiptModal";

export function DispenserModule() {
    const {
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
    } = useDispenser();

    return (
        <div className="w-full max-w-[1400px] mx-auto h-[100dvh] max-h-[100dvh] flex flex-col justify-center p-2 sm:p-4 md:p-6 overflow-hidden select-none">
            {/* Step 1: RFID Scanner / Input View */}
            {step === "RFID_INPUT" && (
                <div className="flex-1 flex flex-col justify-center items-center min-h-0 py-2">
                    <RFIDScannerInput
                        rfid={rfid}
                        onRfidChange={setRfid}
                        onSubmit={handleVerifyRfid}
                        loading={loading}
                        error={error}
                    />
                </div>
            )}

            {/* Step 2: User Balance & Numpad View (Fully responsive 2-column layout) */}
            {step === "DISPENSE_NUMPAD" && userBalance && (
                <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 items-stretch overflow-hidden">
                    {/* Driver Profile & Balance Information */}
                    <div className="h-full min-h-0 flex flex-col">
                        <UserBalanceCard userBalance={userBalance} />
                    </div>

                    {/* Interactive Touch Numpad */}
                    <div className="h-full min-h-0 flex flex-col">
                        <FuelNumpad
                            value={litersToDispense}
                            onChange={setLitersToDispense}
                            maxLiters={userBalance.remainingLiters}
                            onSubmit={handleDispense}
                            loading={loading}
                            onBack={resetState}
                        />
                    </div>
                </div>
            )}

            {/* Success Receipt Modal */}
            <DispenserReceiptModal
                open={step === "SUCCESS"}
                data={dispenseSuccessData}
                onClose={resetState}
            />
        </div>
    );
}

export default DispenserModule;
