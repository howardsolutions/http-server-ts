import express from "express";
import { config } from "./config.js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
const app = express();
// Run migrations on startup
const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);
await migrationClient.end();
const PORT = 8080;
// Custom HTTP error classes
class HttpError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
class BadRequestError extends HttpError {
    constructor(message) {
        super(400, message);
    }
}
class UnauthorizedError extends HttpError {
    constructor(message) {
        super(401, message);
    }
}
class ForbiddenError extends HttpError {
    constructor(message) {
        super(403, message);
    }
}
class NotFoundError extends HttpError {
    constructor(message) {
        super(404, message);
    }
}
// Static middleware to serve files and images
app.use("/app", middlewareMetricsInc, express.static("./src/app"));
// JSON body parser for API endpoints
app.use(express.json());
// log response middleware
app.use(middlewareLogResponses);
app.get("/api/healthz", handlerReadiness);
app.get("/admin/metrics", handlerAdminMetrics);
app.post("/admin/reset", handlerReset);
app.post("/api/validate_chirp", handlerValidateChirp);
function handlerReadiness(req, res) {
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send("OK");
}
function handlerAdminMetrics(req, res) {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(`<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.fileserverHits} times!</p>
  </body>
</html>`);
}
function handlerReset(req, res) {
    config.fileserverHits = 0;
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send("Reset successful");
}
// middleware fns
function middlewareMetricsInc(req, res, next) {
    config.fileserverHits++;
    next();
}
function middlewareLogResponses(req, res, next) {
    res.on("finish", () => {
        const statusCode = res.statusCode;
        if (statusCode !== 200) {
            console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${statusCode}`);
        }
    });
    next();
}
;
function handlerValidateChirp(req, res) {
    const body = (req.body ?? {}).body;
    if (typeof body !== "string") {
        return res.status(400).json({ error: "Invalid request: body must be a string" });
    }
    if (body.length > 140) {
        // Let the centralized error handler catch this
        throw new BadRequestError("Chirp is too long. Max length is 140");
    }
    const bannedWords = ["kerfuffle", "sharbert", "fornax"];
    const cleanedBody = body
        .split(" ")
        .map((token) => (bannedWords.includes(token.toLowerCase()) ? "****" : token))
        .join(" ");
    return res.status(200).json({ cleanedBody });
}
// centralized error-handling middleware
app.use(function errorHandler(err, req, res, next) {
    if (err instanceof HttpError) {
        return res.status(err.statusCode).json({ error: err.message });
    }
    console.log(err);
    res.status(500).json({ error: "Something went wrong on our end" });
});
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
