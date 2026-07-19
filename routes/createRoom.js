const express = require("express");
const router = express.Router();
const rooms = require("../models/rooms");
const getUserName = require("../utils/getUserName");

router.post("/", async (req,res) => {
    const currUserId = req.session.userId;
    const { userId: otherUserId } = req.body;
    const lastRoom = await rooms.findOne().sort({ roomId: -1 });
    const roomId = lastRoom ? lastRoom.roomId + 1 : 1;
    const room = await rooms.create({
        roomId,
        roomName: "temp",
        participants: [currUserId, otherUserId],
        lastMsg: "",
        lastMsgTime: null
    });
    const [others] = await getUserName([otherUserId]);
    return res.json({room, others});
});

module.exports = router;