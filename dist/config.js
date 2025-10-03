process.loadEnvFile();
function envOrThrow(key) {
    const value = process.env[key];
    if (typeof value === "undefined") {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
export const config = {
    fileserverHits: 0,
    dbURL: envOrThrow("DB_URL"),
};
