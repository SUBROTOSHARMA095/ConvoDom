function formatFileSize(bytes) {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
      return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
export function renderDocuments(msg, div){
    const link = document.createElement("a");

    link.className = "message-document";

    link.href = msg.file.url;
    link.target = "_blank";

    const icon = document.createElement("span");
    icon.textContent = "📄";

    const info = document.createElement("div");
    info.className = "document-info";

    const name = document.createElement("div");
    name.textContent = msg.file.name;

    const size = document.createElement("div");
    size.textContent = formatFileSize(msg.file.size);

    const type = document.createElement("div");
    type.className = "document-type";
    type.textContent = msg.file.name.split(".").pop().toUpperCase() + " Document";

    info.append(name, type, size);
    link.append(icon, info);

    div.appendChild(link);

    if(msg.content){

        const caption = document.createElement("div");
        caption.className = "message-text";
        caption.textContent = msg.content;

        div.appendChild(caption);

    }

}