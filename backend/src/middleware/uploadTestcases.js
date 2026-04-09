const fs = require("fs");
const path = require("path");
const multer = require("multer");
const ApiError = require("../utils/apiError");

const uploadsRoot = path.join(process.cwd(), "uploads", "testcases");
fs.mkdirSync(uploadsRoot, { recursive: true });

const sanitizeName = (name) =>
  String(name || "testcase")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsRoot);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".txt";
    const base = path.basename(file.originalname || "testcase", ext);
    const safeBase = sanitizeName(base);
    const stamp = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeBase}_${stamp}${ext}`);
  },
});

const allowedMimeTypes = new Set([
  "text/plain",
  "application/json",
  "application/octet-stream",
]);

const fileFilter = (req, file, cb) => {
  if (!file.mimetype || !allowedMimeTypes.has(file.mimetype)) {
    cb(new ApiError(400, "Only text/json testcase files are allowed"));
    return;
  }

  cb(null, true);
};

const uploadTestcases = multer({
  storage,
  fileFilter,
  limits: {
    files: 40,
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = {
  uploadTestcases,
};
