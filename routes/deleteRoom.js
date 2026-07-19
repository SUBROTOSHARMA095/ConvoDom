const express = require("express");
const router = express.Router();
const rooms = require("../models/rooms");

router.post("/", async (req,res) => {
    console.log("deleting room");
    const room = await rooms.findOne({roomId: req.body.roomId});
    if (room && room.roomName === "temp"){
        await rooms.deleteOne({roomId: req.body.roomId});
    }
    return res.json({success: true, message: "Deleted successfully"});
});

module.exports = router;