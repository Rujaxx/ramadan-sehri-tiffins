import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");

export async function proxy(request: NextRequest) {
    const token = request.cookies.get("token")?.value;

    const { pathname } = request.nextUrl;

    // Protected routes
    const isProtectedPath =
        pathname.startsWith("/admin") ||
        pathname.startsWith("/volunteer") ||
        pathname.startsWith("/dashboard");

    if (isProtectedPath) {
        if (!token) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);

            // Check role-based access
            if (pathname.startsWith("/admin") && payload.role !== "ADMIN") {
                return NextResponse.redirect(new URL("/", request.url));
            }
            if (pathname.startsWith("/volunteer") && payload.role !== "VOLUNTEER" && payload.role !== "ADMIN") {
                return NextResponse.redirect(new URL("/", request.url));
            }
        } catch (error) {
            // Invalid token
            const response = NextResponse.redirect(new URL("/login", request.url));
            response.cookies.delete("token");
            return response;
        }
    }

    // Redirect logged-in users away from login/register
    if (token && (pathname === "/login" || pathname === "/register")) {
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            if (payload.role === "ADMIN") return NextResponse.redirect(new URL("/admin", request.url));
            if (payload.role === "VOLUNTEER") return NextResponse.redirect(new URL("/volunteer", request.url));
            return NextResponse.redirect(new URL("/dashboard", request.url));
        } catch (e) {
            // Ignore
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/volunteer/:path*",
        "/dashboard/:path*",
        "/login",
        "/register",
    ],
};
