import { db } from "@/lib/db";
import { authorizeUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: auth.id },
            include: {
                bookings: {
                    where: { status: "ACTIVE" },
                    include: {
                        modifications: true
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const activeBooking = user.bookings[0] || null;

        return NextResponse.json({
            user: {
                name: user.name,
                phone: user.phone,
                address: user.address,
                landmark: user.landmark,
                area: user.area,
            },
            booking: activeBooking
        });

    } catch (error) {
        console.error("Fetch user booking error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { type } = body;

        if (!type || !["RECURRING", "ONE_TIME"].includes(type)) {
            return NextResponse.json({ error: "Invalid booking type" }, { status: 400 });
        }

        const user = await db.user.findUnique({
            where: { id: auth.id },
            include: {
                bookings: {
                    where: { status: "ACTIVE" },
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            }
        });

        if (!user || user.bookings.length === 0) {
            return NextResponse.json({ error: "Active booking not found" }, { status: 404 });
        }

        const updatedBooking = await db.booking.update({
            where: { id: user.bookings[0].id },
            data: { type }
        });

        return NextResponse.json({
            success: true,
            booking: updatedBooking
        });

    } catch (error) {
        console.error("Update booking type error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
