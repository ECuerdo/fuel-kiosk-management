import { CafeteriaAttendanceModule } from "@/modules/fuel-kiosk-management/cafeteria-attendance/CafeteriaAttendanceModule";

export default function CafeteriaAttendancePage() {
    const url = process.env.CAFETERIA_ATTENDANCE_URL;
    const fallbackUrl = process.env.CAFETERIA_ATTENDANCE_URL_VPN;

    return (
        <CafeteriaAttendanceModule url={url} fallbackUrl={fallbackUrl} />
    );
}