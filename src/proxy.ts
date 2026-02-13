import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");

export async function proxy(request: NextRequest) {
    const token = request.cookies.get("token")?.value;
    const { pathname } = request.nextUrl;

    const isApiRoute = pathname.startsWith("/api");
    const isProtectedPath =
        pathname.startsWith("/admin") ||
        pathname.startsWith("/volunteer") ||
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/api/admin") ||
        pathname.startsWith("/api/volunteer") ||
        pathname.startsWith("/api/user");

    if (isProtectedPath) {
        if (!token) {
            if (isApiRoute) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            return NextResponse.redirect(new URL("/login", request.url));
        }

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);

            // Check role-based access
            if ((pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) && payload.role !== "ADMIN") {
                if (isApiRoute) {
                    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
                }
                return NextResponse.redirect(new URL("/", request.url));
            }

            if ((pathname.startsWith("/volunteer") || pathname.startsWith("/api/volunteer")) &&
                payload.role !== "VOLUNTEER" && payload.role !== "ADMIN") {
                if (isApiRoute) {
                    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
                }
                return NextResponse.redirect(new URL("/", request.url));
            }
        } catch (error) {
            // Invalid token
            if (isApiRoute) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            const response = NextResponse.redirect(new URL("/login", request.url));
            response.cookies.delete("token");
            return response;
        }
    }

    // Redirect logged-in users away from login/register/home
    if (token && (pathname === "/" || pathname === "/login" || pathname === "/register")) {
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            if (payload.role === "ADMIN") return NextResponse.redirect(new URL("/admin", request.url));
            if (payload.role === "VOLUNTEER") return NextResponse.redirect(new URL("/volunteer", request.url));
            return NextResponse.redirect(new URL("/dashboard", request.url));
        } catch (e) {
            // Ignore invalid tokens
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/volunteer/:path*",
        "/dashboard/:path*",
        "/api/admin/:path*",
        "/api/volunteer/:path*",
        "/api/user/:path*",
        "/login",
        "/register",
    ],
};
