import { VertexAttendanceModule } from "@/modules/kiosk-management/vertex-attendance/VertexAttendanceModule";

export default function VertexAttendancePage() {
    const url = process.env.VERTEX_ATTENDANCE_URL;
    const fallbackUrl = process.env.VERTEX_ATTENDANCE_URL_VPN;

    return (
        <VertexAttendanceModule url={url} fallbackUrl={fallbackUrl} />
    );
}