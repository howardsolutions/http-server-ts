import { db } from "../index.js";
import { users } from "../../schema.js";
export async function createUser(user) {
    const [result] = await db.insert(users).values(user).onConflictDoNothing().returning();
    return result;
}
export async function deleteAllUsers() {
    const result = await db.delete(users);
    return result;
}
