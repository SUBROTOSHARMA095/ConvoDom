export function renderAudio(msg, div){

    const audio = document.createElement("audio");

    audio.className = "message-audio";
    audio.src = msg.file.url;
    audio.controls = true;

    div.appendChild(audio);

    if(msg.content){

        const caption = document.createElement("div");
        caption.className = "message-text";
        caption.textContent = msg.content;

        div.appendChild(caption);

    }

}