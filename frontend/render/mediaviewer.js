export function openMediaViewer(src, tagName) {
    const mediaViewer = document.createElement("div");
    mediaViewer.id = "media-viewer-overlay";
    
    let mediaElement;
    
    if (tagName === "IMG") {
        mediaElement = document.createElement("img");
        mediaElement.src = src;
    } else if (tagName === "VIDEO") {
        mediaElement = document.createElement("video");
        mediaElement.src = src;
        mediaElement.controls = true;
        mediaElement.autoplay = true; // Auto-play when opened
    }

    const closeBtn = document.createElement("button");
    closeBtn.id = "media-viewer-close";
    closeBtn.innerHTML = "&times;";

    const contentContainer = document.createElement("div");
    contentContainer.id = "media-viewer-content";
    contentContainer.appendChild(mediaElement);

    mediaViewer.appendChild(closeBtn);
    mediaViewer.appendChild(contentContainer);

    // Tear-down function
    const closeViewer = () => {
        if (tagName === "VIDEO") {
            mediaElement.pause(); // Stop audio playback immediately when closing
        }
        mediaViewer.remove();
    };

    // Event listeners to close the viewer
    closeBtn.addEventListener("click", closeViewer);
    mediaViewer.addEventListener("click", (e) => {
        // Close if the user clicks outside the image/video boundaries
        if (e.target === mediaViewer || e.target === contentContainer) {
            closeViewer();
        }
    });

    document.querySelector("#chat_box").appendChild(mediaViewer);
}