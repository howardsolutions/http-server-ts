import { db } from "../index.js";
import { chirps } from "../../schema.js";
import { eq } from "drizzle-orm";
export async function createChirp(chirp) {
    const [result] = await db.insert(chirps).values(chirp).returning();
    return result;
}
export async function getAllChirps(authorId, sort) {
    let result;
    if (authorId) {
        result = await db.select().from(chirps).where(eq(chirps.userId, authorId));
    }
    else {
        result = await db.select().from(chirps);
    }
    // Apply sorting in-memory as suggested
    const sortOrder = sort || 'asc';
    if (sortOrder === 'desc') {
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    else {
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return result;
}
export async function getChirpById(id) {
    const [result] = await db.select().from(chirps).where(eq(chirps.id, id));
    return result;
}
export async function deleteChirpById(id) {
    const [result] = await db.delete(chirps).where(eq(chirps.id, id)).returning();
    return result || null;
}
