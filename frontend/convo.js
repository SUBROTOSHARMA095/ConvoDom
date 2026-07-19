const main = document.querySelector('#main');
const inboxContainer = document.querySelector('#inbox');
const search = document.querySelector('#search');
const result_box = document.querySelector('#search_results');
const Socket = io();
Socket.on("connect", () => {
    console.log("Connected to socket:", Socket.id);
});
const inbox = [];
const roomParticipants = {};
const convoUI = {};
let currentUser = {};
let currentRoomId;
let previousDate = null;

const chatHeads = document.querySelector("#chats_head");
const menuBtn = chatHeads.querySelector(".menu-btn");

menuBtn.addEventListener("click", (e) => {
    const existing = chatHeads.querySelector("#menu");
    if (existing) {
        existing.remove();
        return;
    }
    const menu = document.createElement("div");
    menu.id = "menu";
    menu.innerHTML = `
        <div class="menu-item" id="logout-btn">Logout</div>
    `;

    chatHeads.appendChild(menu);
    menu.querySelector("#logout-btn").addEventListener("click", async () => {
        const res = await fetch("/logout", {
            method: "POST"
        });
        const data = await res.json();

        if (data.success) {
            Socket.disconnect();
            window.location.href = "/";
        }
    });
    if (menu && !menu.contains(e.target) && !menuBtn.contains(e.target)) {
        menu.remove();
    }
});

import { renderText } from "/render/rendertext.js";
import { renderImage } from "/render/renderimage.js";
import { renderVideo } from "/render/rendervideo.js";
import { renderAudio } from "/render/renderaudio.js";
import { renderDocuments } from "/render/renderdocuments.js";

async function loadInbox(){
  const response = await fetch("/getConvos");
  const info = await response.json();
  return info;
}

