import { db } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";

/**
 * GET: Analytics data — actual tiffins delivered (from Delivery records), volunteer stats, user consumption
 * Everything is cumulative "until now".
 */
export async function GET(req: Request) {
    try {
        const decoded = getUserIdFromRequest(req);
        if (!decoded || decoded.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Fetch ALL delivery records with their booking + user + modifications + volunteer
        const deliveries = await db.delivery.findMany({
            include: {
                booking: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                area: true,
                            }
                        },
                        modifications: true,
                    }
                },
                volunteer: {
                    include: {
                        user: { select: { name: true, phone: true } }
                    }
                }
            },
            orderBy: { deliveredAt: "asc" }
        });

        // 2. Resolve tiffinCount for each delivery
        let grandTotal = 0;
        const dailyMap: Record<string, { tiffins: number; cancellations: number; label: string }> = {};
        const volunteerMap: Record<string, {
            id: string;
            name: string;
            phone: string;
            areas: string[];
            tiffinsDelivered: number;
            available: boolean;
        }> = {};
        const userMap: Record<string, {
            name: string;
            phone: string;
            area: string;
            totalTiffins: number;
            activeDays: Set<string>;
        }> = {};

        deliveries.forEach(delivery => {
            const booking = delivery.booking;
            const deliveredAt = delivery.deliveredAt
                ? DateTime.fromJSDate(delivery.deliveredAt).setZone("Asia/Kolkata")
                : DateTime.fromJSDate(delivery.createdAt).setZone("Asia/Kolkata");

            const deliveryDateKey = deliveredAt.toFormat("yyyy-MM-dd");
            const deliveryDateStart = deliveredAt.startOf("day");

            // Find matching modification for the delivery date
            const mod = booking.modifications.find(m => {
                const modDate = DateTime.fromJSDate(m.date).setZone("Asia/Kolkata").startOf("day");
                return modDate.equals(deliveryDateStart);
            });

            // Resolve tiffin count
            let tiffinCount: number;
            if (mod) {
                if (mod.cancelled) {
                    tiffinCount = 0; // Shouldn't happen, but handle gracefully
                } else {
                    tiffinCount = mod.tiffinCount ?? booking.tiffinCount;
                }
            } else {
                tiffinCount = booking.tiffinCount;
            }

            grandTotal += tiffinCount;

            // Daily breakdown
            if (!dailyMap[deliveryDateKey]) {
                dailyMap[deliveryDateKey] = {
                    tiffins: 0,
                    cancellations: 0,
                    label: deliveredAt.toFormat("d LLL"),
                };
            }
            dailyMap[deliveryDateKey].tiffins += tiffinCount;

            // Volunteer stats
            if (delivery.volunteer) {
                const volId = delivery.volunteer.id;
                if (!volunteerMap[volId]) {
                    volunteerMap[volId] = {
                        id: volId,
                        name: delivery.volunteer.user.name,
                        phone: delivery.volunteer.user.phone,
                        areas: delivery.volunteer.areas,
                        tiffinsDelivered: 0,
                        available: delivery.volunteer.available,
                    };
                }
                volunteerMap[volId].tiffinsDelivered += tiffinCount;
            }

            // User consumption
            const userId = booking.user.id;
            if (!userMap[userId]) {
                userMap[userId] = {
                    name: booking.user.name,
                    phone: booking.user.phone,
                    area: booking.user.area,
                    totalTiffins: 0,
                    activeDays: new Set(),
                };
            }
            userMap[userId].totalTiffins += tiffinCount;
            userMap[userId].activeDays.add(deliveryDateKey);
        });

        // 3. Build sorted daily data
        const dailyData = Object.entries(dailyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => ({
                date,
                label: data.label,
                tiffins: data.tiffins,
                cancellations: data.cancellations,
            }));

        // 4. Build volunteer stats (sorted by tiffins delivered, descending)
        const volunteerStats = Object.values(volunteerMap)
            .sort((a, b) => b.tiffinsDelivered - a.tiffinsDelivered);

        // 5. Build user consumption (sorted by total tiffins, descending, top 50)
        const userConsumption = Object.values(userMap)
            .map(u => ({
                name: u.name,
                phone: u.phone,
                area: u.area,
                totalTiffins: u.totalTiffins,
                activeDays: u.activeDays.size,
            }))
            .sort((a, b) => b.totalTiffins - a.totalTiffins)
            .slice(0, 50);

        const activeDays = dailyData.length;
        const avgPerDay = activeDays > 0 ? Math.round(grandTotal / activeDays) : 0;

        return NextResponse.json({
            summary: {
                grandTotal,
                totalCancellations: 0, // Delivered items aren't cancelled
                activeDays,
                avgPerDay,
            },
            dailyData,
            volunteerStats,
            userConsumption,
        });

    } catch (error) {
        console.error("Analytics error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
