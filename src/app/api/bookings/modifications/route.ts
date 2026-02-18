import { db } from "@/lib/db";
import { authorizeUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getDeliveryWindow } from "@/lib/delivery";
import { DateTime } from "luxon";

// GET: Fetch user's booking with all modifications
export async function GET(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const bookingId = searchParams.get("bookingId");

        if (!bookingId) {
            return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
        }

        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            include: {
                modifications: {
                    orderBy: { date: "asc" }
                },
                user: {
                    select: { name: true, phone: true, area: true }
                }
            }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Security check: only owner or admin can see it
        if (booking.userId !== auth.id && auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        return NextResponse.json(booking);
    } catch (error) {
        console.error("Error fetching booking:", error);
        return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
    }
}

// POST: Create or update a modification for a specific date
export async function POST(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { bookingId, date, tiffinCount, cancelled, reason } = body;

        if (!bookingId || !date) {
            return NextResponse.json({
                error: "Booking ID and date are required"
            }, { status: 400 });
        }

        // Security check: only owner or admin can modify it
        const booking = await db.booking.findUnique({ where: { id: bookingId } });
        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }
        if (booking.userId !== auth.id && auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const parsedDate = new Date(date);
        parsedDate.setHours(0, 0, 0, 0); // Normalize to start of day

        // --- DELIVERY STATUS CHECK ---
        const targetDateTime = DateTime.fromJSDate(parsedDate).setZone("Asia/Kolkata").startOf("day");
        const windowStart = targetDateTime.minus({ days: 1 }).set({ hour: 6, minute: 0, second: 0, millisecond: 0 });
        const windowEnd = targetDateTime.set({ hour: 6, minute: 0, second: 0, millisecond: 0 });

        const deliveryRecord = await db.delivery.findFirst({
            where: {
                bookingId,
                deliveredAt: {
                    gte: windowStart.toJSDate(),
                    lt: windowEnd.toJSDate()
                }
            }
        });

        if (deliveryRecord) {
            return NextResponse.json({
                error: "This tiffin has already been delivered. Modifications are no longer permitted."
            }, { status: 400 });
        }
        // ------------------------------

        // --- 2 AM CUTOFF LOGIC ---
        const nowIST = DateTime.now().setZone("Asia/Kolkata");
        const modificationDate = DateTime.fromJSDate(parsedDate).setZone("Asia/Kolkata").startOf("day");
        const cutoffTime = modificationDate.set({ hour: 2, minute: 0, second: 0, millisecond: 0 });

        // If trying to modify a delivery after its 2 AM cutoff
        if (nowIST >= cutoffTime) {
            // Only allow if it's a cancellation. Block tiffin count changes or un-cancellations.
            if (!cancelled) {
                return NextResponse.json({
                    error: "Modifications for this delivery closed at 2:00 AM on the delivery day. Only cancellations are permitted."
                }, { status: 400 });
            }
        }
        // -------------------------

        // Check if modification already exists for this date
        const existingMod = await db.bookingModification.findFirst({
            where: {
                bookingId,
                date: parsedDate
            }
        });

        let modification;
        if (existingMod) {
            // Update existing modification
            modification = await db.bookingModification.update({
                where: { id: existingMod.id },
                data: {
                    tiffinCount: tiffinCount ?? existingMod.tiffinCount,
                    cancelled: cancelled ?? existingMod.cancelled,
                    reason: reason ?? existingMod.reason
                }
            });
        } else {
            // Create new modification
            modification = await db.bookingModification.create({
                data: {
                    bookingId,
                    date: parsedDate,
                    tiffinCount,
                    cancelled: cancelled ?? false,
                    reason
                }
            });
        }

        return NextResponse.json({
            success: true,
            modification,
            message: cancelled
                ? "Delivery cancelled for this date"
                : "Booking updated for this date"
        });
    } catch (error) {
        console.error("Error modifying booking:", error);
        return NextResponse.json({ error: "Failed to modify booking" }, { status: 500 });
    }
}

// DELETE: Remove a modification (restore to default)
export async function DELETE(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const modificationId = searchParams.get("id");

        if (!modificationId) {
            return NextResponse.json({ error: "Modification ID required" }, { status: 400 });
        }

        // Security check: only owner or admin can delete it
        const modification = await db.bookingModification.findUnique({
            where: { id: modificationId },
            include: { booking: true }
        });
        if (!modification) {
            return NextResponse.json({ error: "Modification not found" }, { status: 404 });
        }
        if (modification.booking.userId !== auth.id && auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // --- DELIVERY STATUS CHECK ---
        const targetDateTime = DateTime.fromJSDate(modification.date).setZone("Asia/Kolkata").startOf("day");
        const windowStart = targetDateTime.minus({ days: 1 }).set({ hour: 6, minute: 0, second: 0, millisecond: 0 });
        const windowEnd = targetDateTime.set({ hour: 6, minute: 0, second: 0, millisecond: 0 });

        const deliveryRecord = await db.delivery.findFirst({
            where: {
                bookingId: modification.bookingId,
                deliveredAt: {
                    gte: windowStart.toJSDate(),
                    lt: windowEnd.toJSDate()
                }
            }
        });

        if (deliveryRecord) {
            return NextResponse.json({
                error: "This tiffin has already been delivered. Changes can no longer be reset."
            }, { status: 400 });
        }
        // ------------------------------

        // --- 2 AM CUTOFF LOGIC ---
        const nowIST = DateTime.now().setZone("Asia/Kolkata");
        const modificationDate = DateTime.fromJSDate(modification.date).setZone("Asia/Kolkata").startOf("day");
        const cutoffTime = modificationDate.set({ hour: 2, minute: 0, second: 0, millisecond: 0 });

        if (nowIST >= cutoffTime) {
            return NextResponse.json({
                error: "This delivery finalized at 2:00 AM. Settings can no longer be reset."
            }, { status: 400 });
        }
        // -------------------------

        await db.bookingModification.delete({
            where: { id: modificationId }
        });

        return NextResponse.json({
            success: true,
            message: "Modification removed - date restored to default"
        });
    } catch (error) {
        console.error("Error deleting modification:", error);
        return NextResponse.json({ error: "Failed to remove modification" }, { status: 500 });
    }
}
