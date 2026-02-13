import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { registrationSchema } from "@/lib/validations";
import { RAMADAN_START_DATE, RAMADAN_END_DATE } from "@/lib/constants";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Validate with Zod
        const validation = registrationSchema.safeParse(body);
        if (!validation.success) {
            const errors = validation.error.issues.map((err) => err.message).join(", ");
            return NextResponse.json({ error: errors }, { status: 400 });
        }

        const { name, phone, alternatePhone, address, landmark, area, tiffinCount, pin, bookingType, startDate, endDate } = validation.data;

        // Determine booking dates
        const config = await db.globalConfig.findUnique({
            where: { id: "singleton" }
        });

        const EFFECTIVE_START_DATE = config?.officialStartDate || new Date(RAMADAN_START_DATE);

        let bookingStartDate: Date;
        let bookingEndDate: Date;

        if (bookingType === "FULL_RAMADAN") {
            bookingStartDate = new Date(EFFECTIVE_START_DATE);
            bookingEndDate = new Date(RAMADAN_END_DATE);
        } else {
            bookingStartDate = new Date(startDate!);
            bookingEndDate = new Date(endDate!);
        }

        // Check if user exists
        const existingUser = await db.user.findUnique({
            where: { phone },
        });

        if (existingUser) {
            return NextResponse.json({ error: "Phone number already registered" }, { status: 400 });
        }

        // Hash PIN
        const hashedPin = await bcrypt.hash(pin, 10);

        // Create user and initial booking in a transaction
        const result = await db.$transaction(async (tx: any) => {
            const user = await tx.user.create({
                data: {
                    name,
                    phone,
                    alternatePhone: alternatePhone || null,
                    address,
                    landmark,
                    area,
                    pin: hashedPin,
                    role: "USER",
                },
            });

            const booking = await tx.booking.create({
                data: {
                    userId: user.id,
                    tiffinCount,
                    startDate: bookingStartDate,
                    endDate: bookingEndDate,
                    type: bookingType === "FULL_RAMADAN" ? "RECURRING" : "ONE_TIME",
                    status: "ACTIVE",
                },
            });

            return { user, booking };
        });

        const token = jwt.sign(
            { userId: result.user.id, role: result.user.role },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        const response = NextResponse.json({
            success: true,
            token,
            user: {
                id: result.user.id,
                name: result.user.name,
                role: result.user.role,
            },
            message: "Registration and booking successful"
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
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
