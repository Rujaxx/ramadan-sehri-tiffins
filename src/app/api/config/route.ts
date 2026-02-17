import { db } from "@/lib/db";
import { getDeliveryWindow } from "@/lib/delivery";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";

// GET: Fetch current global configuration (Public)
export async function GET() {
    try {
        const config = await db.globalConfig.findUnique({
            where: { id: "singleton" }
        });

        const { targetDate, displayDate } = await getDeliveryWindow();
        const now = DateTime.now().setZone("Asia/Kolkata");

        // isAfterCutoff is true if we are past 2 AM for today's delivery window
        const isAfterCutoff = now.hour >= 2;

        return NextResponse.json({
            ...(config || {
                ramadanStarted: false,
                officialStartDate: null
            }),
            targetDate: targetDate.toISO(),
            displayDate,
            isAfterCutoff
        });
    } catch (error) {
        console.error("Error fetching global config:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
