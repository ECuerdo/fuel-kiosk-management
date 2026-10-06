"use client";

import * as React from "react";
import { RFIDScanner } from "./components/RFIDScanner";
import { AlertList } from "./components/AlertList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function AssetAlertModule() {
    const router = useRouter();
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);

    const handleAlertCreated = () => {
        // Increment refresh trigger to update alert list
        setRefreshTrigger((prev) => prev + 1);
    };

    const handleBack = () => {
        router.push("/kiosk-management");
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-400 mx-auto space-y-6 p-4 md:p-6 lg:p-8 animate-in fade-in duration-700">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tight uppercase">
                            Asset Perimeter Alert System
                        </h1>
                        <p className="text-muted-foreground">
                            Monitor and track assets attempting to leave premises
                        </p>
                    </div>

                    <Button 
                        variant="outline" 
                        onClick={handleBack}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* RFID Scanner - Takes 1 column */}
                    <div className="xl:col-span-1">
                        <RFIDScanner 
                            onAlertCreated={handleAlertCreated}
                            scannerGateId="GATE-001"
                            scannerLocationName="Main Gate"
                        />
                    </div>

                    {/* Alert List - Takes 2 columns */}
                    <div className="xl:col-span-2">
                        <AlertList refreshTrigger={refreshTrigger} />
                    </div>
                </div>
               
            </div>
        </div>
    );
}