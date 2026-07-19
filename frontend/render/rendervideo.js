import { openMediaViewer } from "./mediaviewer.js";
export function renderVideo(msg, div){

    const video = document.createElement("video");

    video.className = "message-video";
    video.src = msg.file.url;
    video.addEventListener("click", () => {
        openMediaViewer(video.src, "VIDEO");
    });
    div.appendChild(video);

    if(msg.content){

        const caption = document.createElement("div");
        caption.className = "message-text";
        caption.textContent = msg.content;

        div.appendChild(caption);

    }

}