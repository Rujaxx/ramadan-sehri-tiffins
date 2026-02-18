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

        const limit = parseInt(searchParams.get("limit") || "20");
        const cursor = searchParams.get("cursor");

        const users = await db.user.findMany({
            take: limit + 1,
            cursor: cursor ? { id: cursor } : undefined,
            skip: cursor ? 1 : 0,
            where: {
                role: "USER",
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { phone: { contains: query, mode: "insensitive" } },
                    { address: { contains: query, mode: "insensitive" } },
                    { area: { contains: query, mode: "insensitive" } },
                    { landmark: { contains: query, mode: "insensitive" } }
                ]
            },
            include: {
                bookings: {
                    where: { status: "ACTIVE" }
                }
            },
            orderBy: [{ createdAt: "desc" }, { id: "asc" }]
        });

        const hasNextPage = users.length > limit;
        const usersToReturn = hasNextPage ? users.slice(0, limit) : users;
        const nextCursor = hasNextPage ? usersToReturn[usersToReturn.length - 1].id : null;

        return NextResponse.json({ users: usersToReturn, nextCursor });
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

export async function DELETE(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth || auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Check if user exists and has any deliveries
        const user = await db.user.findUnique({
            where: { id: userId },
            include: {
                bookings: {
                    include: {
                        deliveries: true
                    }
                },
                volunteer: {
                    include: {
                        deliveries: true
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check for recipient history
        const recipientDeliveries = user.bookings.reduce((acc, booking) => acc + booking.deliveries.length, 0);
        // Check for volunteer history
        const volunteerDeliveries = user.volunteer?.deliveries.length || 0;

        if (recipientDeliveries > 0 || volunteerDeliveries > 0) {
            return NextResponse.json({
                error: "Cannot delete user with delivery history (as recipient or volunteer). Please 'Block' them instead to preserve records."
            }, { status: 400 });
        }

        // Safe to delete: Perform cascading delete manually in a transaction
        await db.$transaction(async (tx) => {
            // 1. Delete modifications for all bookings of this user
            await tx.bookingModification.deleteMany({
                where: { booking: { userId: userId } }
            });

            // 2. Delete all bookings
            await tx.booking.deleteMany({
                where: { userId: userId }
            });

            // 3. Delete volunteer profile if exists
            if (user.volunteer) {
                await tx.volunteer.delete({
                    where: { userId: userId }
                });
            }

            // 4. Finally delete the user
            await tx.user.delete({
                where: { id: userId }
            });
        });

        return NextResponse.json({ success: true, message: "User and associated data permanently deleted" });
    } catch (error) {
        console.error("Delete user error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