function formatFileSize(bytes) {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
      return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function timeInHoursMins(time){
    const hours = String(time.getHours()).padStart(2,'0');
    const min = String(time.getMinutes()).padStart(2,'0');
    return `${hours}:${min}`;
}

function createConvos(
  roomId,
  roomType,
  participants,
  lastMsg,
  lastMsgTime,
  unreadCount,
  others
){
  let roomName;
  let timestamp = "";
  if (lastMsgTime){
    const time = new Date(lastMsgTime);
    timestamp = timeInHoursMins(time);
  }
  
  if (roomType.toLowerCase() === "private" || roomType.toLowerCase() === "temp"){
    if (participants[0]===currentUser.userId){
      const contact = others.find(u => u.userId === participants[1]);
      roomName = contact ? contact.userName : "unknown user"; //private messaging
    }else{
      const contact = others.find(u => u.userId === participants[0]);
      roomName = contact ? contact.userName : "unknown user";
    }
  }else if (roomType.toLowerCase() === "self"){
    roomName = currentUser.userName+"(You)";  //self messaging
  }else{
    roomName = roomType;
  }
  inbox.push({title: roomName, roomId: roomId});

  roomParticipants[roomId] = participants;

  const div = document.createElement('div');
  div.className = 'chats';

  div.innerHTML = `
      <img class="profile_pic" src="profile_pic.jpg">
      <div class="info">
          <div class="top">
              <h3 class="name">${roomName}</h3>
              <span class="time">${timestamp}</span>
          </div>
          <div class="bottom">
              <span class="msg">${lastMsg || ""}</span>
          </div>
      </div>
  `;

  div.addEventListener('click', () => {
    openRoom({title: roomName, roomId: roomId});
  });
  inboxContainer.appendChild(div);

  const badge = document.createElement("div");
  badge.className = "unreadBadge";
  badge.textContent = unreadCount;
  if (unreadCount === 0) {
      badge.style.display = "none";
  }
  div.appendChild(badge);
  const msgElement = div.querySelector(".msg");
  const timeElement = div.querySelector(".time");
  convoUI[roomId] = {div, msgElement, timeElement, badge};
}

// Load inbox only for users with chat history
async function init(){
  try{
    const inboxData = await loadInbox();
    currentUser = {userName: inboxData.me.userName, userId: inboxData.me.userId};
    inboxData.convos.forEach(ele => createConvos(
      ele.roomId,
      ele.roomName,
      ele.participants,
      ele.lastMsg,
      ele.lastMsgTime,
      inboxData.unreadCount[ele.roomId],
      inboxData.others
    ));

    const roomIds = inbox.map(room => room.roomId);
    console.log("Sending joinRooms:",roomIds);
    Socket.emit("joinRooms",roomIds); 
  }catch (err){
    console.log(err);
  }
}
init();

// create messaging Room
async function openRoom(data) {
  previousDate = null;
  const oldBox = document.querySelector('#chat_box');
  if (oldBox){
    oldBox.remove();      
    await fetch("/deleteRoom", {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({
          roomId: currentRoomId
      })
    });
  }
  const chat_box = document.createElement('div');
  chat_box.id = 'chat_box';
  chat_box.innerHTML = `
    <div id="head_chat">
      <img id="profile_pic_2" src="profile_pic.jpg">
      <h3 id="name_2">${data.title}</h3>
    </div>
    <div id="chat_body">
      <div class="message-container"></div>
    </div>
    <div id="footer">
      <button id="add-file-btn">+</button>
      <input id="type-box" placeholder="Type message...">
      <button id="send-btn">Send</button>
    </div>
  `;
  main.appendChild(chat_box);

  //sending Messages
  const send = document.querySelector('#send-btn');
  const typedMsg = document.querySelector("#type-box");

  function sendMessage() {
      const msg = typedMsg.value.trim();
      console.log("sending message:",{roomId: currentRoomId});

      if (!msg) return;
      Socket.emit("sendMessage", {
          roomId: currentRoomId,
          content: msg
      });
      typedMsg.value = "";
  }

  //sending files

  const filePicker = document.createElement("input");
  filePicker.type = "file";
  filePicker.id = "filePicker";
  filePicker.multiple = true;
  filePicker.hidden = true;

  chat_box.appendChild(filePicker);

  const addFileBtn = document.querySelector("#add-file-btn");
  const picker = document.querySelector("#filePicker");
  addFileBtn.addEventListener('click', () => {

    const existing = document.querySelector("#file-options");

    if (existing) {
        existing.remove();
        return;
    }

    const fileOptions = document.createElement("div");
    fileOptions.innerHTML = `
      <div class=option>files & documents</div>
      <div class=option>photos & videos</div>
      <div class=option>audio</div>
    `;
    fileOptions.id = "file-options";
    chat_box.appendChild(fileOptions);

    const options = fileOptions.querySelectorAll(".option");

    options[0].addEventListener("click", () => {
        picker.accept = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt";
        picker.value = "";
        fileOptions.remove();
        picker.click();
    });

    options[1].addEventListener("click", () => {
        picker.accept = "image/*,video/*";
        picker.value = "";
        fileOptions.remove();
        picker.click();
    });

    options[2].addEventListener("click", () => {
        picker.accept = "audio/*";
        picker.value = "";
        fileOptions.remove();
        picker.click();
    });
  });
  picker.addEventListener("change", () => {
      const file = [...picker.files];
      if (file.length>0){
        openPreview(file);
      }
  });

  function openPreview(files){
    const overlay = document.createElement("div");
    overlay.id = "overlay";

    const preview = document.createElement("div");
    preview.id = "preview";

    const navigation = document.createElement("div");
    navigation.id = "preview-navigation";

    navigation.innerHTML = `
        <button id="prev-btn">◀</button>
        <span id="indicator"></span>
        <button id="next-btn">▶</button>
    `;

    const footer = document.createElement("div");
    footer.id = "footer";
    footer.innerHTML = `
    <div id="footer">
      <p id="fileSize"></p>
      <input id="type-box" placeholder="add message...">
      <button id="overlay_cancel-btn">Cancel</button>
      <button id="overlay_send-btn">Send</button>
    </div>`

    let currentIndex = 0;
    let currentUrl = null;

    function renderPreview(){
      preview.innerHTML = "";
      if (currentUrl){
        URL.revokeObjectURL(currentUrl);
      }

      const file = files[currentIndex];

      footer.querySelector("#fileSize").textContent = formatFileSize(file.size);

      currentUrl = URL.createObjectURL(file);

      switch (file.type.split('/')[0]){      
        case "image":
          const img = document.createElement("img");
          img.src = currentUrl;
          preview.appendChild(img);
          break;
        case "video":
          const video = document.createElement("video");
          video.src = currentUrl;
          video.controls = true;
          preview.appendChild(video);
          break;
        case "audio":
          const audio = document.createElement("audio");
          audio.src = currentUrl;
          audio.controls = true;
          preview.appendChild(audio);
          break;
        case "application":
          switch(file.type){
            case "application/pdf":
              const pdf = document.createElement("iframe");
              pdf.src = currentUrl;
              preview.appendChild(pdf);
              break;
            default:
              const card = document.createElement("div");
              card.className = "document-preview";

              card.innerHTML = `
                  <h3>📄 ${file.name}</h3>
                  <p>${formatFileSize(file.size)}</p>
              `;

              preview.appendChild(card);
          }
          break;
        default:
          alert("unknown file type");
          return;
      }
      indicator.textContent = `${currentIndex + 1}/ ${files.length}`;

      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex === files.length - 1;
    }

    
    const prevBtn = navigation.querySelector("#prev-btn");
    const nextBtn = navigation.querySelector("#next-btn");
    const indicator = navigation.querySelector("#indicator");

    
    prevBtn.addEventListener("click", () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderPreview();
        }
    });

    nextBtn.addEventListener("click", () => {
        if (currentIndex < files.length - 1) {
            currentIndex++;
            renderPreview();
        }
    });

    overlay.appendChild(preview);
    overlay.appendChild(navigation);
    overlay.appendChild(footer);
    document.querySelector("#chat_box").appendChild(overlay);

    renderPreview();

    const previewSend = document.querySelector('#overlay_send-btn');
    const previewCancel = document.querySelector('#overlay_cancel-btn');
    const captionBox = footer.querySelector("#type-box");

    previewSend.addEventListener("click", async () => {
        const caption = captionBox.value.trim();

        for (const file of files) {
            await uploadFile(file, caption);
        }

        if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
        }

        overlay.remove();
    });

    captionBox.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault(); // prevents newline
          const caption = captionBox.value.trim();

          await uploadFile(file, caption);

          URL.revokeObjectURL(currentUrl);
          overlay.remove();
      }
    });

    previewCancel.addEventListener("click", () => {
      URL.revokeObjectURL(currentUrl);
      overlay.remove();
    });
    
  }

  typedMsg.addEventListener("paste", (e) => {
    const content = e.clipboardData.items[0];
    if (content && content.kind === "file"){
      e.preventDefault();
      const file = content.getAsFile();
      openPreview(file);
    }
  });
  //---------***---------------//
  send.addEventListener("click", sendMessage);

  typedMsg.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault(); // prevents newline
          sendMessage();
      }
  });

  currentRoomId = data.roomId;
  //-------***--------//
  loadMessages(currentRoomId);

  Socket.emit("markRead", {roomId: currentRoomId});
}

