import { db } from "@/lib/db";
import { authorizeUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth || auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name } = await req.json();
        if (!name || name.trim().length === 0) {
            return NextResponse.json({ error: "Area name is required" }, { status: 400 });
        }

        const area = await db.area.upsert({
            where: { name: name.trim() },
            update: {},
            create: { name: name.trim(), count: 0 }
        });

        return NextResponse.json({ success: true, area });
    } catch (error) {
        console.error("Create area error:", error);
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
        const name = searchParams.get("name");

        if (!name) {
            return NextResponse.json({ error: "Area name is required" }, { status: 400 });
        }

        // Check if any users are assigned to this area
        const userCount = await db.user.count({
            where: { area: name }
        });

        if (userCount > 0) {
            return NextResponse.json({
                error: `Cannot delete area "${name}" because it has ${userCount} users assigned. Please reassign them first.`
            }, { status: 400 });
        }

        // Also check if any volunteers are assigned to this area (stored in JSON array usually)
        // In our schema Area is just a name in User, but there's a Volunteer model with areas: string[]
        const volunteers = await db.volunteer.findMany({
            where: {
                areas: {
                    has: name
                }
            }
        });

        if (volunteers.length > 0) {
            return NextResponse.json({
                error: `Cannot delete area "${name}" because it is assigned to ${volunteers.length} volunteers. Please unassign them first.`
            }, { status: 400 });
        }

        await db.area.delete({
            where: { name }
        });

        return NextResponse.json({ success: true, message: "Area deleted successfully" });
    } catch (error) {
        console.error("Delete area error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
