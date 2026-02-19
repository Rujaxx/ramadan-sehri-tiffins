// import { db } from "@/lib/db";
import { NextResponse } from "next/server";
// import bcrypt from "bcryptjs";

// import { registrationSchema } from "@/lib/validations";
// import { RAMADAN_START_DATE, RAMADAN_END_DATE } from "@/lib/constants";
// import jwt from "jsonwebtoken";
// import { JWT_SECRET } from "@/lib/auth";
// import { getDeliveryWindow } from "@/lib/delivery";
// import { DateTime } from "luxon";

export async function POST(req: Request) {
    // Registrations are closed
    return NextResponse.json(
        { error: "Registrations are currently closed." },
        { status: 403 }
    );

    // try {
    //     const body = await req.json();

    //     // Validate with Zod
    //     const validation = registrationSchema.safeParse(body);
    //     if (!validation.success) {
    //         const errors = validation.error.issues.map((err) => err.message).join(", ");
    //         return NextResponse.json({ error: errors }, { status: 400 });
    //     }

    //     const { name, phone, alternatePhone, address, landmark, area, tiffinCount, pin, bookingType, startDate, endDate } = validation.data;

    //     // Determine booking dates
    //     const config = await db.globalConfig.findUnique({
    //         where: { id: "singleton" }
    //     });

    //     const { targetDate: serverTargetDate } = getDeliveryWindow();

    //     let bookingStartDate: Date;
    //     let bookingEndDate: Date;

    //     if (bookingType === "FULL_RAMADAN") {
    //         let startDT: DateTime;
    //         if (config?.officialStartDate) {
    //             const dateStr = typeof config.officialStartDate === "string"
    //                 ? config.officialStartDate
    //                 : (config.officialStartDate as Date).toISOString();
    //             startDT = DateTime.fromISO(dateStr.split('T')[0]).setZone("Asia/Kolkata").startOf("day");
    //         } else {
    //             startDT = DateTime.fromISO(RAMADAN_START_DATE, { zone: "Asia/Kolkata" }).startOf("day");
    //         }
    //         bookingStartDate = startDT.toJSDate();
    //         bookingEndDate = DateTime.fromISO(RAMADAN_END_DATE, { zone: "Asia/Kolkata" }).endOf("day").toJSDate();
    //     } else {
    //         bookingStartDate = new Date(startDate!);
    //         bookingEndDate = DateTime.fromISO(endDate!, { zone: "Asia/Kolkata" }).endOf("day").toJSDate();

    //         // Validation: Start date cannot be in the past (before server target date)
    //         const targetDateMidnight = serverTargetDate.startOf("day");
    //         const requestedStartMidnight = DateTime.fromISO(startDate!, { zone: "Asia/Kolkata" }).startOf("day");

    //         if (requestedStartMidnight < targetDateMidnight) {
    //             return NextResponse.json({
    //                 error: `Start date cannot be earlier than ${targetDateMidnight.toFormat("LLL d")}`
    //             }, { status: 400 });
    //         }
    //     }

    //     // Check if user exists
    //     const existingUser = await db.user.findUnique({
    //         where: { phone },
    //     });

    //     if (existingUser) {
    //         return NextResponse.json({ error: "Phone number already registered" }, { status: 400 });
    //     }

    //     // Hash PIN
    //     const hashedPin = await bcrypt.hash(pin, 10);

    //     // Create user and initial booking in a transaction
    //     const result = await db.$transaction(async (tx: any) => {
    //         const user = await tx.user.create({
    //             data: {
    //                 name,
    //                 phone,
    //                 alternatePhone: alternatePhone || null,
    //                 address,
    //                 landmark,
    //                 area,
    //                 pin: hashedPin,
    //                 role: "USER",
    //             },
    //         });

    //         const booking = await tx.booking.create({
    //             data: {
    //                 userId: user.id,
    //                 tiffinCount,
    //                 startDate: bookingStartDate,
    //                 endDate: bookingEndDate,
    //                 type: bookingType === "FULL_RAMADAN" ? "RECURRING" : "ONE_TIME",
    //                 status: "ACTIVE",
    //             },
    //         });

    //         return { user, booking };
    //     });

    //     const token = jwt.sign(
    //         { userId: result.user.id, role: result.user.role },
    //         JWT_SECRET,
    //         { expiresIn: '30d' }
    //     );

    //     const response = NextResponse.json({
    //         success: true,
    //         token,
    //         user: {
    //             id: result.user.id,
    //             name: result.user.name,
    //             role: result.user.role,
    //         },
    //         message: "Registration and booking successful"
    //     });

    //     // Set HttpOnly cookie for proxy and better security
    //     response.cookies.set("token", token, {
    //         httpOnly: true,
    //         secure: process.env.NODE_ENV === "production",
    //         sameSite: "lax",
    //         maxAge: 60 * 60 * 24 * 30, // 30 days
    //         path: "/",
    //     });

    //     return response;

    // } catch (error) {
    //     console.error("Registration error:", error);
    //     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    // }
}
