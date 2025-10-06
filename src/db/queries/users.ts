import { db } from "../index.js";
import { NewUser, users } from "../../schema.js";
import { eq } from "drizzle-orm";

export async function createUser(user: NewUser) {
    const [result] = await db.insert(users).values(user).onConflictDoNothing().returning();

    return result;
}

export async function getUserByEmail(email: string) {
    const [result] = await db.select().from(users).where(eq(users.email, email));
    return result || null;
}

export async function deleteAllUsers() {
    const result = await db.delete(users);
    return result;
}

export async function updateUserCredentials(userId: string, email: string, hashedPassword: string) {
    const [result] = await db
        .update(users)
        .set({ email, hashed_password: hashedPassword })
        .where(eq(users.id, userId))
        .returning();

    return result || null;
}