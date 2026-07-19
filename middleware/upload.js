const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const uploadDir = path.join(__dirname,"..", "uploads");
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const randomName = crypto.randomBytes(16).toString("hex") + path.extname(file.originalname);
        cb(null, randomName);
    }
});

const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",

    "video/mp4",
    "video/webm",

    "audio/mpeg",
    "audio/wav",
    "audio/ogg",

    "application/pdf",

    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024   // 50 MB
    },

    fileFilter: (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Unsupported file type."));
        }
    }
});

module.exports = upload;