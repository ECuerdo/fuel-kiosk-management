import { Men2AttendanceModule } from "@/modules/kiosk-management/men2-attendance/Men2AttendanceModule";

export default function Men2AttendancePage() {
    const url = process.env.MEN2_ATTENDANCE_URL;
    const fallbackUrl = process.env.MEN2_ATTENDANCE_URL_VPN;

    return (
        <Men2AttendanceModule url={url} fallbackUrl={fallbackUrl} />
    );
}