import express from "express";
import { config } from "./config.js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { createUser, deleteAllUsers } from "./db/queries/users.js";

const app = express();

// Run migrations on startup
const migrationClient = postgres(config.db.url, { max: 1 });

await migrate(drizzle(migrationClient), config.db.migrationConfig);
await migrationClient.end();

const PORT = 8080;

// Custom HTTP error classes
class HttpError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

class BadRequestError extends HttpError {
  constructor(message: string) {
    super(400, message);
  }
}

class UnauthorizedError extends HttpError {
  constructor(message: string) {
    super(401, message);
  }
}

class ForbiddenError extends HttpError {
  constructor(message: string) {
    super(403, message);
  }
}

class NotFoundError extends HttpError {
  constructor(message: string) {
    super(404, message);
  }
}

// Static middleware to serve files and images
app.use("/app", middlewareMetricsInc, express.static("./src/app"));
// JSON body parser for API endpoints
app.use(express.json());

// log response middleware
app.use(middlewareLogResponses)

app.get("/api/healthz", handlerReadiness);
app.get("/admin/metrics", handlerAdminMetrics);
app.post("/admin/reset", handlerReset);
app.post("/api/users", handlerCreateUser);
app.post("/api/validate_chirp", handlerValidateChirp);

function handlerReadiness(req: express.Request, res: express.Response) {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send("OK");
}

function handlerAdminMetrics(req: express.Request, res: express.Response) {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.fileserverHits} times!</p>
  </body>
</html>`);
}

async function handlerReset(req: express.Request, res: express.Response) {
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

async function handlerCreateUser(req: express.Request, res: express.Response) {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    throw new BadRequestError("Email is required and must be a string");
  }

  try {
    const user = await createUser({ email });
    
    if (!user) {
      throw new BadRequestError("User with this email already exists");
    }

    res.status(201).json({
      id: user.id,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      email: user.email
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("duplicate key")) {
      throw new BadRequestError("User with this email already exists");
    }
    throw error;
  }
}

// middleware fns

function middlewareMetricsInc(req: express.Request, res: express.Response, next: express.NextFunction) {
  config.fileserverHits++;
  next();
}

function middlewareLogResponses(req: express.Request, res: express.Response, next: express.NextFunction) {
  res.on("finish", () => {
    const statusCode = res.statusCode;
    if (statusCode !== 200) {
      console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${statusCode}`);
    }
  });

  next()
};

function handlerValidateChirp(req: express.Request, res: express.Response) {
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
app.use(function errorHandler(
  err: unknown,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.log(err);
  res.status(500).json({ error: "Something went wrong on our end" });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
