import { VitalAttendanceModule } from "@/modules/kiosk-management/vital-attendance/VitalAttendanceModule";

export default function VitalAttendancePage() {
    const url = process.env.VITAL_ATTENDANCE_URL;
    const fallbackUrl = process.env.VITAL_ATTENDANCE_URL_VPN;

    return (
        <VitalAttendanceModule url={url} fallbackUrl={fallbackUrl} />
    );
}