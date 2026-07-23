import { db } from "../index.js";
import { refreshTokens, users } from "../schema.js";
import { and, eq, gt, isNull } from "drizzle-orm";


export async function createRefreshToken(token: string, userId: string) {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const expireDate = new Date(Date.now() + thirtyDays)

    const [result] = await db
        .insert(refreshTokens)
        .values({
            token: token,
            userId: userId,
            expiresAt: expireDate,
            revokedAt: null
        })
        .returning({ expiresAt: refreshTokens.expiresAt })

    return result
}

export async function getUserByRefreshToken(token: string) {

    const [user] = await db
        .select({user: users})
        .from(refreshTokens)
        .innerJoin(users, eq(users.id, refreshTokens.userId))
        .where(and(
            eq(refreshTokens.token, token),
            isNull(refreshTokens.revokedAt),
            gt(refreshTokens.expiresAt, new Date())
        ))

    return user?.user
}

export async function revokeRefreshToken(token: string) {

    const result = await db
        .update(refreshTokens)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(eq(refreshTokens.token, token))
        .returning()

    return result.length > 0
}