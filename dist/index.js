import express from "express";
import { config } from "./config.js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { createUser, deleteAllUsers, getUserByEmail, updateUserCredentials, upgradeUserToChirpyRed } from "./db/queries/users.js";
import { createChirp, getAllChirps, getChirpById, deleteChirpById } from "./db/queries/chirps.js";
import { hashPassword, checkPasswordHash, makeJWT, getBearerToken, validateJWT, makeRefreshToken, getAPIKey } from "./auth.js";
import { createRefreshToken, getUserFromRefreshToken, revokeRefreshToken } from "./db/queries/refreshTokens.js";
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
app.get("/api/chirps", handlerGetAllChirps);
app.get("/api/chirps/:chirpID", handlerGetChirpById);
app.post("/admin/reset", handlerReset);
app.post("/api/users", handlerCreateUser);
app.post("/api/login", handlerLogin);
app.post("/api/chirps", handlerCreateChirp);
app.post("/api/refresh", handlerRefreshAccessToken);
app.post("/api/revoke", handlerRevokeRefreshToken);
app.put("/api/users", handlerUpdateUser);
app.delete("/api/chirps/:chirpID", handlerDeleteChirp);
app.post("/api/polka/webhooks", handlerPolkaWebhook);
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
async function handlerReset(req, res) {
    // Check if platform is dev - if not, return 403 Forbidden
    if (config.platform !== "dev") {
        throw new ForbiddenError("This endpoint is only available in development environment");
    }
    // Delete all users from the database
    await deleteAllUsers();
    config.fileserverHits = 0;
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send("Reset successful");
}
async function handlerCreateUser(req, res) {
    const { email, password } = req.body;
    if (!email || typeof email !== "string") {
        throw new BadRequestError("Email is required and must be a string");
    }
    if (!password || typeof password !== "string") {
        throw new BadRequestError("Password is required and must be a string");
    }
    try {
        // Hash the password before storing
        const hashedPassword = await hashPassword(password);
        const user = await createUser({
            email,
            hashed_password: hashedPassword
        });
        if (!user) {
            throw new BadRequestError("User with this email already exists");
        }
        // Return user without the hashed password
        const userResponse = {
            id: user.id,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            email: user.email,
            isChirpyRed: user.is_chirpy_red
        };
        res.status(201).json(userResponse);
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("duplicate key")) {
            throw new BadRequestError("User with this email already exists");
        }
        throw error;
    }
}
async function handlerLogin(req, res) {
    const { email, password } = req.body;
    if (!email || typeof email !== "string") {
        throw new BadRequestError("Email is required and must be a string");
    }
    if (!password || typeof password !== "string") {
        throw new BadRequestError("Password is required and must be a string");
    }
    try {
        // Look up user by email
        const user = await getUserByEmail(email);
        if (!user) {
            throw new UnauthorizedError("Incorrect email or password");
        }
        // Check if password matches the stored hash
        const passwordMatches = await checkPasswordHash(password, user.hashed_password);
        if (!passwordMatches) {
            throw new UnauthorizedError("Incorrect email or password");
        }
        // Access tokens expire in 1 hour
        const token = makeJWT(user.id, 3600, config.jwtSecret);
        // Create a refresh token that expires in 60 days
        const refreshToken = makeRefreshToken();
        const sixtyDaysInMs = 60 * 24 * 60 * 60 * 1000;
        await createRefreshToken({
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + sixtyDaysInMs),
        });
        // Return user with token
        const loginResponse = {
            id: user.id,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            email: user.email,
            isChirpyRed: user.is_chirpy_red,
            token: token,
            refreshToken: refreshToken
        };
        res.status(200).json(loginResponse);
    }
    catch (error) {
        if (error instanceof UnauthorizedError) {
            throw error;
        }
        throw error;
    }
}
async function handlerRefreshAccessToken(req, res) {
    try {
        const tokenString = getBearerToken(req);
        const user = await getUserFromRefreshToken(tokenString);
        if (!user) {
            throw new UnauthorizedError("Invalid or expired refresh token");
        }
        const accessToken = makeJWT(user.id, 3600, config.jwtSecret);
        res.status(200).json({ token: accessToken });
    }
    catch (error) {
        if (error instanceof Error && (error.message.includes("Authorization header") || error.message.includes("refresh token"))) {
            throw new UnauthorizedError("Invalid or missing refresh token");
        }
        if (error instanceof UnauthorizedError)
            throw error;
        throw error;
    }
}
async function handlerRevokeRefreshToken(req, res) {
    try {
        const tokenString = getBearerToken(req);
        const record = await revokeRefreshToken(tokenString);
        if (!record) {
            throw new UnauthorizedError("Invalid refresh token");
        }
        res.status(204).send();
    }
    catch (error) {
        if (error instanceof UnauthorizedError)
            throw error;
        if (error instanceof Error && error.message.includes("Authorization header")) {
            throw new UnauthorizedError("Invalid or missing refresh token");
        }
        throw error;
    }
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
async function handlerGetAllChirps(req, res) {
    try {
        const chirps = await getAllChirps();
        const formattedChirps = chirps.map(chirp => ({
            id: chirp.id,
            createdAt: chirp.createdAt,
            updatedAt: chirp.updatedAt,
            body: chirp.body,
            userId: chirp.userId,
        }));
        res.status(200).json(formattedChirps);
    }
    catch (error) {
        throw error;
    }
}
async function handlerGetChirpById(req, res) {
    const { chirpID } = req.params;
    try {
        const chirp = await getChirpById(chirpID);
        if (!chirp) {
            throw new NotFoundError("Chirp not found");
        }
        res.status(200).json({
            id: chirp.id,
            createdAt: chirp.createdAt,
            updatedAt: chirp.updatedAt,
            body: chirp.body,
            userId: chirp.userId,
        });
    }
    catch (error) {
        if (error instanceof NotFoundError) {
            throw error;
        }
        throw error;
    }
}
async function handlerCreateChirp(req, res) {
    const { body } = req.body;
    // Validate request payload
    if (typeof body !== "string") {
        throw new BadRequestError("Body is required and must be a string");
    }
    // Validate chirp length
    if (body.length > 140) {
        throw new BadRequestError("Chirp is too long. Max length is 140");
    }
    // Check for banned words
    const bannedWords = ["kerfuffle", "sharbert", "fornax"];
    const hasBannedWord = body
        .split(" ")
        .some((token) => bannedWords.includes(token.toLowerCase()));
    if (hasBannedWord) {
        throw new BadRequestError("Chirp contains banned words");
    }
    try {
        // Extract and validate JWT token
        const token = getBearerToken(req);
        const userId = validateJWT(token, config.jwtSecret);
        const chirp = await createChirp({
            body,
            userId,
        });
        res.status(201).json({
            id: chirp.id,
            createdAt: chirp.createdAt,
            updatedAt: chirp.updatedAt,
            body: chirp.body,
            userId: chirp.userId,
        });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("foreign key")) {
            throw new BadRequestError("User not found");
        }
        if (error instanceof Error && (error.message.includes("Authorization header") || error.message.includes("Invalid token") || error.message.includes("expired"))) {
            throw new UnauthorizedError("Invalid or missing authentication token");
        }
        throw error;
    }
}
async function handlerDeleteChirp(req, res) {
    const { chirpID } = req.params;
    try {
        const token = getBearerToken(req);
        const userId = validateJWT(token, config.jwtSecret);
        const chirp = await getChirpById(chirpID);
        if (!chirp) {
            throw new NotFoundError("Chirp not found");
        }
        if (chirp.userId !== userId) {
            throw new ForbiddenError("You are not allowed to delete this chirp");
        }
        const deleted = await deleteChirpById(chirpID);
        if (!deleted) {
            throw new NotFoundError("Chirp not found");
        }
        res.status(204).send();
    }
    catch (error) {
        if (error instanceof Error &&
            (error.message.includes("Authorization header") ||
                error.message.includes("Invalid token") ||
                error.message.includes("expired"))) {
            throw new UnauthorizedError("Invalid or missing authentication token");
        }
        if (error instanceof ForbiddenError)
            throw error;
        if (error instanceof NotFoundError)
            throw error;
        throw error;
    }
}
async function handlerUpdateUser(req, res) {
    const { email, password } = req.body;
    if (!email || typeof email !== "string") {
        throw new BadRequestError("Email is required and must be a string");
    }
    if (!password || typeof password !== "string") {
        throw new BadRequestError("Password is required and must be a string");
    }
    try {
        const token = getBearerToken(req);
        const userId = validateJWT(token, config.jwtSecret);
        const hashed = await hashPassword(password);
        const updated = await updateUserCredentials(userId, email, hashed);
        if (!updated) {
            throw new NotFoundError("User not found");
        }
        const response = {
            id: updated.id,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
            email: updated.email,
            isChirpyRed: updated.is_chirpy_red,
        };
        res.status(200).json(response);
    }
    catch (error) {
        if (error instanceof Error &&
            (error.message.includes("Authorization header") ||
                error.message.includes("Invalid token") ||
                error.message.includes("expired"))) {
            throw new UnauthorizedError("Invalid or missing authentication token");
        }
        if (error instanceof NotFoundError)
            throw error;
        if (error instanceof Error && error.message.includes("duplicate key")) {
            throw new BadRequestError("User with this email already exists");
        }
        throw error;
    }
}
async function handlerPolkaWebhook(req, res) {
    const { event, data } = req.body || {};
    // verify api key first
    try {
        const key = getAPIKey(req);
        if (key !== config.polkaKey) {
            throw new UnauthorizedError("Invalid API key");
        }
    }
    catch (e) {
        throw new UnauthorizedError("Invalid or missing API key");
    }
    if (event !== "user.upgraded") {
        return res.status(204).send();
    }
    const userId = data?.userId;
    if (!userId || typeof userId !== "string") {
        throw new BadRequestError("Invalid webhook payload");
    }
    const updated = await upgradeUserToChirpyRed(userId);
    if (!updated) {
        throw new NotFoundError("User not found");
    }
    return res.status(204).send();
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
