const express = require("express");
const router = express.Router();
const connectRelationalDB = require('../mysql');
const rooms = require("../models/rooms");

router.post("/", async (req,res) =>{
    const {value} = req.body;
    const currUser = req.session.userId;
    const participants = (await rooms
        .find({ participants: currUser,
            roomName: "private"
         })
        .select("participants -_id").lean())
        .map(room => room.participants);    
    const inbox = new Set();
    participants.forEach(element => {
        element.forEach(ele => {
            if (ele!==currUser)
                inbox.add(ele);
        });
    });
    inbox.add(currUser);
    const sql = "Select userId, userName from users where userName like ? and userId not in (?);"
    connectRelationalDB.query(sql, [`${value}%`, Array.from(inbox)], (err, results) =>{
        if(err){
            console.log(err);
            return res.status(500).json({ error: "Internal server error" });
        }
        return res.json(results);
    });
});

module.exports = router;