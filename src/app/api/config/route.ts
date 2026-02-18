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

        const { targetDate, displayDate } = getDeliveryWindow();
        const now = DateTime.now().setZone("Asia/Kolkata");

        // isAfterCutoff is true if current time is past 2 AM of the target delivery date
        const cutoffTime = targetDate.set({ hour: 2, minute: 0, second: 0, millisecond: 0 });
        const isAfterCutoff = now >= cutoffTime;

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
