import jwt from "jsonwebtoken";
import { db } from "./db";

export const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    } catch (error) {
        return null;
    }
}

export function getUserIdFromRequest(req: Request) {
    const authHeader = req.headers.get("authorization");
    const cookieHeader = req.headers.get("cookie");

    let token: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else if (cookieHeader) {
        const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
        token = cookies['token'];
    }

    if (!token) return null;
    return verifyToken(token);
}

/**
 * Robustly authorize a user by checking the database for existence and blocked status.
 */
export async function authorizeUser(req: Request) {
    const decoded = getUserIdFromRequest(req);
    if (!decoded) return null;

    const user = await db.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true, blocked: true }
    });

    if (!user || user.blocked) return null;

    return user;
}
