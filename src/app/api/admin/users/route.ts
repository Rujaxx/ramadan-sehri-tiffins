import { db } from "@/lib/db";
import { authorizeUser } from "@/lib/auth";
import { NextResponse } from "next/server";

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
        const { userId, blocked, verified, tiffinCount } = body;

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Update block status if provided
        if (blocked !== undefined) {
            await db.user.update({
                where: { id: userId },
                data: { blocked }
            });
        }

        // Update verification status if provided
        if (verified !== undefined) {
            await db.user.update({
                where: { id: userId },
                data: { verified }
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
