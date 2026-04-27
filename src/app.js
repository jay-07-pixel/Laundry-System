import express from "express";
import cors from "cors";
import routes from "./routes/index.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/", routes);
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});
app.use((err, _req, res, _next) => {
  const status = err.statusCode ?? 500;
  res.status(status).json({ error: err.message || "Internal server error" });
});

export default app;
