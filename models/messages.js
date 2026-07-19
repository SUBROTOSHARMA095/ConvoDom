const mongoose = require("mongoose");
const messageSchema = new mongoose.Schema({
    roomId: Number,
    senderId: Number,
    
    type: {
        type: String,
        enum: ["text", "image", "video", "audio", "file"],
        default: "text"
    },

    content: {
        type: String,
        default:""
    },

    file: {
        originalName: String,
        storedName: String,
        mime: String,
        size: Number,
        objectKey: String
    },

    timestamp: {
        type: Date,
        default: Date.now
    },

    readBy: [Number]
});
module.exports = mongoose.model("Message", messageSchema);