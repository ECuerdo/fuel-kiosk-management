import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // --- 1. Global Kiosk Protection ---
    // Protect all /kiosk-management UI routes AND /api/kiosk-management API routes (except the auth itself)
    const isKioskRoute = pathname.startsWith('/kiosk-management')
    const isKioskApiRoute = pathname.startsWith('/api/kiosk-management')

    // We allow the public login page (/) and public auth API (/api/auth) to pass through without this check
    if (isKioskRoute || isKioskApiRoute) {
        const kioskToken = request.cookies.get('kiosk_token')

        if (!kioskToken) {
            // For APIs, return 401 Unauthorized
            if (isKioskApiRoute) {
                return NextResponse.json({ success: false, message: 'Unauthorized access. Missing terminal token.' }, { status: 401 })
            }

            // For UI routes, redirect back to the global login page
            const loginUrl = request.nextUrl.clone()
            loginUrl.pathname = '/'
            return NextResponse.redirect(loginUrl)
        }
    }

    // --- 2. Secondary Inbound/Outbound Module Protection ---
    // Specifically protect the inbound-outbound module using its own short-lived auth cookie
    // This stacks ON TOP of the global tracking cookie
    if (pathname.startsWith('/kiosk-management/inbound-outbound')) {
        const inboundAuthCookie = request.cookies.get('inbound_outbound_token')

        if (!inboundAuthCookie) {
            const url = request.nextUrl.clone()
            url.pathname = '/kiosk-management'
            return NextResponse.redirect(url)
        }
    }

    return NextResponse.next()
}

// Ensure middleware runs on relevant paths
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api/auth (authentication APIs need to be unprotected to login!)
         * But DO match everything else so we can cover /kiosk-management and /api/kiosk-management
         */
        '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
    ],
}
