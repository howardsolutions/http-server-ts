import express from "express";

const app = express();
const PORT = 8080;

app.use("/app", express.static("./src/app"));

app.get("/healthz", handlerReadiness);

function handlerReadiness(req: express.Request, res: express.Response) {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send("OK");
}

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
