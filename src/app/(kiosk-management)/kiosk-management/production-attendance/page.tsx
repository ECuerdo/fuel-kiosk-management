import { ProductionAttendanceModule } from "@/modules/kiosk-management/production-attendance/ProductionAttendanceModule";

export default function ProductionAttendancePage() {
    const url = process.env.PRODUCTION_ATTENDANCE_URL;
    const fallbackUrl = process.env.PRODUCTION_ATTENDANCE_URL_VPN;

    return (
        <ProductionAttendanceModule url={url} fallbackUrl={fallbackUrl} />
    );
}