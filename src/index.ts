import express from "express";
import { config } from "./config.js";

const app = express();
const PORT = 8080;

// Static middleware to serve files and images
app.use("/app", middlewareMetricsInc, express.static("./src/app"));
// JSON body parser for API endpoints
app.use(express.json());

// log response middleware
app.use(middlewareLogResponses)

app.get("/api/healthz", handlerReadiness);
app.get("/admin/metrics", handlerAdminMetrics);
app.post("/admin/reset", handlerReset);
app.post("/api/validate_chirp", handlerValidateChirp);

function handlerReadiness(req: express.Request, res: express.Response) {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send("OK");
}

function handlerMetrics(req: express.Request, res: express.Response) {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send(`Hits: ${config.fileserverHits}`);
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

function handlerReset(req: express.Request, res: express.Response) {
  config.fileserverHits = 0;
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send("Reset successful");
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
  try {
    const body = (req.body ?? {}).body;

    if (typeof body !== "string") {
      return res.status(400).json({ error: "Invalid request: body must be a string" });
    }

    if (body.length > 140) {
      return res.status(400).json({ error: "Chirp is too long" });
    }

    const bannedWords = ["kerfuffle", "sharbert", "fornax"];

    const cleanedBody = body
      .split(" ")
      .map((token) => (bannedWords.includes(token.toLowerCase()) ? "****" : token))
      .join(" ");

    return res.status(200).json({ cleanedBody });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
