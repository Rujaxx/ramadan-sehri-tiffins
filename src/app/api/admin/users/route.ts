import { db } from "@/lib/db";
import { authorizeUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { phoneSchema, alternatePhoneSchema } from "@/lib/validations";

export async function GET(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth || auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("query") || "";

        const users = await db.user.findMany({
            where: {
                role: "USER",
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { phone: { contains: query, mode: "insensitive" } }
                ]
            },
            include: {
                bookings: {
                    where: { status: "ACTIVE" }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error("Fetch users error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth || auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            userId,
            blocked,
            verified,
            tiffinCount,
            name,
            phone,
            alternatePhone,
            address,
            landmark,
            area,
            pin
        } = body;

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Validate phone if provided
        if (phone) {
            const phoneValidation = phoneSchema.safeParse(phone);
            if (!phoneValidation.success) {
                return NextResponse.json({ error: phoneValidation.error.issues[0].message }, { status: 400 });
            }
        }

        // Validate alternate phone if provided
        if (alternatePhone) {
            const altPhoneValidation = alternatePhoneSchema.safeParse(alternatePhone);
            if (!altPhoneValidation.success) {
                return NextResponse.json({ error: altPhoneValidation.error.issues[0].message }, { status: 400 });
            }
        }


        const updateData: any = {};
        if (blocked !== undefined) updateData.blocked = blocked;
        if (verified !== undefined) updateData.verified = verified;
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (alternatePhone !== undefined) updateData.alternatePhone = alternatePhone;
        if (address !== undefined) updateData.address = address;
        if (landmark !== undefined) updateData.landmark = landmark;
        if (area !== undefined) updateData.area = area;

        // Only update PIN if it's a non-empty string
        if (pin && typeof pin === "string" && pin.trim().length > 0) {
            // Validate PIN format (4 digits numeric)
            if (!/^\d{4}$/.test(pin)) {
                return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
            }
            updateData.pin = await bcrypt.hash(pin, 10);
        }

        if (Object.keys(updateData).length > 0) {
            await db.user.update({
                where: { id: userId },
                data: updateData
            });
        }

        // Update tiffin count if provided
        if (tiffinCount !== undefined) {
            const activeBooking = await db.booking.findFirst({
                where: { userId: userId, status: "ACTIVE" }
            });

            if (activeBooking) {
                await db.booking.update({
                    where: { id: activeBooking.id },
                    data: { tiffinCount: parseInt(tiffinCount) }
                });
            }
        }

        return NextResponse.json({ success: true, message: "User updated successfully" });
    } catch (error) {
        console.error("Update user error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
