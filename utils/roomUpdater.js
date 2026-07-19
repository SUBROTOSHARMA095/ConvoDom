const rooms = require('../models/rooms');

async function updateRoom(savedMessage){
    let lastMsg;
    switch (savedMessage.type){
        case "text":
            lastMsg = savedMessage.content;
            break;
        case "image":
            lastMsg = "🖼️ photo";
            break;
        case "video":
            lastMsg = "📽️ video";
            break;
        case "audio":
            lastMsg = "🎙️ audio";
            break;
        default:
            lastMsg = `📄 ${savedMessage.file.originalName}`;
            break;
    }

    await rooms.updateOne({roomId: savedMessage.roomId},
        {
            lastMsg,
            lastMsgTime: savedMessage.timestamp
        }
    );
}
module.exports = updateRoom;