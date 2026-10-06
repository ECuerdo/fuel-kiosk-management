import { RSMAttendanceModule } from "@/modules/kiosk-management/rsm-attendance/RSMAttendanceModule";

export default function RSMAttendancePage() {
    const url = process.env.RSM_ATTENDANCE_URL;
    const fallbackUrl = process.env.RSM_ATTENDANCE_URL_VPN;

    return (
        <RSMAttendanceModule url={url} fallbackUrl={fallbackUrl} />
    );
}
