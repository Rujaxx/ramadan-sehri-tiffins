import { db } from "@/lib/db";
import { authorizeUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";

// GET: Fetch all recent modifications for admin view
export async function GET(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth || auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get modifications from the last 7 days (IST aligned)
        const sevenDaysAgo = DateTime.now().setZone("Asia/Kolkata").startOf("day").minus({ days: 7 }).toJSDate();

        const modifications = await db.bookingModification.findMany({
            where: {
                createdAt: {
                    gte: sevenDaysAgo
                }
            },
            include: {
                booking: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                phone: true,
                                area: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 100 // Limit to last 100 modifications
        });

        return NextResponse.json({
            modifications,
            count: modifications.length
        });
    } catch (error) {
        console.error("Error fetching modifications:", error);
        return NextResponse.json({ error: "Failed to fetch modifications" }, { status: 500 });
    }
}
