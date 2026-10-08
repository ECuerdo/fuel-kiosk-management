import { IdleTimeoutHandler } from "@/modules/fuel-kiosk-management/fullscreen/IdleTimeoutHandler";
import { KioskLogoutButton } from "@/modules/fuel-kiosk-management/fullscreen/KioskLogoutButton";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-dvh bg-background text-foreground">
            <IdleTimeoutHandler />
            <KioskLogoutButton />
            <main className="min-h-[calc(100dvh-64px)]">{children}</main>
        </div>
    )
}
