import { MenzaAttendanceModule } from "@/modules/kiosk-management/menza-attendance/MenzaAttendanceModule";

export default function MenzaAttendancePage() {
    const url = process.env.MENZA_ATTENDANCE_URL;
    const fallbackUrl = process.env.MENZA_ATTENDANCE_URL_VPN;

    return (
        <MenzaAttendanceModule url={url} fallbackUrl={fallbackUrl} />
    );
}
