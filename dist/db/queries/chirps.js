import { db } from "../index.js";
import { chirps } from "../../schema.js";
import { asc } from "drizzle-orm";
export async function createChirp(chirp) {
    const [result] = await db.insert(chirps).values(chirp).returning();
    return result;
}
export async function getAllChirps() {
    const result = await db.select().from(chirps).orderBy(asc(chirps.createdAt));
    return result;
}
