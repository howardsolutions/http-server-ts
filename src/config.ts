process.loadEnvFile();

function envOrThrow(key: string): string {
    const value = process.env[key];

    if (typeof value === "undefined") {
        throw new Error(`Missing required environment variable: ${key}`);
    }

    return value;
}

type APIConfig = {
    fileserverHits: number;
    dbURL: string;
};

export const config: APIConfig = {
    fileserverHits: 0,
    dbURL: envOrThrow("DB_URL"),
};
