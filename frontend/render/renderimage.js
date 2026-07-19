import { openMediaViewer } from "./mediaviewer.js";
export function renderImage(msg, div){
    const img = document.createElement("img");
    img.className = "message-image";
    img.src = msg.file.url;
    img.alt = msg.file.name;
    img.addEventListener("click", () => {
        openMediaViewer(img.src, "IMG");
    });
    div.appendChild(img);

    if(msg.content){

        const caption = document.createElement("div");
        caption.className = "message-text";
        caption.textContent = msg.content;

        div.appendChild(caption);

    }

}