//upload Files
async function uploadFile(file, caption){
  const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", caption);
    formData.append("roomId", currentRoomId);

    const response = await fetch("/upload", {
    method: "POST",
    body: formData
    });

    const data = await response.json();

}

//loading Messages
async function loadMessages(roomId){
  const response = await fetch(`/messages/${roomId}`);
  const messages = await response.json();
  
  messages.forEach(renderMessage);

  const chatBody = document.querySelector("#chat_body");
  requestAnimationFrame(() => {
    chatBody.scrollTop = chatBody.scrollHeight;
  });
}

//rendering Messages
function renderMessage(msg){
  const container = document.querySelector('.message-container');
      
  const date = new Date(msg.timestamp);
  const currentDate = date.toLocaleDateString('en-GB');
  if(currentDate !== previousDate){
      const dateHeader =
          document.createElement('div');
      dateHeader.className =
          'date-header';
      dateHeader.textContent =
          currentDate;
      container.appendChild(dateHeader);
      previousDate =
          currentDate;
  }

  const div = document.createElement("div");
    div.className =
        msg.senderId === currentUser.userId ?
        "message sent" :
        "message received";

    div.dataset.messageId = msg._id;

  const timestamp = timeInHoursMins(date);

  switch (msg.type){
    case "text":
      renderText(msg, div);
      break;
    case "image":
      renderImage(msg, div);
      break;
    case "video":
      renderVideo(msg, div)
      break;
    case "audio":
      renderAudio(msg, div);
      break;
    default:
      renderDocuments(msg, div);
  }

  const meta = document.createElement("div");
  meta.className = "message-meta";

  meta.innerHTML = `
      <span class="timestamp">${timestamp}</span>
      ${
          msg.senderId === currentUser.userId
          ? `<span class="read-status">${
              msg.readBy.length === (roomParticipants[msg.roomId]?.length || 0)
              ? "●"
              : "◌"
          }</span>`
          : ""
      }
  `;

  div.appendChild(meta);
  container.appendChild(div);
}


