import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import { requireAuth } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

// 50MB cap keeps this demo-safe. Raise it (and consider streaming to S3
// instead of local disk) for anything beyond local dev.
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

router.post("/", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.status(201).json({
    fileName: req.file.originalname,
    size: req.file.size,
    url: `/uploads/${req.file.filename}`,
  });
});

export default router;
