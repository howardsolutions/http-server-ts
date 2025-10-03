import type { MigrationConfig } from "drizzle-orm/migrator";

process.loadEnvFile();

function envOrThrow(key: string): string {
    const value = process.env[key];

    if (typeof value === "undefined") {
        throw new Error(`Missing required environment variable: ${key}`);
    }

    return value;
}

type DBConfig = {
    url: string;
    migrationConfig: MigrationConfig;
};

type APIConfig = {
    fileserverHits: number;
    db: DBConfig;
    platform: string;
};

const migrationConfig: MigrationConfig = {
    migrationsFolder: "./src/migrations",
};

export const config: APIConfig = {
    fileserverHits: 0,
    db: {
        url: envOrThrow("DB_URL"),
        migrationConfig,
    },
    platform: process.env.PLATFORM || "prod",
};