Socket.on("receivedMessage", (msg) => {

  if (String(msg.roomId) === String(currentRoomId)){
    renderMessage(msg);

    const chatBody = document.querySelector("#chat_body");
    chatBody.scrollTop = chatBody.scrollHeight;

    Socket.emit("markRead",{
      roomId: currentRoomId
    });
  }
  
  updateInbox(msg);
});

async function updateInbox(msg){
  let room = inbox.find(r => r.roomId === msg.roomId);
  if (!room){
    createConvos(
    msg.room.roomId,
    msg.room.roomName,
    msg.room.participants,
    msg.room.lastMsg,
    msg.room.lastMsgTime,
    0,
    msg.otherUser);

    room = inbox.find(r => r.roomId === msg.roomId);
  }
  const roomDiv = convoUI[room.roomId].div;
  inboxContainer.prepend(roomDiv);
  try{
    let preview;

    switch (msg.type){
      case "text":
        preview = msg.content;
        break;
      case "image":
        preview = "🖼️ Photo";
        break;
      case "video":
        preview = "🎥 Video";
        break;
      case "audio":
        preview = "🎵 Audio";
        break;
      default:
        preview = "📄 " + msg.file.name;
    }

    convoUI[msg.roomId].msgElement.textContent = preview;
    convoUI[msg.roomId].timeElement.textContent = timeInHoursMins(new Date(msg.timestamp));
  } catch (err) {
    console.error(err);
  }
  if (msg.senderId !== currentUser.userId){
    convoUI[msg.roomId].badge.textContent = Number(convoUI[msg.roomId].badge.textContent)+1;
    convoUI[msg.roomId].badge.style.display = 'block';
  }
}

Socket.on("messagesRead", ({roomId, messageIds}) => {
  if (roomId !== currentRoomId) return;
  convoUI[roomId].badge.textContent = 0;
  convoUI[roomId].badge.style.display = 'none';
  messageIds.forEach(id => {
    const msgDiv = document.querySelector(`[data-message-id="${id}"]`);

    if (!msgDiv) return;
    const marker = msgDiv.querySelector(".read-status");
    if (marker){
      marker.textContent = "●";
    }
  });
});


//search
search.addEventListener('input', async() => {
  const query = search.value.trim().toLowerCase();
  result_box.innerHTML = '';

  if (query === '') {
    result_box.style.display = 'none';
    return;
  }

  result_box.style.display = 'block';

  const chatsSection = document.createElement("div");
  const peopleSection = document.createElement("div");

  let hasChats = false;
  let hasPeople = false;
  const heading = document.createElement("div");
  heading.className = "search-heading";
  heading.textContent = "Chats";

  chatsSection.appendChild(heading);

  inbox.forEach(room => {

    if (room.title.toLowerCase().startsWith(query)){
      hasChats = true;
      const div = document.createElement('div');
      div.className = 'search-items conversations';
      div.innerHTML = `
        <img class="profile_pic" src="profile_pic.jpg">
        <div class="info">
          <h3 class="name">${room.title}</h3>
        </div>
      `;
      div.addEventListener('click', () => {
        openRoom(room);
        result_box.style.display = 'none';
        search.value = ''; //  Clear search input after selecting
        result_box.innerHTML = '';
      });

      chatsSection.appendChild(div);

    }
  });

  let match = await fetch("/search",{
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      value: query
    })
  });

  const users = await match.json();
  if (users.length>0) {
    hasPeople = true;

    const heading = document.createElement("div");
    heading.className = "search-heading";
    heading.textContent = "People";

    peopleSection.appendChild(heading);
  }
  users.forEach(user => {
    const div = document.createElement('div');
    div.className ='search-items others';
    div.innerHTML = `
      <img class="profile_pic" src="profile_pic.jpg">
      <div class="info">
        <h3 class="name">${user.userName}</h3>
      </div>
    `;
    div.addEventListener('click', async () => {
      const res = await fetch("/createRoom", {
          method: "POST",
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify({
              userId: user.userId
          })
      });
      const room = await res.json();
      const data = {title: room.others.userName, roomId: room.room.roomId};
      openRoom(data);
      result_box.style.display = 'none';
      search.value = ''; //  Clear search input after selecting
      result_box.innerHTML = '';
    });

    peopleSection.appendChild(div);
  });

  if (hasChats)
    result_box.appendChild(chatsSection);

  if (hasPeople)
      result_box.appendChild(peopleSection);

  if (!hasChats && !hasPeople) {
      const div = document.createElement("div");
      div.className = "no-results";
      div.innerText = "No users found";
      result_box.appendChild(div);
  }
});

