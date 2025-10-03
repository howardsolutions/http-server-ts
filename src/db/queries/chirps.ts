import { db } from "../index.js";
import { NewChirp, chirps } from "../../schema.js";
import { asc } from "drizzle-orm";

export async function createChirp(chirp: NewChirp) {
    const [result] = await db.insert(chirps).values(chirp).returning();
    return result;
}

export async function getAllChirps() {
    const result = await db.select().from(chirps).orderBy(asc(chirps.createdAt));
    return result;
}
