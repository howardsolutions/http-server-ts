import express from "express";
import { config } from "./config.js";
const app = express();
const PORT = 8080;
// Static middleware to serve files and images
app.use("/app", middlewareMetricsInc, express.static("./src/app"));
// log response middleware
app.use(middlewareLogResponses);
app.get("/api/healthz", handlerReadiness);
app.get("/admin/metrics", handlerAdminMetrics);
app.get("/admin/reset", handlerReset);
function handlerReadiness(req, res) {
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send("OK");
}
function handlerMetrics(req, res) {
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send(`Hits: ${config.fileserverHits}`);
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
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
