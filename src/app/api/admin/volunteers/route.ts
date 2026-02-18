import { db } from "@/lib/db";
import { authorizeUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { phoneSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

/**
 * GET: List all volunteers with their details and assigned areas
 */
export async function GET(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth || auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "20");
        const cursor = searchParams.get("cursor");

        const volunteers = await db.volunteer.findMany({
            take: limit + 1,
            cursor: cursor ? { id: cursor } : undefined,
            skip: cursor ? 1 : 0,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true
                    }
                }
            },
            orderBy: { id: "asc" }
        });

        const hasNextPage = volunteers.length > limit;
        const volunteersToReturn = hasNextPage ? volunteers.slice(0, limit) : volunteers;
        const nextCursor = hasNextPage ? volunteersToReturn[volunteersToReturn.length - 1].id : null;

        // Get all areas for assignment UI (first page only)
        let areaList: string[] = [];
        if (!cursor) {
            const dbAreas = await db.area.findMany({ select: { name: true } });
            areaList = dbAreas.map(a => a.name);
        }

        // Format for UI consumption
        const formatted = volunteersToReturn.map(v => ({
            id: v.id,
            userId: v.userId,
            name: v.user.name,
            phone: v.user.phone,
            areas: v.areas,
            available: v.available,
            createdAt: v.createdAt
        }));

        return NextResponse.json({
            volunteers: formatted,
            nextCursor,
            availableAreas: areaList
        });

    } catch (error) {
        console.error("Fetch volunteers error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * POST: Add new volunteer
 * Links to existing user by phone or creates new user
 */
export async function POST(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth || auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { phone, name, areas = [], pin } = body;

        if (!phone) {
            return NextResponse.json({ error: "Phone number required" }, { status: 400 });
        }

        // Validate phone
        const phoneValidation = phoneSchema.safeParse(phone);
        if (!phoneValidation.success) {
            return NextResponse.json({ error: phoneValidation.error.issues[0].message }, { status: 400 });
        }


        // Check if user exists
        let user = await db.user.findUnique({ where: { phone } });

        if (!user) {
            if (!name) {
                return NextResponse.json({ error: "Name required for new volunteer" }, { status: 400 });
            }
            if (!pin) {
                return NextResponse.json({ error: "PIN required for new volunteer" }, { status: 400 });
            }
            const hashedPin = await bcrypt.hash(pin, 10);
            // Create new user as volunteer
            user = await db.user.create({
                data: {
                    phone,
                    name,
                    address: "",
                    landmark: "",
                    area: "",
                    pin: hashedPin,
                    role: "VOLUNTEER",
                    verified: true,
                }
            });
        } else {
            // Update existing user role to VOLUNTEER
            await db.user.update({
                where: { id: user.id },
                data: { role: "VOLUNTEER" }
            });
        }

        // Check if already a volunteer
        const existingVolunteer = await db.volunteer.findUnique({
            where: { userId: user.id }
        });

        if (existingVolunteer) {
            return NextResponse.json({ error: "User is already a volunteer" }, { status: 400 });
        }

        // Create volunteer record
        const volunteer = await db.volunteer.create({
            data: {
                userId: user.id,
                areas: areas,
                available: true,
            },
            include: {
                user: {
                    select: {
                        name: true,
                        phone: true
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: "Volunteer added successfully",
            volunteer: {
                id: volunteer.id,
                name: volunteer.user.name,
                phone: volunteer.user.phone,
                areas: volunteer.areas,
                available: volunteer.available
            }
        });

    } catch (error) {
        console.error("Add volunteer error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * PATCH: Update volunteer (areas, availability)
 */
export async function PATCH(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth || auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { volunteerId, action, areas, available, areaName } = body;

        if (!volunteerId) {
            return NextResponse.json({ error: "Volunteer ID required" }, { status: 400 });
        }

        const volunteer = await db.volunteer.findUnique({
            where: { id: volunteerId }
        });

        if (!volunteer) {
            return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });
        }

        switch (action) {
            case "setAreas":
                // Set all areas at once
                await db.volunteer.update({
                    where: { id: volunteerId },
                    data: { areas: areas || [] }
                });
                break;

            case "assign":
                // Add single area
                if (!areaName) {
                    return NextResponse.json({ error: "Area name required" }, { status: 400 });
                }
                const newAreas = [...volunteer.areas];
                if (!newAreas.includes(areaName)) {
                    newAreas.push(areaName);
                }
                await db.volunteer.update({
                    where: { id: volunteerId },
                    data: { areas: newAreas }
                });
                break;

            case "unassign":
                // Remove single area
                if (!areaName) {
                    return NextResponse.json({ error: "Area name required" }, { status: 400 });
                }
                await db.volunteer.update({
                    where: { id: volunteerId },
                    data: { areas: volunteer.areas.filter(a => a !== areaName) }
                });
                break;

            case "toggleAvailability":
                await db.volunteer.update({
                    where: { id: volunteerId },
                    data: { available: available ?? !volunteer.available }
                });
                break;

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: "Volunteer updated successfully" });

    } catch (error) {
        console.error("Update volunteer error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * DELETE: Remove volunteer (keeps user, just removes volunteer role)
 */
export async function DELETE(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth || auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const volunteerId = searchParams.get("volunteerId");

        if (!volunteerId) {
            return NextResponse.json({ error: "Volunteer ID required" }, { status: 400 });
        }

        const volunteer = await db.volunteer.findUnique({
            where: { id: volunteerId },
            include: { user: true }
        });

        if (!volunteer) {
            return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });
        }

        // Delete volunteer record
        await db.volunteer.delete({ where: { id: volunteerId } });

        // Revert user role to USER
        await db.user.update({
            where: { id: volunteer.userId },
            data: { role: "USER" }
        });

        return NextResponse.json({ success: true, message: "Volunteer removed successfully" });

    } catch (error) {
        console.error("Delete volunteer error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
