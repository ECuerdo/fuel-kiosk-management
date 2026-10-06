"use client";

import * as React from "react";
import { ArrowLeft, RefreshCw, Wifi, Globe, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface CafeteriaAttendanceModuleProps {
    url?: string;
    fallbackUrl?: string;
}

export function CafeteriaAttendanceModule({ url, fallbackUrl }: CafeteriaAttendanceModuleProps) {
    const router = useRouter();
    const [currentUrl, setCurrentUrl] = React.useState(url || "");
    const [isLoading, setIsLoading] = React.useState(true);
    const [isVpn, setIsVpn] = React.useState(false);
    const [retryCount, setRetryCount] = React.useState(0);
    const [isServerDown, setIsServerDown] = React.useState(false);
    const [countdown, setCountdown] = React.useState(10);

    const handleBack = () => {
        router.push("/kiosk-management");
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    // Auto-refresh logic for Server Down state
    React.useEffect(() => {
        if (!isServerDown) return;

        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    handleRefresh();
                    return 10;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isServerDown]);

    // Automatic Fallback Logic
    React.useEffect(() => {
        if (!isLoading) return;

        const timer = setTimeout(() => {
            if (isLoading && !isVpn && fallbackUrl) {
                console.log("Connection timeout, switching to VPN...");
                setCurrentUrl(fallbackUrl);
                setIsVpn(true);
                setRetryCount(prev => prev + 1);
                toast.warning("Primary connection failed. Switching to VPN...", {
                    description: "Automatically trying alternative network path.",
                    duration: 5000,
                });
            } else if (isLoading && (isVpn || !fallbackUrl)) {
                setIsServerDown(true);
                toast.error("Server Connection Failed", {
                    description: "Both primary and backup paths are unreachable.",
                });
            }
        }, 5000); // 5 second timeout

        return () => clearTimeout(timer);
    }, [isLoading, isVpn, fallbackUrl]);

    const handleIframeLoad = () => {
        setIsLoading(false);
        setIsServerDown(false);
        if (isVpn) {
            toast.success("Connected via VPN", {
                description: "System interface is now ready.",
            });
        }
    };

    return (
        <div className="flex flex-col h-screen max-h-[calc(100vh-2rem)] space-y-2 animate-in fade-in duration-700">
            {/* Server Down Modal */}
            {isServerDown && (
                <div id="server-down-overlay" className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl p-4 md:p-8 animate-in zoom-in-95 duration-300">
                    <div className="max-w-md w-full p-8 rounded-[2.5rem] bg-card border border-destructive/20 shadow-[0_0_50px_-12px_rgba(220,38,38,0.3)] text-center space-y-8 relative overflow-hidden group">
                        {/* Background Pulse */}
                        <div className="absolute inset-0 bg-destructive/5 animate-pulse" />

                        <div className="relative space-y-6">
                            <div className="flex justify-center">
                                <div className="h-24 w-24 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center relative overflow-hidden">
                                    <WifiOff className="h-12 w-12 text-destructive" />
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-destructive/20 overflow-hidden">
                                        <div
                                            className="h-full bg-destructive transition-all duration-1000 ease-linear"
                                            style={{ width: `${(countdown / 10) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 text-balance">
                                <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic leading-none">
                                    Server Is Down
                                </h1>
                                <p className="text-muted-foreground font-bold tracking-tight uppercase text-xs">
                                    Please Contact Server Admin
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-muted/50 border border-border/40">
                                <p className="text-sm font-black tracking-widest uppercase text-primary animate-pulse">
                                    Auto refresh in {countdown}s
                                </p>
                            </div>

                            <Button
                                onClick={handleRefresh}
                                size="lg"
                                className="w-full rounded-2xl h-14 text-lg font-black tracking-tighter uppercase shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                <RefreshCw className="mr-2 h-5 w-5" />
                                Force Retry Now
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Cafeteria Attendance
                            </h1>
                            <Badge variant={isVpn ? "secondary" : "default"} className="gap-1 px-2 py-0 h-5 text-[10px] uppercase tracking-wider font-bold shadow-sm">
                                {isVpn ? <Globe className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                                {isVpn ? "VPN Node" : "Standard"}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                            • {isVpn ? "Tunneling via VPN" : "Local Area Network"} • {retryCount > 0 && `(Failover Active)`}
                        </p>
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-border/40 bg-background/50 backdrop-blur-sm hover:bg-muted font-semibold gap-2"
                    onClick={handleRefresh}
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Iframe Container */}
            <div className="flex-1 relative rounded-3xl border border-border/40 shadow-2xl overflow-hidden bg-muted/20 backdrop-blur-xl">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md z-10 animate-in fade-in duration-300">
                        <div className="relative">
                            <div className="h-16 w-16 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-8 w-8 rounded-full bg-primary/10 animate-pulse" />
                            </div>
                        </div>
                        <p className="mt-4 text-sm font-bold text-muted-foreground animate-pulse tracking-widest uppercase">
                            Establishing Connection...
                        </p>
                    </div>
                )}
                <iframe
                    id="cafeteria-attendance-iframe"
                    src={currentUrl}
                    className="w-full h-full border-none"
                    onLoad={handleIframeLoad}
                    title="Cafeteria Attendance System"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
            </div>
            {/* Fixed Floating Back Button */}
            <div className="fixed bottom-10 right-10 z-[60]">
                <Button
                    onClick={handleBack}
                    className="h-24 w-24 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all bg-primary hover:bg-primary/90 text-primary-foreground flex flex-col items-center justify-center gap-0 group border-4 border-background"
                >
                    <ArrowLeft className="h-10 w-10 transition-transform group-hover:-translate-x-1" strokeWidth={3} />
                    <span className="text-[10px] font-black tracking-widest uppercase mt-[-2px]">Back</span>
                </Button>
            </div>
        </div>
    );
}
