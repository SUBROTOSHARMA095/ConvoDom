console.log("Server starting..."); 
require("dotenv").config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");

const connectRelationalDB = require('./mysql');
const connectMongoDB = require('./mongo');
const messages = require('./models/messages');
const rooms = require('./models/rooms');
connectMongoDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24         //in ms ie.1sec*1min*1hour*1day=1day
    }
});

app.use(sessionMiddleware);
app.use(express.json());
app.use(express.static('frontend'));

const uploadRoutes = require("./routes/upload");
const updateRoom = require("./utils/roomUpdater");
const getUserName = require("./utils/getUserName");
const search = require("./routes/search");
const createRoom = require("./routes/createRoom");
const deleteRoom = require("./routes/deleteRoom");

app.post("/login", (req,res) =>{
    const {userName, password} = req.body;
    const sql = "Select * from users where userName = ?";
    connectRelationalDB.query(sql, [userName], async (err, results)=>{
        if(err){
            return res.json({success:  false});
        }
        if(results.length === 0){
            return res.json({success: false, message: "User not found"});
        }
        const user = results[0];

        const match = await bcrypt.compare(password, user.u_password);
        if (match){ 
            req.session.userId = user.userId;
            req.session.userName=user.userName;
            return res.json({success: true});
        }

        return res.json({success: false, message:"Incorrect Credentials"});
    });
});

app.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({
                success: false
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            success: true
        });
    });
});

function requireAuth(req, res, next) {

    if (!req.session.userId) {
        return res.redirect("/");
    }

    next();
}

app.get("/",(req,res) =>{
    if (req.session.userId){
        return res.redirect("/convo");
    }
    res.sendFile(__dirname + "/frontend/home.html");
});

app.post("/register", async (req, res) => {
    try{
        const { username, password } = req.body;
        if(!username || !password){
            return res.status(400).json({
                message: "Username and password are required."
            });
        }

        connectRelationalDB.query("SELECT userId FROM users WHERE userName = ?", [username], async (err, existing) => {
            if (err){
                console.error(err);
                return res.json({success: false, message: 'Database error'});
            }
            if(existing.length > 0){
                return res.status(409).json({
                    success: false,
                    message: "Username already exists."
                });
            }

            const hashedPassword = await bcrypt.hash(password, 12);
            
            connectRelationalDB.query("INSERT INTO users(userName, u_password) VALUES(?, ?)", [username, hashedPassword], async (err, result) => {
                if (err){
                    console.error(err);
                    return res.json({success: false, message: "registration failed"});
                }

                const userId = result.insertId;

                const lastRoom = await rooms.findOne().sort({ roomId: -1 });
                const roomId = lastRoom ? lastRoom.roomId + 1 : 1;
                await rooms.create({
                    roomId,
                    roomName: "self",
                    participants: [userId],
                    lastMsg: "",
                    lastMsgTime: null
                });

                res.status(201).json({
                    success: true,
                    message: "Account created successfully."
                });
                
            });
        
        });
    }
    catch(err){
        console.error(err);
        res.status(500).json({
            message: "Internal Server Error."
        });
    }
});

app.get("/convo", requireAuth, (req, res) => {

    res.sendFile(__dirname + "/frontend/convo.html");

});

app.get("/session", (req, res) => {
    res.json(req.session);
});

app.get("/getConvos", requireAuth, async (req,res) => {
    try{
    const userid = req.session.userId;
    const unreadCount ={};    
    const convos = await rooms.find({participants: userid}).sort({lastMsgTime: -1});
    const others = new Set();
    for (const i of convos){
        for (const j of i.participants){
            if (j !== userid){
                    others.add(j);
            }
        }
        const count = await messages.countDocuments({
            roomId: i.roomId,
            senderId: {$ne: userid},
            readBy: {$ne: userid}
        });
        unreadCount[i.roomId] = count;
    }
    res.json({convos, me: {userName: req.session.userName, userId: userid}, others: await getUserName([...others]), unreadCount});
    }catch(err){
        console.error(err);
        res.status(500).json({error:"Failed to load conversations"});
    }
});

app.get("/messages/:roomId",async (req,res) => {
    try{
        const roomId = req.params.roomId;
        const msgs = await messages.find({roomId: roomId}).sort({timestamp: 1});
        const clientMessages = msgs.map(msg => ({
            _id: msg._id,
            roomId: msg.roomId,
            senderId: msg.senderId,
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp,
            readBy: msg.readBy,

            file: msg.file
                ? {
                    name: msg.file.originalName,
                    url: `/files/${msg._id}`
                }
                : null
        }));

        res.json(clientMessages);
    }catch(err){
        console.log(err);
        res.status(500).json({
            error: "Failed to load messages"
        });
    }
});

/*-----------------------------------
search route*/
app.use("/search", search);

/*-----------------------------------
files sending and uploading route*/
app.use("/upload",uploadRoutes(io));
//-----------------------------------//

app.use("/createRoom",createRoom);

app.use("/deleteRoom", deleteRoom);

app.get("/files/:id", async (req, res) => {
    const message = await messages.findById(req.params.id);

    if (!message) {
        return res.sendStatus(404);
    }
    const filePath = path.join(__dirname, message.file.objectKey);

    res.sendFile(filePath);
});

io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

io.on('connection', (socket) => {
    console.log("User connected:", socket.request.session.userId);
    const userId = socket.request.session.userId;

    socket.join(`user:${userId}`);

    socket.on("joinRooms",(roomIds)=>{
        roomIds.forEach(roomId => {
            socket.join(roomId.toString());
        });
    });
    
    socket.on("sendMessage", async (data) => {
        const message ={
            roomId: data.roomId,
            senderId: socket.request.session.userId,
            type: data.type,
            content: data.content,
            timestamp: new Date(),
            readBy: [socket.request.session.userId]
        };

        const savedMessage = await messages.create(message);

        if ((await rooms.findOne({ roomId: data.roomId }))?.roomName === "temp") {
            await rooms.updateOne(
                { roomId: data.roomId },
                { $set: { roomName: "private" } }
            );
        }

        await updateRoom(savedMessage);

        const room = await rooms.findOne({ roomId: data.roomId });

        const receiver = room.participants.find(id => id !== socket.request.session.userId);

        const otherUser = await getUserName([receiver]);

        room.participants.forEach(id => {
            io.to(`user:${id}`).emit("receivedMessage", {
                ...savedMessage.toObject(),
                room,
                otherUser
            });
        });
    });

    socket.on("markRead", async ({roomId}) => {

        const userId = socket.request.session.userId;

        const unreadMessages = await messages.find({
            roomId: roomId,
            senderId: {$ne: userId},
            readBy: {$ne: userId}
        });

        const messageIds = unreadMessages.map(msg => msg._id.toString());

        await messages.updateMany({
            roomId: roomId,
            senderId: {$ne: userId},
            readBy: {$ne: userId}
        },
        {
            $addToSet: {readBy: userId}
        });

        io.to(roomId.toString()).emit(
            "messagesRead",
            {
                roomId,
                messageIds
            }
        );
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.request.session.userId);
    });
});

const PORT = process.env.PORT;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
