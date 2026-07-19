export function renderText(msg, div){

    if(msg.content){

        const caption = document.createElement("div");
        caption.className = "message-text";
        caption.textContent = msg.content;

        div.appendChild(caption);

    }

}