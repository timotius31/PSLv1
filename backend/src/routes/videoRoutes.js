import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config.js";
import { query } from "../db.js";
import { verifyAccessToken } from "../auth.js";
import { isWithinWeeklyWindow } from "../time.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "../..");

export const videoRoutes = express.Router();

videoRoutes.get("/steps/:id/video", videoAuth, async (req, res) => {
  const step = await getVideoStep(req.user.sub, req.user.role, req.params.id);
  if (!step) return res.status(403).json({ message: "Video is locked or unavailable" });

  const storageRoot = path.resolve(backendRoot, config.videoStorageRoot);
  const quality = step.video_quality || "480p";
  const safeName = path.basename(step.video_file_name || "");
  const videoPath = path.join(storageRoot, quality, safeName);

  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ message: "Video file not found", expectedPath: videoPath });
  }

  const stat = fs.statSync(videoPath);
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      "Content-Length": stat.size,
      "Content-Type": "video/mp4"
    });
    return fs.createReadStream(videoPath).pipe(res);
  }

  const [startText, endText] = range.replace("bytes=", "").split("-");
  const start = parseInt(startText, 10);
  const end = endText ? parseInt(endText, 10) : stat.size - 1;
  const chunkSize = end - start + 1;

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${stat.size}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": "video/mp4"
  });

  return fs.createReadStream(videoPath, { start, end }).pipe(res);
});

async function getVideoStep(userId, role, stepId) {
  if (role === "admin" || role === "superadmin") {
    const { rows } = await query("select * from lesson_steps where id = $1", [stepId]);
    return rows[0];
  }

  const { rows } = await query(
    `select lesson_steps.*, class_schedules.weekday, class_schedules.start_time,
            class_schedules.end_time, class_schedules.is_manually_open
     from lesson_steps
     join enrollments on enrollments.class_id = lesson_steps.class_id
     left join class_schedules on class_schedules.class_id = lesson_steps.class_id
     where lesson_steps.id = $1
       and enrollments.user_id = $2
       and enrollments.is_active = true
       and lesson_steps.step_type = 'video'`,
    [stepId, userId]
  );

  const step = rows[0];
  return step && isWithinWeeklyWindow(step) ? step : null;
}

function videoAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const headerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  const token = headerToken || req.query.token;

  if (!token) return res.status(401).json({ message: "Missing access token" });

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
