import express from "express";

const app = express();
const PORT = 8080;

// Static middleware to serve files and images
app.use("/app", express.static("./src/app"));

// log response middleware
app.use(middlewareLogResponses)

app.get("/healthz", handlerReadiness);

function handlerReadiness(req: express.Request, res: express.Response) {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send("OK");
}

// middleware fns

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
