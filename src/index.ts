import express from "express";
import { config } from "./config.js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { createUser, deleteAllUsers, getUserByEmail } from "./db/queries/users.js";
import { createChirp, getAllChirps, getChirpById } from "./db/queries/chirps.js";
import { hashPassword, checkPasswordHash, makeJWT, getBearerToken, validateJWT } from "./auth.js";
import { UserResponse, LoginResponse } from "./schema.js";

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
app.get("/api/chirps", handlerGetAllChirps);
app.get("/api/chirps/:chirpID", handlerGetChirpById);
app.post("/admin/reset", handlerReset);
app.post("/api/users", handlerCreateUser);
app.post("/api/login", handlerLogin);
app.post("/api/chirps", handlerCreateChirp);

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
    const userResponse: UserResponse = {
      id: user.id,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      email: user.email
    };

    res.status(201).json(userResponse);
  } catch (error) {
    if (error instanceof Error && error.message.includes("duplicate key")) {
      throw new BadRequestError("User with this email already exists");
    }
    throw error;
  }
}

async function handlerLogin(req: express.Request, res: express.Response) {
  const { email, password, expiresInSeconds } = req.body;

  if (!email || typeof email !== "string") {
    throw new BadRequestError("Email is required and must be a string");
  }

  if (!password || typeof password !== "string") {
    throw new BadRequestError("Password is required and must be a string");
  }

  // Validate expiresInSeconds if provided
  if (expiresInSeconds !== undefined) {
    if (typeof expiresInSeconds !== "number" || expiresInSeconds <= 0) {
      throw new BadRequestError("expiresInSeconds must be a positive number");
    }
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

    // Determine token expiration time
    let tokenExpiration: number;
    
    if (expiresInSeconds !== undefined) {
      // Cap at 1 hour (3600 seconds) if client specifies more
      tokenExpiration = Math.min(expiresInSeconds, 3600);
    } else {
      // Default to 1 hour
      tokenExpiration = 3600;
    }

    // Generate JWT token
    const token = makeJWT(user.id, tokenExpiration, config.jwtSecret);

    // Return user with token
    const loginResponse: LoginResponse = {
      id: user.id,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      email: user.email,
      token: token
    };

    res.status(200).json(loginResponse);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
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

async function handlerGetAllChirps(req: express.Request, res: express.Response) {
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
  } catch (error) {
    throw error;
  }
}

async function handlerGetChirpById(req: express.Request, res: express.Response) {
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
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw error;
  }
}

async function handlerCreateChirp(req: express.Request, res: express.Response) {
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
  } catch (error) {
    if (error instanceof Error && error.message.includes("foreign key")) {
      throw new BadRequestError("User not found");
    }
    if (error instanceof Error && (error.message.includes("Authorization header") || error.message.includes("Invalid token") || error.message.includes("expired"))) {
      throw new UnauthorizedError("Invalid or missing authentication token");
    }
    throw error;
  }
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
