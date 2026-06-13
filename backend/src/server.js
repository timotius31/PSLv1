import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { config } from "./config.js";
import { connectRedis } from "./redis.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { studentRoutes } from "./routes/studentRoutes.js";
import { videoRoutes } from "./routes/videoRoutes.js";

const app = express();

app.use(cors({ origin: config.frontendOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/videos", videoRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`LMS backend listening on http://localhost:${config.port}`);
});

connectRedis();
