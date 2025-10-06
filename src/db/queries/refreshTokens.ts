import { db } from "../index.js";
import { NewRefreshToken, refreshTokens, users, type User } from "../../schema.js";
import { and, eq, isNull, gt } from "drizzle-orm";

export async function createRefreshToken(token: NewRefreshToken) {
    const [result] = await db.insert(refreshTokens).values(token).returning();
    return result;
}

export async function getRefreshTokenRecord(tokenString: string) {
    const [result] = await db
        .select()
        .from(refreshTokens)
        .where(
            and(
                eq(refreshTokens.token, tokenString),
                isNull(refreshTokens.revokedAt),
                gt(refreshTokens.expiresAt, new Date())
            )
        );
    return result || null;
}

export async function getUserFromRefreshToken(tokenString: string): Promise<User | null> {
    const [result] = await db
        .select({
            id: users.id,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
            email: users.email,
            hashed_password: users.hashed_password,
        })
        .from(refreshTokens)
        .innerJoin(users, eq(refreshTokens.userId, users.id))
        .where(
            and(
                eq(refreshTokens.token, tokenString),
                isNull(refreshTokens.revokedAt),
                gt(refreshTokens.expiresAt, new Date())
            )
        );

    return (result as unknown as User) || null;
}

/**
 * Revoke a refresh token by setting its revokedAt timestamp.
 * 
 * "Revoke" here means marking the refresh token as invalid for future use,
 * regardless of its original expiration date. This is done by setting the
 * revokedAt field to the current date/time. Any future checks for this token
 * should consider it invalid if revokedAt is not null.
 * 
 * @param tokenString - The refresh token string to revoke
 * @returns The updated refresh token record, or null if not found
 */
export async function revokeRefreshToken(tokenString: string) {
    const [result] = await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.token, tokenString))
        .returning();

    return result || null;
}

