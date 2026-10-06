import { HanvinAttendanceModule } from "@/modules/kiosk-management/hanvin-attendance/HanvinAttendanceModule";

export default function HanvinAttendancePage() {
    const url = process.env.HANVIN_ATTENDANCE_URL;
    const fallbackUrl = process.env.HANVIN_ATTENDANCE_URL_VPN;

    return (
        <HanvinAttendanceModule url={url} fallbackUrl={fallbackUrl} />
    );
}