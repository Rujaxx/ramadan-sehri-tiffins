import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@/lib/auth";
import { phoneSchema } from "@/lib/validations";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { phone, pin } = body;

        if (!phone || !pin) {
            return NextResponse.json({ error: "Phone and PIN required" }, { status: 400 });
        }

        // Validate phone format
        const phoneValidation = phoneSchema.safeParse(phone);
        if (!phoneValidation.success) {
            return NextResponse.json({ error: phoneValidation.error.issues[0].message }, { status: 400 });
        }


        const user = await db.user.findUnique({
            where: { phone },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (user.blocked) {
            return NextResponse.json({
                error: "Your account has been blocked. Please contact the administrator."
            }, { status: 403 });
        }

        const isMatch = await bcrypt.compare(pin, user.pin);

        if (!isMatch) {
            return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        const response = NextResponse.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
            }
        });

        // Set HttpOnly cookie for proxy and better security
        response.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: "/",
        });

        return response;

    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
