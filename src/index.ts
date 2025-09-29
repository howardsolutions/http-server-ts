import express from "express";
import { config } from "./config.js";

const app = express();
const PORT = 8080;

// Static middleware to serve files and images
app.use("/app", middlewareMetricsInc, express.static("./src/app"));

// log response middleware
app.use(middlewareLogResponses)

app.get("/healthz", handlerReadiness);
app.get("/metrics", handlerMetrics);
app.get("/reset", handlerReset);

function handlerReadiness(req: express.Request, res: express.Response) {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send("OK");
}

function handlerMetrics(req: express.Request, res: express.Response) {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send(`Hits: ${config.fileserverHits}`);
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

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
