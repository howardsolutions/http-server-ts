process.loadEnvFile();
function envOrThrow(key) {
    const value = process.env[key];
    if (typeof value === "undefined") {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
const migrationConfig = {
    migrationsFolder: "./src/migrations",
};
export const config = {
    fileserverHits: 0,
    db: {
        url: envOrThrow("DB_URL"),
        migrationConfig,
    },
    platform: process.env.PLATFORM || "prod",
};
