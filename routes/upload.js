const express = require('express');
const fs = require("fs");

const messages = require('../models/messages');
const updateRoom = require("../utils/roomUpdater");
const upload = require("../middleware/upload");

function uploadRoute(io) {
    const router = express.Router();
    router.post("/", upload.single("file"), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "No file uploaded."
                });
            }

            let messageType;

            switch (req.file.mimetype.split("/")[0]) {  //multer treats file separately
                case "image":
                    messageType = "image";
                    break;
                case "video":
                    messageType = "video";
                    break;
                case "audio":
                    messageType = "audio";
                    break;
                default:
                    messageType = "file";
            }

            const message ={
                roomId: req.body.roomId,
                senderId: req.session.userId,
                type: messageType,
                content: req.body.caption,
                timestamp: new Date(),
                file: {
                    originalName: req.file.originalname,
                    storedName: req.file.filename,
                    mime: req.file.mimetype,
                    size: req.file.size,
                    objectKey: `uploads/${req.file.filename}`
                },
                readBy: [req.session.userId]
            };
            const savedMessage = await messages.create(message);

            const clientMessage = {
                _id: savedMessage._id,
                roomId: savedMessage.roomId,
                senderId: savedMessage.senderId,
                type: savedMessage.type,
                content: savedMessage.content,
                timestamp: savedMessage.timestamp,

                file: {
                    name: savedMessage.file.originalName,
                    url: `/files/${savedMessage._id}`
                },
                readBy: savedMessage.readBy
            };
        
            io.to(req.body.roomId.toString()).emit("receivedMessage",clientMessage);

            await updateRoom(savedMessage);

            res.json({
                success: true,
            });
        }catch (err) {
            if (req.file) {
                fs.unlink(req.file.path, unlinkErr => {
                    if (unlinkErr) {
                        console.error("Failed to delete uploaded file:", unlinkErr);
                    }
                });
            }

            console.error(err);

            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    });
    return router;
}

module.exports = uploadRoute;