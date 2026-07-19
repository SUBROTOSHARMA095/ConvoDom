const mongoose = require("mongoose");
const roomSchema = new mongoose.Schema({
    roomId: Number,
    roomName: String,
    participants: [Number],
    lastMsg: String,
    lastMsgTime: Date
});

module.exports = mongoose.model("Room", roomSchema);